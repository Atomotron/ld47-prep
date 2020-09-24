/*
 * A buffered float is a superclass for float arrays.
 * All subclasses have interfaces organized like this:
 *     Scalar.Add(out,x,y) // Addition with uncoupled output
 *     y.addeq(x) // In-place addition, changes y, returns this for chaining.
 *     y.add(x)   // Allocates and returns a new scalar
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
    clone() {
        return (new Scalar()).eq(this);
    }
    
    /** Operations (Constant) **/
    static Zero(out) {
        out.a[0] = 0;
        return out;
    }
    zeroeq() {return Scalar.Zero(this);}
    zero() {return this.clone().zeroeq();} // Redundant but here for completeness
    
    /** Operations (Unary) **/    
    // Absolute value (L1 norm)
    static Abs(out,x) {
        out.a[0] = Math.abs(x.a[0]);
        return out;
    }
    abseq() {return Scalar.Abs(this,this);}
    abs() {return this.clone().abseq();}    
    
    // Squaring (L2 norm)
    static Sq(out,x) {
        out.a[0] = x.a[0]*x.a[0];
        return out;
    }
    sqeq() {return Scalar.Sq(this,this);}
    sq() {return this.clone().sqeq();}
    
    // Square root
    static Sqrt(out,x) {
        out.a[0] = Math.sqrt(x.a[0]);
        return out;
    }
    sqrteq() {return Scalar.Sqrt(this,this);}
    sqrt() {return this.clone().sqrteq();}
    
    /** Operations (Binary) **/
    // Addition
    static Add(out,x,y) {
        out.a[0] = x.a[0] + x.y[0];
        return out;
    }
    addeq(x) {return Scalar.Add(this,this,x);}
    add(x) {return this.clone().addeq(x);}
    
    // Subtraction
    static Sub(out,x,y) {
        out.a[0] = x.a[0] - x.y[0];
        return out;
    }
    subeq(x) {return Scalar.Sub(this,this,x);}
    sub(x) {return this.clone().subeq(x);}
    
    // Multiplication
    static Mul(out,x,y) {
        out.a[0] = x.a[0] * x.y[0];
        return out;
    }
    muleq(x) {return Scalar.Mul(this,this,x);}
    mul(x) {return this.clone().muleq(x);}
    
    // Division
    static Div(out,x,y) {
        out.a[0] = x.a[0] / x.y[0];
        return out;
    }
    diveq(x) {return Scalar.Div(this,this,x);}
    div(x) {return this.clone().diveq(x);}
}

class Vec extends BufferFloats {
    /** Constructors **/
    constructor(x=0.0,y=0.0) {
        let a = new Float32Array(2);
        a[0] = x; // Converts f64 to f32
        a[1] = y; // Converts f64 to f32
        super(a);
    }
    // Creates a new Vector equal to this one
    clone() {
        return (new Vec()).eq(this);
    }    
    
    /** Operations (Binary, Vector-Valued) **/
    // Scalar Multiplication
    static Mul(out,x,y_scalar) {
        out.a[0] = x.a[0]*y_scalar.a[0];
        out.a[1] = x.a[1]*y_scalar.a[0];
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
    
    /** Operations (Binary, Scalar-Valued) **/
    // Dot product
    static Dot(out_scalar,x,y) {
        out_scalar.a[0] = Math.fround(x.a[0]*x.a[0]) + Math.fround(y.a[1]*y.a[1]);
        return out_scalar;
    }
    dot(x) {return Vec.Dot(new Scalar(),this,x);}
    
    // Cross product (Actually a pseudo cross-product because the real one is in 3D)
    static Cross(out_scalar,x,y) {
        out_scalar.a[0] = Math.fround(x.a[0]*y.a[1]) - Math.fround(x.a[1]*y.a[0]);
        return out_scalar;
    }
    cross(x) {return Vec.Cross(new Scalar(),this,x);}
    
    /** Operations (Unary, Scalar-Valued) **/
    // Magnitude squared (scalar output, sqeq therefore does not exist)
    static Sq(out_scalar,x) {
        Vec.Dot(out_scalar,x,x);
        return out_scalar;
    }
    sq() {return Vec.Sq((new Scalar()),this);}
    
    // Vector length (sqrt of mag squared) (scalar output, abseq therefore does not exist)
    static Abs(out_scalar,x) {
        Vec.Sq(out_scalar,x);
        out_scalar.sqrteq();
    }
    abs() {return Vec.Abs(new Scalar(),this);}
    
    /** Operations (Unary, Vector-Valued) **/
    // Normalization: makes a vector unit-length but keeps its direction
    static Norm(out,x) {
        let mag = Math.sqrt(Math.fround(x.a[0]*x.a[0]) + Math.fround(x.a[1]*x.a[1]));
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
