'use strict'
class DVBO {
    constructor(gl,elementSize,nElements,dynamic=true) {
        this.elementSize = elementSize;
        this.nElements = nElements;
        this.a = new Float32Array(nElements*elementSize);
        this.created = false;
        this.must_update = dynamic;
        this.dynamic = dynamic;
        this.vbo = gl.createBuffer(); // Awaiting first data upload
    }
    copy_from(old_dvbo) {
        this.a.set(old_dvbo.a.subarray(0,old_dvbo.a.length));
    }
    subarray(index) {
        return this.a.subarray(index*this.elementSize, (index+1)*this.elementSize);
    }
    rebase(index,arrayfloats) {
        arrayfloats.a = this.subarray(index);
    }
    acquire(index) { // Meant to be overridden
        return new ArrayFloats(this.subarray(index));
    }
    drawMode(gl) {
        return this.dynamic ? gl.STREAM_DRAW : gl.STATIC_DRAW;
    }
    // Creates VBO on GPU (first data upload)
    create(gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.a, this.drawMode(gl));
    }
    // Updates VBO on GPU
    update(gl) {
        //console.log(this.a);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.a, 0, this.a.length);
    }
    // Deletes VBO on GPU
    delete(gl) {
        gl.deleteBuffer(this.vbo);
    }
    prepare(gl) { // Prepares for rendering
        if (!this.created) {
            this.create(gl);
            this.created = true;
        } else {
            if (this.must_update) {
                this.update(gl);
                if (!this.dynamic) {
                    this.must_update = false;
                }
            }
        }        
    }
}

class ScalarDVBO extends DVBO {
    constructor(gl,nElements,dynamic=true) {
        super(gl,1,nElements,dynamic);
    }
    acquire(index) {
        return new AbstractScalar(this.subarray(index));
    }
}

class VecDVBO extends DVBO {
    constructor(gl,nElements,dynamic=true) {
        super(gl,2,nElements,dynamic);
    }
    acquire(index) {
        return new AbstractVec(this.subarray(index));
    }
}

class MatDVBO extends DVBO {
    constructor(gl,nElements,dynamic=true) {
        super(gl,9,nElements,dynamic);
    }
    acquire(index) {
        return new AbstractMat(this.subarray(index)).set(); // Set to identity matrix
    }
}

/*
 * A vertex array object that contains only square vertices.
 */ 
class SimpleVAO {
    constructor(gl,program,square_vbo) {
        this.square_vbo = square_vbo;
        this.vertex_loc = gl.getAttribLocation(program,'vertex');
        this.construct(gl);
    }
    construct(gl) {
        this.vao = gl.ext_vao.createVertexArrayOES();
        gl.ext_vao.bindVertexArrayOES(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.square_vbo);
        gl.vertexAttribPointer(this.vertex_loc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.vertex_loc);
    }
    delete(gl) {
        gl.ext_vao.deleteVertexArrayOES(this.vao);
    }
    draw(gl) {
        gl.ext_vao.bindVertexArrayOES(this.vao);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
}

/*
 * A pool of index elements for instanced sprite drawing.
 */ 
class DynamicVAO {
    constructor(gl,program,square_vbo,channels,size=1) {
        this.square_vbo = square_vbo;
        this.vertex_loc = gl.getAttribLocation(program,'vertex');
        this.channels = channels;
        this.recycled_objects = [];
        this.object_indices = new Map();
        this.size = size;
        this.head = 0;
        this.refresh_requested = false;
        // Find locations in program
        if (this.vertex_loc < 0) {
            console.error("Shader missing the absolutely essential 'vertex' location.");
        }
        this.locations = new Map();
        this.malformed_names = new Set();
        for (const name in channels) {
            const channel = channels[name];
            if (channel.type === "scalar" || channel.type === "vec") {
                const loc = gl.getAttribLocation(program,name);
                if (loc < 0) {
                    console.error("Could not find attribute",name);
                    this.malformed_names.add(name);
                } else {
                    this.locations.set(name,loc);
                }
            } else if (channel.type === "mat") {
                const loc_x = gl.getAttribLocation(program,name+'_x');
                const loc_y = gl.getAttribLocation(program,name+'_y');
                const loc_z = gl.getAttribLocation(program,name+'_z');
                if (loc_x < 0 || loc_y < 0) {
                    console.error("Could not find attribute",name,"because we missed",loc_x<0 ? name+'_x':'',loc_y<0 ? name+'_y':'',loc_z<0 ? name+'_z':'');
                    this.malformed_names.add(name);
                } else {
                    this.locations.set(name,[loc_x,loc_y,loc_z]);
                }
            } else {
                this.malformed_names.add(name);
            }
        }
        // Construct initial VAO
        this.vao = null;
        this.construct(gl,size);
    }
    construct(gl,size) {
        this.vao = gl.ext_vao.createVertexArrayOES();
        gl.ext_vao.bindVertexArrayOES(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.square_vbo);
        gl.vertexAttribPointer(this.vertex_loc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.vertex_loc);
        this.DVBOs = new Map();
        for (const name in this.channels) {
            if (!this.locations.has(name)) continue; // Skip names that we don't have locations for. We don't have locations for names that weren't in the shader.
            const channel = this.channels[name];
            const loc = this.locations.get(name);
            if (channel.type === "scalar") {
                const DVBO = new ScalarDVBO(gl,size,channel.dynamic);
                this.DVBOs.set(name,DVBO);
                gl.bindBuffer(gl.ARRAY_BUFFER,DVBO.vbo);
                gl.vertexAttribPointer(loc, 1, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(loc);
                gl.ext_instance.vertexAttribDivisorANGLE(loc, 1);
            } else if (channel.type === "vec") {
                const DVBO = new VecDVBO(gl,size,channel.dynamic);
                this.DVBOs.set(name,DVBO);
                gl.bindBuffer(gl.ARRAY_BUFFER,DVBO.vbo);
                gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(loc);
                gl.ext_instance.vertexAttribDivisorANGLE(loc, 1);
            } else if (channel.type === "mat") {
                const DVBO = new MatDVBO(gl,size,channel.dynamic);
                this.DVBOs.set(name,DVBO);
                gl.bindBuffer(gl.ARRAY_BUFFER,DVBO.vbo);
                gl.vertexAttribPointer(loc[0], 3, gl.FLOAT, false, 4*9, 4*0);
                gl.enableVertexAttribArray(loc[0]);
                gl.ext_instance.vertexAttribDivisorANGLE(loc[0], 1);
                gl.vertexAttribPointer(loc[1], 3, gl.FLOAT, false, 4*9, 4*3);
                gl.enableVertexAttribArray(loc[1]);
                gl.ext_instance.vertexAttribDivisorANGLE(loc[1], 1);
                gl.vertexAttribPointer(loc[2], 3, gl.FLOAT, false, 4*9, 4*6);
                gl.enableVertexAttribArray(loc[2]);
                gl.ext_instance.vertexAttribDivisorANGLE(loc[2], 1);
            }
        }
        this.size = size;
    }
    expand(gl,size) {
        this.delete(gl);
        const old_DVBOs = this.DVBOs;
        this.construct(gl,size);
        // Move over backing
        for (const [object,index] of this.object_indices) {
            for (const name in object) {
                this.DVBOs.get(name).rebase(index,object[name]);
            }
        }
        // Copy arrays
        for (const [name,old_DVBO] of old_DVBOs) {
            this.DVBOs.get(name).copy_from(old_DVBO);
        }
    }
    delete(gl) {
        for (const [name,dvbo] of this.DVBOs) {
            dvbo.delete(gl);
        }
        gl.ext_vao.deleteVertexArrayOES(this.vao);
    }
    make_object(index) {
        const object = {};
        for (const name in this.channels) {
            object[name] = this.DVBOs.get(name).acquire(index);
        }
        this.object_indices.set(object,index); // Saving for rebuilding
        return object;
    }
    acquire(gl) {
        if (this.recycled_objects.length > 0) {
            // We can re-use a recycled object.
            this.request_refresh();
            return this.recycled_objects.pop();
        } else {
            if (this.head < this.size) {
                // Create a new object
                const index = this.head;
                this.head += 1;
                this.request_refresh();
                return this.make_object(index);
            } else {
                // Out of space!
                this.expand(gl,this.size * 2);
                return this.acquire(gl);
            }
        }
    }
    relenquish(object) {
        for (const name in object) {
            object[name].zeroeq(); // Zero out relenquished objects
        }
        this.recycled_objects.push(object);
        this.request_refresh();
    }
    // Flag all objects for data refresh, including static ones.
    request_refresh() {
        this.refresh_requested = true;
    }
    prepare(gl) {
        for (const [name,dvbo] of this.DVBOs) {
            if (this.refresh_requested) {
                dvbo.must_update = true;
            }
            dvbo.prepare(gl);
        }
        this.refresh_requested = false;
    }
    draw(gl) {
        gl.ext_vao.bindVertexArrayOES(this.vao);
        gl.ext_instance.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP,0,4,this.head);
    }
}
