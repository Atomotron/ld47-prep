'use strict'
class CanvasManager {
    constructor(container) {
        this.container = container;
        // Create canvas element
        // this.container.style.overflow = "hidden";
        this.canvas = document.createElement("canvas");
        [this.canvas.width,this.canvas.height] = [this.container.clientWidth,this.container.clientHeight];
        this.container.appendChild(this.canvas);
        this.aspectRatio = this.canvas.width/this.canvas.height;
        
        // Set up mouse inputs
        this.mouse_x = 0;
        this.mouse_y = 0;
        this.canvas.addEventListener('mousemove',(e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.mouse_x = 2.0*x/rect.width - 1.0; // Convert to gl coords
            this.mouse_y = 1.0 - 2.0*y/rect.height;
        });
        
        // Set up keyboard map
        this.pressed = new Set();
        window.addEventListener('keydown',(e) => {this.pressed.add(e.code)});
        window.addEventListener('keyup',(e) => this.pressed.delete(e.code));
        
        // Create gl context
        this.gl = this.canvas.getContext("webgl",{
         alpha: false,
         desynchronized: true,
         depth: false,
         failIfMajorPerformanceCaveat: true,
         powerPreference: "high-performance",
        });
        if (this.gl === null) {
            alert("Could not get WebGL context.");
        } else {
            this.setupContext();
        }
        this.ext_vao = this.gl.getExtension("OES_vertex_array_object");
        if (!this.ext_vao) {
            alert("Your browser does not support OES_vertex_array_object");
        } else {
            this.gl.ext_vao = this.ext_vao;
        }
        this.ext_instance = this.gl.getExtension("ANGLE_instanced_arrays");
        if (!this.ext_instance) {
            alert("Your browser does not support ANGLE_instanced_arrays");
        } else {
            this.gl.ext_instance = this.ext_instance;
        }
        
    }
    isPressed(keycode) {
        return this.pressed.has(keycode);
    }
    setupContext() {
        const gl = this.gl;
        gl.clearColor(0.5, 0.5, 0.5, 1.0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.SCISSOR_TEST);
        this.updateSize();
    }
    updateSize() {
        if (this.canvas.width === this.container.clientWidth && this.canvas.height === this.container.clientHeight) {
            return; // Size is already set
        }
        [this.canvas.width,this.canvas.height] = [this.container.clientWidth,this.container.clientHeight];
        const gl = this.gl;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.scissor(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        this.aspectRatio = gl.drawingBufferWidth/gl.drawingBufferHeight;
    }
}
