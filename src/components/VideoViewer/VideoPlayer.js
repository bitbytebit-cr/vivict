import React, {Component} from 'react';
import Hls from 'hls.js'
import dashjs from 'dashjs';
import {isHlsPlaylist} from "../../util/HlsUtils";
import {isDashManifest} from "../../util/DashUtils";
import {pHash} from "../../util/Phash";

const zoomInMultiplier = 1.1;
const zoomOutMultiplier = 1/zoomInMultiplier;

class VideoPlayer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            zoom: 1,
            panHorizontal: 0,
            panVertical: 0
        };
        this.onTimeUpdate = this.onTimeUpdate.bind(this);
        this.onMetadataLoaded = this.onMetadataLoaded.bind(this);
        this.setVideoRef =  (videoRef) => {
            this.videoElement = videoRef;
        };
        this.fingerprint = "";
        this.fingerprint_ts = 0;
    }

    onTimeUpdate() {
        if (this.props.onTimeUpdate) {
            this.props.onTimeUpdate(this.videoElement.currentTime);
        }
    }

    onMetadataLoaded() {
        if (this.props.onDurationSet) {
            this.props.onDurationSet(this.videoElement.duration);
        }
    }

    async play() {
        return this.videoElement.play();
    }

    pause() {
        this.videoElement.pause();
    }

    quickSeek(pos) {
        this.videoElement.currentTime = pos;
    }

    zoomIn() {
        this.zoom(zoomInMultiplier);
    }

    zoomOut() {
        this.zoom(zoomOutMultiplier);
    }

    zoom(zoomFactor) {
        const newPanHorizontal = (1 - zoomFactor ) / 2 * document.documentElement.clientWidth +
            zoomFactor * this.state.panHorizontal;
        const newPanVertical = (1 - zoomFactor) / 2 * document.documentElement.clientHeight +
            zoomFactor * this.state.panVertical;
        this.setState({
            zoom: this.state.zoom * zoomFactor,
            panHorizontal: newPanHorizontal,
            panVertical: newPanVertical
        });
    }

    pan(deltaX, deltaY) {
        this.setState({
            panHorizontal: this.state.panHorizontal + deltaX,
            panVertical: this.state.panVertical + deltaY});
    }

    resetPanZoom() {
        const clientHeight = document.documentElement.clientHeight;
        const videoElementHeight = this.videoElement.offsetHeight / this.state.zoom;
        const panVertical = (clientHeight - videoElementHeight) / 2;
        this.setState({
            zoom: 1,
            panHorizontal: 0,
            panVertical: panVertical
        });
    }

    async seek(pos) {
        if (pos > this.videoElement.duration) {
            return Promise.reject(`Invalid seek position: ${pos}, media duration is ${this.videoElement.duration}`);
        }
        return new Promise((resolve, reject) => {
            this.videoElement.addEventListener('seeked', () => {
                resolve();
            }, { once: true});
            this.videoElement.currentTime = pos;
        })
    }

    // Phash calculation call-back
    calculatePhash() {
        //console.log(`AnalyzeFrame()`)
        if (this.state.playing) {
            this.analyzeFrame();
        }
        var self = this;
        // Render every 10 ms
        setTimeout(function () {
            self.calculatePhash();
          }, 10);
    };
    getFingerprint() {
        return this.fingerprint;
    }
    // Compute PHash hamming distance between left and right frames
    analyzeFrame() {
        // Acquire a video frame from the video element
        // Setup canvas for Phash analyzing
        if (this.videoElement == null) {
            return;
        }
        var width = this.videoElement.videoWidth;
        var height = this.videoElement.videoHeight;
        //console.log(`videoElement width: ${width} height: ${height}`);
        // check if we got a video frame
        if (width <= 0 || height <= 0) {
            return;
        }
        this.framebuffer = document.createElement("canvas");
        this.framebuffer.width = 32;
        this.framebuffer.height = 32;
        this.ctx = this.framebuffer.getContext("2d");
        this.ctx.drawImage(this.videoElement, 0, 0, width, height, 0, 0, this.framebuffer.width, this.framebuffer.height);
        var im = this.ctx.getImageData(0, 0, this.framebuffer.width, this.framebuffer.height);
        // calculate phash
        if (this.videoElement != null && this.fingerprint_ts != this.videoElement.currentTime) {
            this.fingerprint_ts = this.videoElement.currentTime;
            this.fingerprint = pHash(im, this.framebuffer);
        } else {
            console.log(`videoElement is null!`);
        }
    }

    async loadSource(url, variant) {
        console.log(`load source: ${url} ${variant}`);
        return new Promise((resolve, reject) => {
            this.videoElement.addEventListener('canplay',
                () => {
                    resolve();
                },
                { once: true });
            if (isHlsPlaylist(url)) {
                this.loadHls(url, variant)
            } else if (isDashManifest(url)) {
                this.loadDash(url, variant);
            } else {
                this.videoElement.src = url;
                this.videoElement.crossOrigin = "Anonymous";
                this.videoElement.addEventListener('play', this.calculatePhash());
                console.log("Setup pHash event listener");
            }
        });
    }

    setVariant(variant) {
        console.log(`setVariant: ${variant}`);
        if (this.state.dash) {
            this.state.dash.setQualityFor('video', variant);
        } else if (this.state.hls) {
            this.state.hls.currentLevel = variant;
        }
    }

    loadDash(url, variant) {
        if (this.state.hls) {
            this.state.hls.detachMedia();
            this.setState({hls: null});
        }
        let dash = this.state.dash;
        this.videoElement.addEventListener('canplay',
            () => {
                this.state.dash.setQualityFor('video', variant);
            },
            {once: true});
        if (!dash) {
            dash = dashjs.MediaPlayer().create();
            this.setState({dash});
            dash.updateSettings({
                streaming: {
                    fastSwitchEnabled: true,
                    abr: {
                        autoSwitchBitrate: {audio: false, video: false}
                    }
                }
            });
            dash.initialize(this.videoElement, url, false);
        } else {
            dash.attachSource(url);
        }
    }

    loadHls(url, variant) {
        this.setState({dash: null});
        let hls = this.state.hls;
        if (!hls) {
            hls = new Hls();
            this.setState({hls});
        }
        hls.loadSource(url);
        hls.attachMedia(this.videoElement);
        hls.currentLevel = variant;
    }

    currentTime() {
        return this.videoElement.currentTime;
    }

    componentDidMount() {
        this.videoElement.addEventListener('timeupdate', this.onTimeUpdate);
        this.videoElement.addEventListener('loadedmetadata', this.onMetadataLoaded)
    }

    componentWillUnmount() {
        this.videoElement.removeEventListener('timeupdate', this.onTimeUpdate);
        this.videoElement.removeEventListener('loadedmetadata', this.onMetadataLoaded)
    }

    render() {
        const width = parseInt(100 * this.state.zoom) + 'vw';
        return (
            <video muted={this.props.muted} ref={this.setVideoRef}
                   tabIndex="-1"
                   style={{
                       width: width,
                       left: this.state.panHorizontal + 'px',
                       top: this.state.panVertical + 'px'
                   }}
            >
            </video>
        )
    }
}

export default VideoPlayer;
