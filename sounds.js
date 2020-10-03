/*
 * AudioParam.linearRampToValueAtTime() does not actually work on Firefox
 * or mobile Chrome, as of Sat 26 Sep 2020. As a result, we need to write our
 * own.
 */
class ExpRampController {
    // parameter: reference to AudioParameter, like GainNode.gain
    // v0: start value
    // v1: final value
    // T: Period in ms
    constructor(parameter,v0=0,v1=1,T=1000,callback=null) {
        if (v0 < 1e-8) v0 = 1e-8;
        if (T < 1e-8) T = 1e-8;
        if (v1 < 1e-8) v1 = 1e-8;
        this.parameter = parameter;
        this.dB0 = Math.log(v0);
        this.v1 = v1;
        this.slope = Math.log(v1/v0) / T;
        this.T=T;
        this.callback = callback;
        this.t = 0.0; // Elapsed time
    }
    // Called with delta time since last call. Returns true if complete.
    tick(dt) {
        this.t += dt;
        if (this.t <= this.T) {
            this.parameter.value = Math.exp(this.slope * this.t + this.dB0);
            return false;
        } else {
            this.parameter.value = this.v1;
            if (this.callback !== null) {
                this.callback(this);
                this.callback = null; // Prevent repeated calls
            }
            return true;
        }
    }
}

/*
 * The Sounds class handles both sound effects and music. The two are united
 * by their common use of the audio context, and their common need for faders.
 */
class Sounds {
    // Takes `music_paths` and `sound_paths`, which should be maps from resource name to resource path.
    // The constructor can accept either objects {} or maps. The callback will be called once everything is loaded.
    // to set up the loading bar element.
    constructor(music_paths={}, sound_paths={}, callback = null) {
        // First, convert the arguments to maps
        if (! (music_paths instanceof Map) ) { // If music_paths is not already a map
            music_paths = new Map(Object.entries(music_paths));
        }
        if (! (sound_paths instanceof Map) ) { // If sound_paths is not already a map
            sound_paths = new Map(Object.entries(sound_paths));
        }
        this.music_paths = music_paths;
        this.music = new Map(); // Will map names to HTMLAudioElement
        this.sound_paths = sound_paths;
        this.sound = new Map(); // Will map names to ArrayBuffers
        this.callback = callback;
        this.controllers = new Set(); // The set of active audio controls
        
        // Create audio context and master volume
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master_volume = this.ctx.createGain();
        this.master_volume.connect(this.ctx.destination); 
        // Set up music, connecting them all to music volume.
        this.music_volume = this.ctx.createGain();
        this.music_volume.connect(this.master_volume);
        this.music_track_volumes = new Map();
        // Set up sound effects master nodes
        this.sfx_volume = this.ctx.createGain();
        this.sfx_volume.connect(this.master_volume);
        
        this.start_loading();
    }
    // Creates elements and sets up on-load callbacks.
    start_loading() {
        const that = this; // Useful for callbacks
        this.count = this.sound_paths.size + this.music_paths.size;
        this.countdown = this.count;
        if (this.count === 0) {
            if (this.callback !== null) this.callback(this);
            return;
        }
        // Load (more like create, really) music elements
        for (const [name,path] of this.music_paths) {
            const element = new Audio(path);
            element.addEventListener("canplaythrough", event => {
                const volume = this.ctx.createGain();
                this.ctx.createMediaElementSource(element).connect(volume);
                volume.connect(this.music_volume);
                this.music_track_volumes.set(name,volume);
                this.music.set(name,element);
                this.countdown -= 1;
                if (this.countdown === 0 && this.callback !== null) this.callback(that);
            });
        }
        // Load sounds
        for (const [name,path] of this.sound_paths) {
            // For sounds, we want to create AudioBuffers. This requires downloading them in advance.
            const request = new XMLHttpRequest();
            request.open('GET',path,true);
            request.responseType = 'arraybuffer';
            request.onload = () => {
                this.ctx.decodeAudioData(request.response, (decompressed_buffer) => {
                    that.sound.set(name,decompressed_buffer);
                    that.countdown -= 1;
                    if (this.countdown === 0 && this.callback !== null) this.callback(that);
                });
            };
            request.send();
        }
    }
    // Plays a bit of silence to enable audio. Meant to be attached to a user interaction event.
    unstick() {
        const buffer = this.ctx.createBuffer(2, 1, this.ctx.sampleRate); // One sample of silence
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start();
    }
    // Adds a controller to our set of controllers.
    control(controller) {
        this.controllers.add(controller);
        controller.tick(0);
    }
    // Called with delta time since last tick. Runs controllers.
    tick(dt) {
        const finished = new Set();
        for (const controller of this.controllers) {
            if (controller.tick(dt)) {
                finished.add(controller);
            }
        }
        for (const controller of finished) { // Removed finished controllers.
            this.controllers.delete(controller);
        }
    }
    // Starts a music track. Can be given a fade-in time.
    start_music(name,T=500) {
        this.control(new ExpRampController(
            this.music_track_volumes.get(name).gain,
            0.001,1,
            T,
        ));
        this.music.get(name).play();
    }
    // Stops a music track. Can be given a fade-out time.
    stop_music(name,T=500) {
        const element = this.music.get(name);
        this.control(new ExpRampController(
            this.music_track_volumes.get(name).gain,
            1,0.001,
            T,
            (c) => {
                element.pause();
                element.currentTime = 0; // Return track to start.
            }
        ));
    }
    // Plays a sound effect
    play(name) {
        const node = this.ctx.createBufferSource();
        node.buffer = this.sound.get(name);
        node.connect(this.sfx_volume);
        node.start();
    }
}
