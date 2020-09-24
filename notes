# Wed 23 Sep 2020 05:08:33 PM CDT

## Things the engine needs to do:

Input:
- Mouse and keyboard status tracking
- Mouse pos to screen coordinates
- Sensible mouseup/mouseout handling

Resources:
- Image loading with resolution options
- Sound
- Callback for when fully loaded

Sound:
- Load with <audio> elements so that it works on-disk. (?)

Display:
- Resizable canvas with the right number of pixels and a program-fixed aspect ratio.

## math32

I spent a lot of time typing out the Scalar class, but we really want stack-allocated f32 to be the default.
I am going to change Vec to work with stack numbers. Scalar will end up with mostly a storage role to play.
I have profiled to check, and Firefox does actually benefit from Math.fround(). It seems to be able to do
this across function boundaries (both arguments and return values.) 

# Tue 22 Sep 2020 07:45:38 PM CDT

Ideas:
- f32 math library with zero allocation support
- matrix multiplication optimizer
- draw order optimizer
- learn module syntax

## ZAf32

JS needs hand-holding to get f32 arithmetic instead of constant conversions to f64. 
WebGL has no f64 uniforms, meaning that everything has to be f32.
It would be more efficient to do all math in f32 than it would be to convert.

The highest performance can be obtained by writing things like this,
    add(out,a,b)
But that is annoying. Slightly less general (?) performance can be obtained with something like,
    a.addeq(b)
And of course, the least annoying option in all cases is,
    a.add(b)

## Matrix multiplication optimizer

Given several matrix products that must be computed every frame,
    e.g.    ABCD,BCD,ABC
and also bearing in mind that many of the matrices do not change,
it would be nice to have an optimizer that took advantage of the
associative property to update everything in the ideal order.

In this case, I think it would be:
-   BC = B*C
-   ABC = A*BC
-   BCD = BC*D
-   ABCD = A*BCD

where of course, products of unchanged matrices were not recomputed.
The ideal sequence probably depends on the "hotness" of the matrices.

## Draw order optimizer

Things on top should be drawn first so z-buffer fragment culling can prevent
things lower down from being drawn. Things with the same shader should be batched
together because swapping out shaders is slow. Things with the same textures
should also be batched together, because of caches.

## EC6 Module Syntax

import and export don't seem to hard to use, but,
"Last but not least, let's make this clear — module features are imported into the scope of a single script — they aren't available in the global scope. Therefore, you will only be able to access imported features in the script they are imported into, and you won't be able to access them from the JavaScript console, for example. You'll still get syntax errors shown in the DevTools, but you'll not be able to use some of the debugging techniques you might have expected to use."
- MDN

That sounds like a pain so for now I won't use them.
