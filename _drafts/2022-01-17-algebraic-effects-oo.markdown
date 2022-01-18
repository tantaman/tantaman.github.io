Can we use coeffects as an alternative to OO?

E.g.,

> The create(), patch() and arrange() methods are the only places in the module where we perform actual DOM operations. The create() method creates DOM nodes, the patch() method updates their properties and attributes, and the arrange() method manages the insertion and removal of DOM nodes. These methods are defined on the Renderer class because it’s possible that we might want to subclass it for custom DOM behavior, or to render to environments besides the DOM.

Well with coeffects, the functions could declare that the methods provided by the Renderer class be provided, not by the class, but by the calling context instead.

So you can provide sets of functions in the calling context to do this polymorphism rather than subclasses and specific instances of an object the be threaded down as a parameter.

There's much less threading of a parameter if we can use coeffects to declare that the context should provide certain functions.
https://crank.js.org/blog/writing-crank-from-scratch <-- second diff, `renderer` goes through many places only to be used at the leaf of `commit`.
