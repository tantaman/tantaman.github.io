---
title: The Almighty Function
tags: [software-engineering]
---

> Objects are a poor man’s closures. Closures are a poor man’s objects.

Some people say everything is an object. I used to too but these days I think everything is actually a function.

1. A map? Isn’t that just a function that maps from one value to another?
2. An array? Well that can be thought of as a map which can be thought of as a function.
3. An object? Those are just partial functions that return functions.

Lets take a closer look. <!--truncate-->Here is a **pair implemented as a function**. It is implemented in Javascript for illustration purposes.

    var pairCreator = function(first, second) {
      var first, second;
      return function(which) {
        return which == 0 ? first : second;
      }
    }
    var pair = pairCreator('hello', 'there');
    console.log(pair(0) + ' ' + pair(1));

How do we implement an **object as a function**? Well it is pretty similar to the pair example.

    var MyObjConstructor = function(greeting) {
      var greet = function() {
        console.log(greeting);
      }
      var leave = function() {
        ...
      }
      return function(method) {
        switch(method) {
          case 'greet':
            return greet;
          case 'leave':
            return leave;
        }
      }
    }
    var obj = MyObjConstructor("hello there");
    obj('greet')(); // call the greet method
    var leave = obj('leave'); // save a pointer to the leave method

Of course you wouldn’t ever really want to implement an object like that in Javascript ;)

It is an interesting thought experiment to try to look at everything as a function. It’ll get you to design your software in new ways and to find entirely new applications for closures.

> The venerable master Qc Na was walking with his student, Anton. Hoping to prompt the master into a discussion, Anton said** “Master, I have heard that objects are a very good thing — is this true?”** Qc Na looked pityingly at his student and replied, **“Foolish pupil — objects are merely a poor man’s closures.”**
>
> Chastised, Anton took his leave from his master and returned to his cell, intent on studying closures. He carefully read the entire “Lambda: The Ultimate…” series of papers and its cousins, and implemented a small Scheme interpreter with a closure-based object system. He learned much, and looked forward to informing his master of his progress.
>
> On his next walk with Qc Na, Anton attempted to impress his master by saying **“Master, I have diligently studied the matter, and now understand that objects are truly a poor man’s closures.”** Qc Na responded by hitting Anton with his stick, saying **“When will you learn? Closures are a poor man’s object.”** At that moment, Anton became enlightened.

[http://people.csail.mit.edu/gregs/ll1-discuss-archive-html/msg03277.html](http://people.csail.mit.edu/gregs/ll1-discuss-archive-html/msg03277.html)
