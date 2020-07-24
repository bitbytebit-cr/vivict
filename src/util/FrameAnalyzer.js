import {pHash, hammingDistance} from './Phash';

export function frameAnalyzer(leftvideo, rightvideo) {
    // Set up our frame analyzer
    if (leftvideo == null || rightvideo == null) {
        // nothing to analyze yet
        console.log("frameAnalyzer: Left and Right video are null");
        return;
    }
    this.leftvideo = leftvideo;
    this.rightvideo = rightvideo;
    this.width = this.leftvideo.width;
    this.height = this.leftvideo.height;
    // Create the frame-buffer canvases
    this.leftframebuffer = document.createElement("canvas");
    this.leftframebuffer.width = this.width;
    this.leftframebuffer.height = this.height;
    this.leftctx = this.leftframebuffer.getContext("2d");
    this.rightframebuffer = document.createElement("canvas");
    this.rightframebuffer.width = this.width;
    this.rightframebuffer.height = this.height;
    this.rightctx = this.rightframebuffer.getContext("2d");
    // This variable used to pass ourself to event call-backs
    var self = this;
    // Start rendering when the video is playing
    this.video.addEventListener("play", function() {
        self.render();
      }, false);

    // Get the current hamming distance
    this.getHamming = function() {
        return this.hamming;
    }

    // Rendering call-back
    this.render = function() {
        if (this.leftvideo.paused || this.leftvideo.ended) {
          return;
        }
        this.renderFrame();
        var self = this;
        // Render every 10 ms
        setTimeout(function () {
            self.render();
          }, 10);
    };

    // Compute and display the next frame
    this.renderFrame = function() {
        // Acquire a video frame from the video element
        this.ctx.drawImage(this.leftvideo, 0, 0, this.leftvideo.videoWidth,
                    this.leftvideo.videoHeight,0,0,this.width, this.height);
        var leftdata = this.leftctx.getImageData(0, 0, this.width, this.height);
        this.ctx.drawImage(this.rightvideo, 0, 0, this.rightvideo.videoWidth,
                    this.rightvideo.videoHeight,0,0,this.width, this.height);
        var rightdata = this.rightctx.getImageData(0, 0, this.width, this.height);
        // calculate phash
        this.lefthash = pHash(leftdata)
        this.righthash = pHash(rightdata)
        this.hamming = 0.0
        // calc hamming distance
        this.hamming = hammingDistance(this.lefthash, this.righthash);
        // draw phash value on frame
        this.leftframebuffer.font = "18px Georgia";
        this.leftframebuffer.fillText(this.hamming, 10, 10);
        //this.leftframebuffer.putImageData(leftdata, 0, 0);
    return;
    };
};
