'use strict'

class Engine {
    constructor(canvas_container,shader_programs,images,music,sfx) {
        this.cm = new CanvasManager(canvas_container);
        if (this.cm.gl !== null) {
            this.gl = this.cm.gl;
            let countdown = 3; // The number of loaders that need to finish
            const that = this;
            function decrement(_decrementer) {
                countdown -= 1;
                if (countdown === 0) {
                    that.start();
                }
            }
            // Start loaders
            this.sc = new ShaderCompiler(this.gl,shader_programs);
            this.il = new ImageLoader(this.gl,images,decrement);
            this.sound = new Sounds(music,sfx,decrement);
            // Set up unsticking
            function unstick(_e) {
                this.sound.unstick();
                console.log("Unstuck audio playback.");
                window.removeEventListener('click',unstick);
            }
            window.addEventListener('click',unstick);
            // Check shader compiler for errors.
            if (this.sc.errors.length === 0) {
                decrement();
            } else {
                for (const e of this.sc.errors) {
                    console.log(e.toString());
                }
            }            
        }
    }
    start() {
        this.scene = new Scene(this.gl);
        this.setup();
        // Start mainloop
        let last_t = null;
        const that = this;
        (function loop(t) {
            that.cm.updateSize();
            if (last_t !== null) {
                const dt = t-last_t;
                that.update(dt);
                that.scene.update(dt);
                that.scene.prepare(that.gl);
                that.scene.draw(that.gl);
            }
            last_t = t;
            window.requestAnimationFrame(loop);
        })(null);
    }
    setup() {}
    update(t,dt) {}
}
