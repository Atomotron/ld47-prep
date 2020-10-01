'use strict'
/*
 * Loads images and spritesheet descriptors. Must be created with opengl context.
 */
class ImageLoader {
    constructor(gl, images={}, callback = null) {
        if (! (images instanceof Map) ) { // If music_paths is not already a map
            images = new Map(Object.entries(images));
        }
        this.textures = new Map();
        this.count = images.size;
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
                        gl.texStorage2D(gl.TEXTURE_2D, 3, gl.RGBA8, imagebitmap.width, imagebitmap.height);
                        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, imagebitmap.width, imagebitmap.height, gl.RGBA, gl.UNSIGNED_BYTE, imagebitmap);
                        gl.generateMipmap(gl.TEXTURE_2D);
                        this.textures.set(name,texture);
                        this.countdown -= 1;
                        if (this.countdown === 0 &&callback !== null) callback(this);
                    }
                );
            };
            request.send();
        }
    }
}
