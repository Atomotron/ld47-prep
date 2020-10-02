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
        this.mouse_pos = new Vec();
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
            const inverse_view = that.scene.view.inv();
            that.mouse_pos.eq(inverse_view.transform(new Vec(that.cm.mouse_x,that.cm.mouse_y)));
            if (last_t !== null) {
                const dt = (t-last_t)*0.001;
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
        this.angle = 0;
        this.scale = 1;
        this.pos = new Vec();
        this.mirror = false;
        this.data = engine.spritepass.dvao.acquire(engine.gl);
        this.sprite_matrix = new Mat();
        this.rotation = new Mat();
        this.translation = new Mat();
        this.scaling = new Mat();
        this.setImage(image);
        this.engine.sprites.add(this);
    }
    destroy() {
        this.engine.spritepass.dvao.relenquish(this.data);
        this.engine.sprites.delete(this);
    }
    setImage(image) {
        this.image = image;
        if (image !== null) {
            this.sprite_matrix.eq(engine.il.model_frames.get(image));
            this.data.uv.eq(engine.il.texture_frames.get(image));
        } else {
            this.sprite_matrix.zeroeq();
            this.data.uv.zeroeq();
        }
    }
    update(dt) {
        this.tick(dt);
        // Set matrices from values
        this.rotation.rotationeq(this.angle);
        this.translation.translationeq(this.pos);
        if (this.mirror) {
            this.scaling.scalingeq(-this.scale,this.scale);
        } else {
            this.scaling.scalingeq(this.scale,this.scale);
        }
        // Compute model matrix
        this.data.model.eq(this.sprite_matrix);
        this.data.model.composeq(this.scaling);
        this.data.model.composeq(this.rotation);
        this.data.model.composeq(this.translation);
    }
    // Meant to be overriden
    tick(dt) {}
}
