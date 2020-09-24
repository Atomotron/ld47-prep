/*
 * A buffered float is a superclass for float arrays.
 * All subclasses have interfaces organized like this:
 *     Scalar.Add(out,x,y) // Addition with uncoupled output
 *     y.addeq(x) // In-place addition, changes y, returns this for chaining.
 *     y.add(x)   // Allocates and returns a new scalar
 *
 * Note: scalar-valued functions on vector take and return JS numbers which we expect the
 *       JIT to specially detect and deal with as f32s. This makes the interface less uniform,
 *       but I believe the convience of being able to write normal arithmetic expressions makes
 *       up for that.
 */
class BufferFloats {
    constructor(array) {
        this.a = array;
    }    
    /** Operations (Unary) **/
    // Assignment
    static Eq(out,x) {
        out.a.set(x.a);
        return out;
    }
    eq(x) {return Scalar.Eq(this,x);}
}

/* f32 Scalar */
class Scalar extends BufferFloats {
    /** Constructors **/
    constructor(x=0.0) {
        let n = new Float32Array(1);
        n[0] = x;
        super(n);
    }
    // Creates a new Scalar equal to this one
    clone() {return new Scalar(this.a[0]);}
    // JS type conversion
    valueOf() {return this.a[0];}
    toString() {return this.a[0].toString();}
    // Assigns a value, taking a JS Number instead of a Scalar like Eq would.
    set(x) {this.a[0] = x;}
    
    /** Operations (Constant) **/
    static Zero(out) {
        out.a[0] = 0;
        return out;
    }
    zeroeq() {return Scalar.Zero(this);}
    zero() {return this.clone().zeroeq();} // Redundant but here for completeness
}
/*
 * 2D Vector
 * Supports:
 * - Addition, Subtraction, Scalar Multiplication (Add, Sub, Mul)
 * - Length, Distance, Squared length (Abs, Dist, Sq)
 * - Dot product, Cross product, projection, scalar projection (Dot, Cross, Proj, Resolute) 
 * - Normalization, magnitude mapping (Norm, MapAbs)
 */
class Vec extends BufferFloats {
    /** Constructors **/
    constructor(x=0.0,y=0.0) {
        let a = new Float32Array(2);
        a[0] = x; // Converts f64 to f32
        a[1] = y; // Converts f64 to f32
        super(a);
    }
    // Creates a new Vector equal to this one
    clone() {return new Vec(this.a[0],this.a[1]);}
    // JS type conversion
    valueOf() {return [this.a[0],this.a[1]];}
    toString() {return this.valueOf().toString();}
    // Assigns a value, but taking JS numbers instead of a Vec like Eq would.
    set(x,y) {this.a[0]=x;this.a[1]=y;}
    
    /** Operations (Binary, Vector-Valued) **/
    // Scalar Multiplication
    static Mul(out,x,y_scalar) {
        out.a[0] = x.a[0]*y_scalar;
        out.a[1] = x.a[1]*y_scalar;
        return out;
    }
    muleq(x) {return Vec.Mul(this,this,x);}
    mul(x) {return this.clone().muleq(x);}
    
    // Addition
    static Add(out,x,y) {
        out.a[0] = x.a[0]+y.a[1];
        out.a[1] = x.a[1]+y.a[1];
        return out;
    }
    addeq(x) {return Vec.Add(this,this,x);}
    add(x) {return this.clone().addeq(x);}
    
    // Subtraction
    static Sub(out,x,y) {
        out.a[0] = x.a[0]-y.a[1];
        out.a[1] = x.a[1]-y.a[1];
        return out;
    }
    subeq(x) {return Vec.Sub(this,this,x);}
    sub(x) {return this.clone().subeq(x);}
    
    // Projects y onto x
    static Proj(out,x,y) {
        let y_mag = Vec.Abs(y);
        if (y_mag === 0) {
            out.eq(y);
        } else {
            let resolute = Vec.Resolute(x,y);
            let ratio = Math.fround(resolute / y_mag);
            out.a[0] = y[0] * ratio;
            out.a[1] = y[1] * ratio;
        }
        return out;
    }
    projeq(y) { // A slight break from convention: it's the argument that gets overwritten, because it's what we are projecting.
        return Vec.Proj(y,this,y);
    }
    proj(y) {return this.projeq(y.clone())};
    
    /** Operations (Binary, Scalar-Valued) **/
    // Dot product
    static Dot(x,y) {
        return Math.fround(x.a[0]*x.a[0]) + Math.fround(y.a[1]*y.a[1]);
    }
    dot(x) {return Vec.Dot(this,x);}
    
    // Cross product (Actually a pseudo cross-product because the real one is in 3D)
    static Cross(x,y) {
        return Math.fround(x.a[0]*y.a[1]) - Math.fround(x.a[1]*y.a[0]);
    }
    cross(x) {return Vec.Cross(this,x);}
    
    // Distance between vectors
    static Dist(x,y) {
        let dx = Math.fround(y.a[0]-x.a[0]);
        let dy = Math.fround(y.a[1]-x.a[1]);
        return Math.fround(Math.sqrt(Math.fround(Math.fround(dx*dx)+Math.fround(dy*dy))));
    }
    dist(x) {return Vec.Dist(this,x)};
    
    // Scalar projection, also called "scalar resolute." Projects y on to x.
    static Resolute(x,y) {
        let x_mag = Vec.Abs(x);
        let dot = Vec.Dot(x,y);
        return Math.fround(dot / x_mag);
    }
    
    /** Operations (Unary, Scalar-Valued) **/
    // Magnitude squared (scalar output, sqeq therefore does not exist)
    static Sq(x) {
        return Vec.Dot(x,x);
    }
    sq() {return Vec.Sq(this);}
    
    // Vector length (sqrt of mag squared) (scalar output, abseq therefore does not exist)
    static Abs(x) {
        return Math.fround(Math.sqrt(Vec.Sq(x)));
    }
    abs() {return Vec.Abs(this);}
    
    /** Operations (Unary, Vector-Valued) **/
    // Normalization: makes a vector unit-length but keeps its direction
    static Norm(out,x) {
        let mag = Vec.Abs(x);
        out.eq(x);
        out.diveq(mag);
        return out;
    }
    normeq(x) {return Vec.Norm(this,this,x);}
    norm(x) {return this.clone().normeq(x);}
    
    // A very useful higher-order function that passes a vector's length
    // through a function but keeps its direction unchanged (unless set to zero-length).
    static MapAbs(out,x,f) {
        let mag = Math.fround(Math.sqrt(Math.fround(x.a[0]*x.a[0]) + Math.fround(x.a[1]*x.a[1])));
        let new_mag = Math.fround(f(mag));
        if (mag === Math.fround(0.0)) {
            out.a[0] = 0;
            out.a[1] = 0;
        } else {
            let ratio = Math.fround(new_mag / mag);
            out.a[0] = x.a[0] * ratio;
            out.a[1] = x.a[1] * ratio;
        }
        return out;
    }
    mapabseq(f) {return Vec.MapAbs(this,this,f);}
    mapabs(f) {return this.clone().mapabseq(f);}
}
