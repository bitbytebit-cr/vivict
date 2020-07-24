import {pHash, hammingDistance} from './Phash';

export function frameConverter(video, canvas) {
    // Set up our frame converter
    this.video = video;
    this.viewport = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    // Create the frame-buffer canvas
    this.framebuffer = document.createElement("canvas");
    this.framebuffer.width = this.width;
    this.framebuffer.height = this.height;
    this.ctx = this.framebuffer.getContext("2d");
    // This variable used to pass ourself to event call-backs
    var self = this;
    // Phash variable
    this.prev_hash = -1;
    // Start rendering when the video is playing
    this.video.addEventListener("play", function() {
        self.render();
      }, false);

    // Rendering call-back
    this.render = function() {
        if (this.video.paused || this.video.ended) {
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
        this.ctx.drawImage(this.video, 0, 0, this.video.videoWidth,
                    this.video.videoHeight,0,0,this.width, this.height);
        var data = this.ctx.getImageData(0, 0, this.width, this.height);
        // calculate phash
        this.hash = pHash(data)
        this.hamming = 0.0
        if (this.prev_hash != -1) {
            // calc hamming distance
            this.hamming = hammingDistance(this.prev_hash, this.hash);
            // draw phash value on frame
            this.viewport.font = "18px Georgia";
            this.viewport.fillText(this.hamming, 10, 10);
            this.viewport.putImageData(data, 0, 0);
        }
        this.prev_hash = this.hash;
    return;
    };
};
