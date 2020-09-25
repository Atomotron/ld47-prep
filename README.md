# Web stuff for Ludum Dare 47

This time our team decided to write our game for the browser, so that it would be easier for people to play. I didn't really like any of the engines I saw out there, and doing things from scratch is more fun, so here is some code that might prove useful to our fellow jammers. Presently, this repo has:

- math32.js : A medium-performance linear algebra library designed for handling the f32 values that WebGL takes in for uniforms. It can be used in both zero-allocation and maximum-convenience modes depending on whether you call the functions with names like `addeq` or the ones like `add` (which allocate). See all those places I used `Math.fround`? Apparently that tells the JIT that it can use f32 operations. I checked with profiling and it's actually about 10-20% faster! You can read about it (here)[https://blog.mozilla.org/javascript/2013/11/07/efficient-float32-arithmetic-in-javascript/]. Benjamin Bouvier put the optimization in Firefox. Hopefully that new JIT that they're about to release still has it! (I heard they were tracking less type information...)

## Other stuff

You can see a log of all my bad ideas in `notes`. Also there's the start of something about webGL audio in `audiodemo.html.` The Negentropy mp3 which I'm using as a test file was written by the very cool [Chad Crouch](https://freemusicarchive.org/music/Chad_Crouch/Arps/Negentropy).  
