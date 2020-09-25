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

/*
 * Matrix class.
 * Represents an affine transformation in 2D, making it a 3D matrix.
 * OpenGL matrix standard:
 *    [ a11 a21 a31   // Column 1
 *      a12 a22 a32   // Column 2
 *      a13 a23 a33 ] // Column 3
 * Written in terms of vector multiplication,
 *    [ xx xy 0 // Multiplied by x-component
 *      yx yy 0 // Multiplied by y-component
 *       x  y 1 ] // Multiplied by 1
 * Indices
 *    [   0   1   2   // Column 1
 *        3   4   5   // Column 2
 *        6   7   8 ] // Column 3
 * Letters for Wolfram Alpha. :-)
 *    [   a   c   0   // Column 1
 *        b   d   0   // Column 2
 *        x   y   1 ] // Column 3
 * But in wolfram you would write that as...
 *    { {a,b,x},{c,d,y},{0,0,1} }
 */
 class Mat extends BufferFloats {
    constructor(xx=1.0,xy=0.0, yx=0.0,yy=1.0, x=0.0,y=0.0) {
        let a = new Float32Array(9); // 3x3, to hand to opengl
        super(a);
        this.set(xx,xy, yx,yy, x,y);
    }
    // Creates a new Vector equal to this one
    clone() {return new Mat(this.a[0],this.a[1],this.a[3],this.a[4],this.a[6],this.a[7]);}
    // JS type conversion
    valueOf() {return [this.a[0],this.a[1],this.a[3],this.a[4],this.a[6],this.a[7]];}
    toString() { // Prints a linear equation equivalent to this matrix
        return `x[${this.a[0]},${this.a[1]}] + y[${this.a[3]},${this.a[4]}] + [${this.a[6]},${this.a[7]}]`
    }
    // Constructor-style assignment from raw numbers
    set(xx=1.0,xy=0.0, yx=0.0,yy=1.0, x=0.0,y=0.0) {
        let a = this.a;
        a[0] = xx; a[1] = xy; a[2] = 0.0;
        a[3] = yx; a[4] = yy; a[5] = 0.0;
        a[6] = a;  a[7] = y;  a[8] = 1.0;
    }
    /** Operators (Binary, Matrix-Valued) **/
    // Scalar multiplication
    static Mul(out,x,y_scalar) {
        let a = x.a;
        let b = out.a;
        y_scalar = Math.fround(y_scalar);
        b[0] = a[0]*y_scalar; b[1] = a[1]*y_scalar;
        b[3] = a[3]*y_scalar; b[4] = a[4]*y_scalar;
        b[6] = a[6]*y_scalar; b[7] = a[7]*y_scalar;
        return out;
    }
    muleq(y_scalar) {return Mat.Mul(this,this,y_scalar);}
    mul(y_scalar) {return this.clone().muleq(y_scalar);}
    
    
    /** Operators (Unary, Scalar-Valued) **/
    // Determinant
    static Det(x) {
        let a = x.a;
        // xx*yy - xy*yx
        return Math.fround(Math.fround(a[0]*a[4]) - Math.fround(a[1]*a[3]));
    }
    det() {return Mat.Det(this);}
    
    // Trace (Equal to the sum of the eigenvalues)
    static Trace(x) {
        return Math.fround(Math.fround(x.a[0] + x.a[4]) + Math.fround(1.0))
    }
    trace() {return Mat.Trace(this);}
    
    /** Operators (Unary, Matrix-Valued) **/
    // Matrix inverse. If no inverse exists, outputs the identity matrix.
    static Inverse(out,x) {
        let det = Mat.Det(x);
        if (det === 0.0) {
            out.set();
        } else {
            // First, compute adjugate
            let a = x.a;
            let b0 =  a[4]; let b1 = -a[1];
            let b3 = -a[3]; let b4 = a[0];
            let b6 = Math.fround(a[3]*a[7]) - Math.fround(a[4]*a[6]); // by-dx
            let b7 = Math.fround(a[1]*a[6]) - Math.fround(a[0]*a[7]); // cx-ay
            b.set(b0,b1, b3,b4, b6,b7);
            // Then, divide by the determinant to arrive at the inverse
            b.muleq(Math.fround(1 / det));
        }
        return out;
    }
    inveq() {return Mat.Inverse(this,this)};
    inv() {return this.clone().inveq()};
    
 }
