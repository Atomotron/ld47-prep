'use strict'
/*
 * Loads images and spritesheet descriptors. Must be created with opengl context.
 */
class ImageLoader {
    constructor(gl, images={}, sprites={}, callback = null) {
        if (! (images instanceof Map) ) { // If music_paths is not already a map
            images = new Map(Object.entries(images));
        }
        if (! (sprites instanceof Map) ) { // If music_paths is not already a map
            sprites = new Map(Object.entries(sprites));
        }
        this.textures = new Map();
        this.count = images.size + sprites.size;
        this.countdown = this.count;
        for (const [name,path] of images) {
            const request = new XMLHttpRequest();
            request.open('GET',path,true);
            request.responseType = 'blob';
            request.onload = () => {
                window.createImageBitmap(request.response).then(
                    (imagebitmap) => {
                        const texture = gl.createTexture();
                        gl.bindTexture(gl.TEXTURE_2D, texture);
                        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
                        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, imagebitmap.width, imagebitmap.height);
                        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, imagebitmap.width, imagebitmap.height, gl.RGBA, gl.UNSIGNED_BYTE, imagebitmap);
                        gl.generateMipmap(gl.TEXTURE_2D);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                        this.textures.set(name,texture);
                        this.countdown -= 1;
                        if (this.countdown === 0 &&callback !== null) callback(this);
                    }
                );
            };
            request.send();
        }
        this.texture_frames = new Map();
        this.model_frames = new Map();
        for (const [name,path] of sprites) {
            const request = new XMLHttpRequest();
            request.open('GET',path,true);
            request.responseType = 'json';
            request.onload = () => {
                const size = request.response.meta.size;
                const frames = request.response.frames;
                for (const name in frames) {
                    const frame = frames[name].frame;
                    this.texture_frames.set(name,(new Mat()).unittotexrecteq(frame.x/size.w,frame.y/size.h,frame.w/size.w,frame.h/size.h));
                    const largest_dim = size.h>size.w ? size.h:size.w;
                    const sourceSize = frames[name].sourceSize;
                    const model_matrix = (new Mat(sourceSize.w,0.0, 0.0,sourceSize.h, 0.0,0.0)).muleq(1/512);
                    this.model_frames.set(name,model_matrix);
                }
                this.countdown -= 1;
                if (this.countdown === 0 &&callback !== null) callback(this);
            };
            request.send();
        }
    }
}
