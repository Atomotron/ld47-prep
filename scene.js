'use strict'

class Scene {
    constructor(gl,view=new Mat()) {
        this.view = view;
        this.time = 0;
        this.passes = [];
        this.pass_depths = [];
        this.square_verts = new Float32Array([
            -1.0,-1.0,
            1.0,-1.0,
            -1.0,1.0,
            1.0,1.0,
        ]);    
        this.square_vao = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.square_vao);
        gl.bufferData(gl.ARRAY_BUFFER, this.square_verts, gl.STATIC_DRAW);
    }
    addPass(pass,depth=0.5) {
        this.pass_depths.push([pass,depth]);
        this.pass_depths.sort((a,b) => b[1]-a[1]); // Sort from deep to shallow
        this.passes = [];
        for (const [pass,depth] of this.pass_depths) {
            this.passes.push(pass);
        }
    }
    update(dt) {
        this.time += dt;
        for (const pass of this.passes) {
            pass.update(this,dt);
        }
    }
    prepare(gl) {
        for (const pass of this.passes) {
            pass.prepare(gl);
        }
    }
    draw(gl) {
        for (const pass of this.passes) {
            pass.draw(gl);
        }
    }
}

class RenderPass {
    constructor(gl,program) {
        this.program = program;
    }
    update(scene,dt) {}
    prepare(gl) {}
    draw(gl) {}
}

// A builtin pass
class SpritePass extends RenderPass{
    constructor(gl,scene,program,texture) {
        super(gl,program);
        this.texture = texture;
        this.dvao = new DynamicVAO(gl,program,scene.square_vao,{
            model: {type:'mat',dynamic:true},
            uv: {type:'mat',dynamic:true},
        },8);
        this.view_loc = gl.getUniformLocation(program,"view");
        this.view = new Mat();
    }
    update(scene,dt) {
        this.view.eq(scene.view);
    }
    prepare(gl) {
        this.dvao.prepare(gl);
    }
    draw(gl) {
        gl.useProgram(this.program);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniformMatrix3fv(this.view_loc,false,this.view.a);
        this.dvao.draw(gl);
    }
}
