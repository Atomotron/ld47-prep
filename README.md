# WebGL stuff for Ludum Dare 47

This time our team decided to write our game for the browser, so that it would be easier for people to play. I didn't really like any of the engines I saw out there, and doing things from scratch is more fun, so here is some code that might prove useful to our fellow jammers. Presently, this repo has:

- math32.js : A medium-performance linear algebra library designed for handling the f32 values that WebGL takes in for uniforms. It can be used in both zero-allocation and maximum-convenience modes depending on whether you call the functions with names like `addeq` or the ones like `add` (which allocate).
