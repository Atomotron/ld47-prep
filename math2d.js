/*
 * A buffered float is something that can be bound to a float/vec/matrix uniform in WebGL. Based on Float32Array.
 */
class BufferedFloats {
    constructor(size) {
        this.a = new Float32Array(size);
    }
    // Copies a value from another buffered float.
    eq(x) {
        this.a.set(x.a);
    }
    // Bind the value, whatever it is, to the given uniform location.
    uniform(gl,location) {}
}

class Scalar extends BufferedFloats {
    /* Constructors */
    // Starts at zero
    constructor() {
        super(1);
    }
    static from(x) {
        let n = new Scalar();
        n.a[0] = x; // Converts f64 to f32
        return n;
    }
    // Creates a new Scalar equal to this one
    clone() {
        let n = new Scalar();
        n.eq(this);
        return n
    }    
    /* Operations */
    // Adds another scalar to this one.
    addeq(x) {
        this.a[0] = this.a[0] + x.a[0];
    }
    add(x) {this.clone().addeq(x)}
    // Multiplies another scalar by this one.
    addeq(x) {
        this.a[0] = this.a[0] + x.a[0];
    }
    add(x) {this.clone().addeq(x)}
}
