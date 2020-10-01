'use strict'

class Engine {
    constructor(canvas_container,shader_programs,images,frames,music,sfx) {
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
            this.il = new ImageLoader(this.gl,images,frames,decrement);
            this.sound = new Sounds(music,sfx,decrement);
            // Set up unsticking
            function unstick(_e) {
                that.sound.unstick();
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
        this.sprites = new Set();
        if (!this.il.textures.get('spritesheet')) {
            console.error("No spritesheet in image loader. Sprite creation won't work.");    
        } else {
            // Sprite pass
            this.spritepass = new SpritePass(this.gl,
                this.scene,
                this.sc.programs.get('sprite'),
                this.il.textures.get('spritesheet'),
            );
            this.scene.addPass(this.spritepass,0.0);
        }
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
    update(dt) {
        for (const sprite of this.sprites) {
            sprite.update(dt);
        }
    }
}

class Sprite {
    constructor(engine,image=null) {
        this.engine = engine;
        this.data = engine.spritepass.dvao.acquire(engine.gl);
        if (image !== null) {
            this.data.model.eq(engine.il.model_frames.get(image));
            this.data.uv.eq(engine.il.texture_frames.get(image));
        }
        this.engine.sprites.add(this);
    }
    destroy() {
        this.engine.spritepass.dvao.relenquish(this.data);
        this.engine.sprites.delete(this);
    }
    update(dt) {}
}
