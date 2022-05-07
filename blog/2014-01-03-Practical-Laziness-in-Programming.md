---
title: Practical Laziness in Programming
tags: [software-engineering]
---

When I first heard about lazy evaluation I thought it was cool but not of much practical use. That is until I thought about it a bit harder.

Laziness improves API design.

I’ll illustrate with a program I wrote to convert Javadoc comments to JSON. I started writing the program in Java and I quickly realized the problem would be easier with lazy evaluation.

Ideally I wanted to do something like:

1. get a list of all the ClassDoc objects (Javadoc documentation on top of a class)
2. convert every entry in the list to a JSON object
3. stringify all the JSON objects
4. write all the strings to different files in parallel

In code:

    List<ClassDoc> docs = getClassDocs();
    List<JSONObject> jsonObjects = toJSON(docs);
    List<String> jsonStrings = stringify(jsonObjects);
    writeAll(jsonStrings);

That is a pretty straightforward sequence of steps but our repository is huge and I wanted to keep memory consumption down so I couldn't just process everything at once. I had to instead do:

1. get a ClassDoc object
2. convert the ClassDoc object to a JSON object
3. stringify the JSON object
4. send the JSON object to an executor service that writes it to a file
5. repeat steps 1-4 until no ClassDoc objects remain

In code:

    while (hasNext()) {
      ClassDoc doc = getNext();
      JSONObject jsonObject = toJSON(doc);
      String jsonString = stringify(jsonObject);
      write(jsonString); // <-- non blocking write so we can write in parallel
    }

Now this doesn't seem like a big deal. After all, only 1 step was added and that step is just looping over the first 4 steps. The problem is that this second approach makes the code less **composable**.

With the first approach I can just return the results of each of my intermediate steps for someone to work with. I.e., I can define each step as a method on my api class and users can compose those methods, or add steps in between them, however they want.

Here is an example:

    // Normal conversion
    api.write(api.stringifyJSON(
        api.toJSON(api.getClassDocs())));

    // Conversion + user's own swag
    api.write(**swag**.addCopyright(
       api.stringifyJSON(**swag**.addCustomProps(api.toJSON(
          api.getClassDocs())))));

As you see in the “conversion + user’s own swag” example, the user can easily add a copyright notice and some custom properties to the JSON just by adding a few extra method calls within and around the normal api calls.

With the looping approach, that composability becomes quite a bit harder to attain. Instead of just having api methods that users can compose on their own, I now need to provide some callback interface and a way for users to inject callbacks to be called at different points in my loop.

E.g.

    while (hasNext()) {
     ClassDoc doc = getNext();
     **callDocCallbacks**(doc);

     JSONObject jsonObject = toJSON(doc);
     **callJsonObjectCallbacks**(jsonObject);

     String jsonString = stringify(jsonObject);
     **callJsonStringCallbacks**(jsonString);

     write(jsonString);
    }

and the api becomes something like:

    api.**registerJsonObjectCallback**(new Callback<JSONObject>() {
      public void apply(JSONObject obj) {
        swag.addCustomProps(obj);
      }
    });
    api.**registerJsonStringCallback**(new Callback<String>(){...});

    api.process();

As you can see this requires work on the API side to call the appropriate hooks and work on the client side to implement the callback interface and register callbacks at the correct points. If I ever add new steps to the process then new hooks need to be added as well.

### What about laziness??

The first approach, without laziness, is going to process every class all at once and execute every step before writing any data or releasing any data from memory. Not good.

Laziness allows the first approach to return lists that never actually contain anything until they are read. That is if my _List<ClassDoc>_ is lazy then it won’t actually contain anything until someone tries to read from it. It’ll use 0 memory.

In other words, if _getClassDocs_, _toJSON_ and _stringify_ are all lazy then all of the following calls:

    List<ClassDoc> classDocs = api.getClassDocs();
    List<JSONObject> jsonObjects = api.toJSON(classDocs);
    List<String> jsonString = api.stringify(jsonObjects);

won’t ever actually do any computation. Since each method is lazy they just return lists that don’t have anything in them until someone tries to read from them. **It’s just like telling your mom you finished your homework but not actually starting your homework until she asks to see it later that night.**

Since lazy lists don’t produce elements until they are read we effectively get all of the benefits of the looping approach (low memory usage) and all the benefits of the composable approach (just working with normal lists).

An objection may be that once you start writing the lazy structures will then consume all memory due to `getClassDocs` returning all docs for all classes in the entire repo. If `getClassDocs` returns an iterable then ideally that shouldn't be the case. The iterable
will return docs in chunks for later stages of the pipeline to process. Those chunks are freed as they are processed as the structure is an `iterable` and not something that retains elements like a `collection` / `list` / `array` etc.

### Great but how can I be lazy on the JVM?

1. Clojure — all map operations are lazy & has lazy sequences

1. Scala — has lazy sequences

1. Write your own iterables which perform lazily

My complete 30 lines of lazy Clojure code that converts Javadoc to JSON can be found [here](https://github.com/tantaman/jsonDoclet/blob/master/src/com/tantaman/doc/JsonDoclet.clj).

Of course you could make the looping approach just as composable as the lazy approach by using the Reactive Extensions for the JVM ([https://github.com/Netflix/RxJava](https://github.com/Netflix/RxJava)) but that is for a later post.
