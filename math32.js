/*
 * A buffered float is a superclass for float arrays.
 * All subclasses have interfaces organized like this:
 *     Scalar.Add(out,x,y) // Addition with uncoupled output
 *     y.addeq(x) // In-place addition, changes y, returns this for chaining.
 *     y.add(x)   // Allocates and returns a new scalar
 * The interfaces a pretty uniformly patterned.
 *
 * Note: scalar-valued functions on vector take and return JS numbers which we expect the
 *       JIT to specially detect and deal with as f32s. This makes the interface less uniform,
 *       but I believe the convience of being able to write normal arithmetic expressions makes
 *       up for that.
 */
class ArrayFloats {
    constructor(array) {
        this.a = array;
    }    
    /** Operations (Constant) **/
    // Zeroing
    static Zero(out) {
        return out.fill(out,0);
    }
    zeroeq() {return ArrayFloats.Zero(this);}
    /** Operations (Unary) **/
    // Assignment
    static Eq(out,x) {
        out.a.set(x.a);
        return out;
    }
    eq(x) {return ArrayFloats.Eq(this,x);}
}

/* f32 Scalar */
class AbstractScalar extends ArrayFloats {
    // Creates a new Scalar equal to this one
    clone() {return new Scalar(this.a[0]);}
    // JS type conversion
    valueOf() {return this.a[0];}
    toString() {return this.a[0].toString();}
    // Assigns a value, taking a JS Number instead of a Scalar like Eq would.
    set(x=0.0) {this.a[0] = x; return this;}
    
    get x() {return this.a[0];}
    set x(value) {this.a[0] = value;}
}
/* Scalar with allocating constructor. */
class Scalar extends AbstractScalar {
    constructor(x=0.0) {
        let n = new Float32Array(1);
        super(n);
        this.set(x);
    }
}
/*
 * 2D Vector
 * Supports:
 * - Addition, Subtraction, Scalar Multiplication (Add, Sub, Mul)
 * - Length, Distance, Squared length (Abs, Dist, Sq)
 * - Dot product, Cross product, projection, scalar projection (Dot, Cross, Proj, Resolute) 
 * - Normalization, magnitude mapping (Norm, MapAbs)
 */
class AbstractVec extends ArrayFloats {
    // Creates a new Vector equal to this one
    clone() {return new Vec(this.a[0],this.a[1]);}
    // JS type conversion
    valueOf() {return [this.a[0],this.a[1]];}
    toString() {return this.valueOf().toString();}
    // Assigns a value, but taking JS numbers instead of a Vec like Eq would.
    set(x=0.0,y=0.0) {this.a[0]=x;this.a[1]=y; return this;}
    
    get x() {return this.a[0];}
    set x(value) {this.a[0] = value;}
    get y() {return this.a[1];}
    set y(value) {this.a[1] = value;}
    
    /** Constructive setters **/
    static Polar(out,r,theta) {
        theta = Math.fround(theta);
        r = Math.fround(r);
        out.a[0] = Math.fround(Math.fround(Math.cos(theta))*r);
        out.a[1] = Math.fround(Math.fround(Math.sin(theta))*r);
        return out;
    }
    polareq(r,theta) {return Vec.Polar(this,r,theta)};
    
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
        out.a[0] = x.a[0]+y.a[0];
        out.a[1] = x.a[1]+y.a[1];
        return out;
    }
    addeq(x) {return Vec.Add(this,this,x);}
    add(x) {return this.clone().addeq(x);}
    
    // Subtraction
    static Sub(out,x,y) {
        out.a[0] = x.a[0]-y.a[0];
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
            let dot = Vec.Dot(x,y);
            let norm = Vec.Dot(x,x);
            let ratio = Math.fround(dot / norm);
            out.a[0] = x.a[0] * ratio;
            out.a[1] = x.a[1] * ratio;
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
        return Math.fround(x.a[0]*y.a[0]) + Math.fround(x.a[1]*y.a[1]);
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
    resolute(x) {return Vec.Resolute(this,x);}
    
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
        out.muleq(Math.fround(Math.fround(1.0)/mag));
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
class Vec extends AbstractVec {
    constructor(x=0.0,y=0.0) {
        let a = new Float32Array(2);
        super(a);
        this.set(x,y);
    }
}

/*
 * Matrix class.
 * Represents an affine transformation in 2D. It's stored as a 3D matrix.
 * However, its algebra is that of affine transformation operators.
 *
 * Supports:
 *  - Addition, Subtraction, Scalar multiplication (Add, Sub, Mul)
 *  - Vector transformation, Transformation composition (Transform, Compose)
 *  - Determinant, Inverse (Det, Inv)
 *
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
 *    [   a   b   0   // Column 1
 *        c   d   0   // Column 2
 *        x   y   1 ] // Column 3
 * But in wolfram you would write that as...
 *    { {a,c,x},{b,d,y},{0,0,1} }
 */
 class AbstractMat extends ArrayFloats {
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
        a[6] = x;  a[7] = y;  a[8] = 1.0;
        return this;
    }
    
    /** Constructive setters **/
    static Translation(out,vec) {
        const a = out.a;
        a[0] =      1.0; a[1] =      0.0; a[2] = 0.0;
        a[3] =      0.0; a[4] =      1.0; a[5] = 0.0;
        a[6] = vec.a[0]; a[7] = vec.a[1]; a[8] = 1.0;
        return out;
    }
    translationeq(vec) {return Mat.Translation(this,vec);}
    static Rotation(out,theta) {
        const a = out.a;
        a[0] = Math.cos(theta); a[1] = -Math.sin(theta); a[2] = 0.0;
        a[3] = Math.sin(theta); a[4] =  Math.cos(theta); a[5] = 0.0;
        a[6] =             0.0; a[7] =              0.0; a[8] = 1.0;
        return out;
    }
    rotationeq(theta) {return Mat.Rotation(this,theta);}    
    static Scaling(out,sx,sy) {
        const a = out.a;
        a[0] =  sx; a[1] = 0.0; a[2] = 0.0;
        a[3] = 0.0; a[4] =  sy; a[5] = 0.0;
        a[6] = 0.0; a[7] = 0.0; a[8] = 1.0;
        return out;
    }
    scalingeq(sx,sy) {return Mat.Scaling(this,sx,sy);}   
     
    // A matrix that transforms the standard -1...1 square to the given rect in texture coordinates
    static UnitToTexRect(out,x,y,w,h) {
        const a = out.a;
        let center_x = x + 0.5*w;
        let center_y = y + 0.5*h;
        let scale_x = 0.5*w;
        let scale_y = -0.5*h; // Textures have inverted y
        a[0] = scale_x;  a[1] = 0.0;      a[2] = 0.0;
        a[3] = 0.0;      a[4] = scale_y;  a[5] = 0.0;
        a[6] = center_x; a[7] = center_y; a[8] = 1.0;
        return out;
    }
    unittotexrecteq(x,y,w,h) {return Mat.UnitToTexRect(this,x,y,w,h);}

    /** Transformations **/
    static Translate(out,dx,dy) {
        const a = out.a;
        a[6] = a[6] + dx;
        a[7] = a[7] + dy;
        return out;
    }
    translateq(dx,dy) {return Mat.Translate(this,dx,dy);}
    
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
    
    // Addition
    static Add(out,x,y) {
        let a = out.a; let b = x.a; let c = y.a;
        a[0] = b[0]+c[0]; a[1] = b[1]+c[1];
        a[3] = b[3]+c[3]; a[4] = b[4]+c[4];
        a[6] = b[6]+c[6]; a[7] = b[7]+c[7];
        return out;
    }
    addeq(x) {return Mat.Add(this,this,x);}
    add(x) {return this.clone().addeq(x);}
    
    // Subtraction
    static Sub(out,x,y) {
        let a = out.a; let b = x.a; let c = y.a;
        a[0] = b[0]-c[0]; a[1] = b[1]-c[1];
        a[3] = b[3]-c[3]; a[4] = b[4]-c[4];
        a[6] = b[6]-c[6]; a[7] = b[7]-c[7];
        return out;
    }
    subeq(x) {return Mat.Sub(this,this,x);}
    sub(x) {return this.clone().subeq(x);}
    
    // Matrix multiplication (composition of transformations)
    static Compose(out,x,y) {
        let a = out.a; let b = x.a; let c = y.a;
        let a0 = Math.fround(b[0]*c[0])+Math.fround(b[3]*c[1]);
        let a1 = Math.fround(b[1]*c[0])+Math.fround(b[4]*c[1]);
        let a3 = Math.fround(b[0]*c[3])+Math.fround(b[3]*c[4]);
        let a4 = Math.fround(b[1]*c[3])+Math.fround(b[4]*c[4]);
        let a6 = Math.fround(Math.fround(b[0]*c[6])+Math.fround(b[3]*c[7]))+b[6];
        let a7 = Math.fround(Math.fround(b[1]*c[6])+Math.fround(b[4]*c[7]))+b[7];
        a[0]=a0;a[1]=a1;a[3]=a3;a[4]=a4;a[6]=a6;a[7]=a7;
        return out;
    }
    composeq(x) {return Mat.Compose(this,x,this);}
    compose(x) {return x.clone().composeq(this);}
    
    /** Operators (Binary, Vector-Valued) **/
    static Transform(out_vec,matrix,vector) {
        let b = out_vec.a; let A = matrix.a; let x = vector.a;
        let b0 = Math.fround(Math.fround(A[0]*x[0]) + Math.fround(A[3]*x[1])) + A[6];
        let b1 = Math.fround(Math.fround(A[1]*x[0]) + Math.fround(A[4]*x[1])) + A[7];
        b[0] = b0; b[1] = b1;
        return out_vec;
    }
    transformeq(vec) {  // A slight break from convention: it's the argument that gets overwritten, because it's what we're transforming.
        return Mat.Transform(vec,this,vec);
    }
    transform(vec) {return this.transformeq(vec.clone());}
    
    /** Operators (Unary, Scalar-Valued) **/
    // Determinant
    static Det(x) {
        let a = x.a;
        // xx*yy - xy*yx
        return Math.fround(Math.fround(a[0]*a[4]) - Math.fround(a[1]*a[3]));
    }
    det() {return Mat.Det(this);}
    
    /** Operators (Unary, Matrix-Valued) **/
    // Matrix inverse. If no inverse exists, outputs the identity matrix.
    static Inv(out,x) {
        let det = Mat.Det(x);
        if (det === 0.0) {
            out.set();
        } else {
            // First, compute adjugate
            let a = x.a;
            let b0 =  a[4]; let b1 = -a[1];
            let b3 = -a[3]; let b4 = a[0];
            let b6 = Math.fround(a[3]*a[7]) - Math.fround(a[4]*a[6]); 
            let b7 = Math.fround(a[1]*a[6]) - Math.fround(a[0]*a[7]); 
            //out.set(b0,b1, b3,b4, b6,b7);
            const b = out.a;
            b[0]=b0;b[1]=b1; b[3]=b3;b[4]=b4; b[6]=b6;b[7]=b7;
            // Then, divide by the determinant to arrive at the inverse
            out.muleq(Math.fround(1 / det));
        }
        return out;
    }
    inveq() {return Mat.Inv(this,this)};
    inv() {return this.clone().inveq()};
}

class Mat extends AbstractMat {
    constructor(xx=1.0,xy=0.0, yx=0.0,yy=1.0, x=0.0,y=0.0) {
        let a = new Float32Array(9); // 3x3, to hand to opengl
        super(a);
        this.set(xx,xy, yx,yy, x,y);
    }
}

function run_math32_tests() {
    function assert_eq(a,b) {
	    if (JSON.stringify(a) !== JSON.stringify(b)) {
		    console.trace(a,"!==",b); // Produces a stack trace
		    return false;
	    }
	    return true;
    }
    
    // Scalar
    let s = new Scalar(10);
    s.set(11);
    assert_eq(s.a[0],11);

    // Matrices and vectors
    let x = new Vec(1.0,2.0);
    let move = new Mat(1.0,0.0, 0.0,1.0, 1.0,0.0);
    let move_inv = move.inv();
    let a = new Mat(1.0,2.0, -0.5,0.25, 4.0,8.0);
    let b = new Mat(0.0,1.0, -1.0,-.0, -1.0,-2.0);
    
    //Composition
    let ab = a.compose(b);
    assert_eq(''+ab.transform(x),''+a.transform(b.transform(x))); // (AB)(x) = A(Bx)

    // Inversion
    assert_eq(''+x,''+move_inv.transform(move.transform(x))); // x = AA^-1 x
    assert_eq(''+a.compose(a.inv()),''+new Mat()); // AA^-1 = I
    assert_eq(''+b.compose(b.inv()),''+new Mat()); // BB^-1 = I
    
    // Algebra
    assert_eq( // +
     ''+(a.add(b)).transform(x),
     ''+ ( a.transform(x).add(b.transform(x)) )
    );
    assert_eq( // -
     ''+(a.sub(b)).transform(x),
     ''+ ( a.transform(x).sub(b.transform(x)) )
    );
    assert_eq(''+a.mul(8.0).transform(x),''+a.transform(x).mul(8.0));

    // Fancy vector methods
    let y = new Vec(1,0);
    assert_eq(''+y.dot(x),'1');
    assert_eq(''+x.cross(x),'0');
    assert_eq(''+y.cross(y),'0');
    assert_eq(''+x.cross(y),'-2');
    
    // Distance and magnitude
    let z = new Vec(3,4);
    assert_eq(''+x.add(z).dist(x), '5');
    assert_eq(''+z.sq(), '25');
    assert_eq(''+z.abs(), '5');
    
    // Normalization and magnitude mapping
    assert_eq((new Vec(100,0)).norm(),new Vec(1,0));
    assert_eq((new Vec(1,0)).mapabs((r) => 100*r), new Vec(100,0));
    
    // Scalar and vector projection
    assert_eq(y.resolute(z),3);
    assert_eq(y.proj(z),new Vec(3,0));
} 
