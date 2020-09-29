'use strict'
class ShaderCompilerError {
    constructor(context,log) {
        this.context = context;
        this.log = log;
    }
    toString() {
        return this.context + '\n' + this.log;
    }
}

class ShaderCompiler {
    constructor(gl,programs={}) {
        if (! (programs instanceof Map) ) { // If shaders is not already a map
            programs = new Map(Object.entries(programs));
        }
        this.errors = []; // A list of errors
        // Load shaders
        const vshaders = new Map();
        const fshaders = new Map();
        for (const [name,[vname,fname]] of programs) {
            this.loadShader(vname,vshaders,gl.VERTEX_SHADER);
            this.loadShader(fname,fshaders,gl.FRAGMENT_SHADER);
        }
        // Compile shaders
        this.compileShaders(vshaders,gl.VERTEX_SHADER);
        this.compileShaders(fshaders,gl.FRAGMENT_SHADER);
        // Log errors in shader compilation.
        this.checkShaders(vshaders);
        this.checkShaders(fshaders);
        // Link programs
        this.linkPrograms(programs,vshaders,fshaders);
        // Log errors in linking
        this.checkPrograms(programs);
        // Check uniforms and attributes
        this.uniformProfiles = new Map();
        this.samplerProfiles = new Map();
        this.attributeProfiles = new Map();
        this.analyzePrograms(programs);
        // Compilation done, we can save the map now.
        this.programs = programs;
    }
    error(context,log) {
        this.errors.push(new ShaderCompilerError(context,log));
    }
    loadShader(name,map,type) {
        const element = document.getElementById(name);
        if (map.has(name)) return; // memoization
        if (element !== null) {
            const correctType = type === gl.VERTEX_SHADER ? "x-shader/x-vertex" : "x-shader/x-fragment";
            if (element.type === correctType) {
                map.set(name,element.textContent);
                return;
            } else {
                this.error(name,"Element type is `"+element.type+"` but it should be `"+correctType+"`.");
            }
        } else {
            this.error(name,"No element with id `"+name+"`. Shader source not found.");
        }
        map.set(name,null);
    }
    compileShaders(map,type) {
        for (const [name,source] of map) {
            if (source !== null) {
                const shader = gl.createShader(type);
                gl.shaderSource(shader,source);
                gl.compileShader(shader);
                map.set(name,shader);
            }
        }
    }
    checkShaders(map) {
        // Checking shaders separately from compilation lets the driver compile in parallel
        for (const [name,shader] of map) {
            if (shader !== null) {
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { // Blocks until compiled
                    this.error(name,gl.getShaderInfoLog(shader));
                    map.set(name,null);
                }
            }
        }
    }
    linkPrograms(programs,vshaders,fshaders) {
        for (const [name,[vname,fname]] of programs) {
            const [vshader,fshader] = [vshaders.get(vname),fshaders.get(fname)];
            if (vshader !== null && fshader !== null) {
                const program = gl.createProgram();
                gl.attachShader(program,vshader);
                gl.attachShader(program,fshader);
                gl.linkProgram(program);
                programs.set(name,program);
            } else {
                programs.delete(name);
            }
        }
    }
    checkPrograms(programs) {
        for (const [name,program] of programs) {
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                this.error(name,gl.getShaderInfoLog(program));
                programs.delete(name);
            }
        }
    }
    analyzePrograms(programs) {
        for (const [name,program] of programs) {
            const nattributes = gl.getProgramParameter(program,gl.ACTIVE_ATTRIBUTES);
            const attributeProfile = [];
            for (let i=0; i<nattributes; ++i) {
                const info = gl.getActiveAttrib(program, i);
                // Ignore builtin attributes
                if (!info.name.startsWith("gl_")) { 
                    attributeProfile.push(info);
                }
            }
            const nuniforms = gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);
            const uniformProfile = [];
            const samplerProfile = [];
            for (let i=0; i<nuniforms; ++i) {
                const info = gl.getActiveUniform(program, i);
                if (info.type in [gl.SAMPLER_2D,gl.SAMPLER_CUBE]) { // sampler uniform
                    samplerProfile.push(info);
                else { // The usual kind of uniform
                    uniformProfile.push(info);
                }
            }
            this.attributeProfiles.set(name,attributeProfile);
            this.uniformProfiles.set(name,uniformProfile);
            this.samplerProfiles.set(name,samplerProfile);
        }
    }
}
