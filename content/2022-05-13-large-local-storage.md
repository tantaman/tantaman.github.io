---
title: 'Large Local Storage'
tags: [software-engineering, project]
---

Way way back in 2013 there wasn't a common way to save large blobs in all browser. Back then, all of these were true:

* DOMStorage only gives you 5mb
* Chrome doesn't let you store blobs in IndexedDB
* Safari doesn't support IndexedDB,
* IE and Firefox both support IndexedDB but not the FilesystemAPI.

At that time I was also writing [strut.io](https://strut.io) as a side project.

<center>
<video class="frame" width="493" autoplay="" loop="" muted="">
    <source src="https://strut.io/videos/strut-loop-3.h264.avi" type="video/mp4">
    <source src="https://strut.io/videos/strut-loop-3.webm" type="video/webm">
</video>
</center>

[strut.io](https://strut.io) was & is a completely local-first presentation editor hosted in the browser. Given it was local-first I needed a way to save large blobs and given Chromium based browsers had not yet come to dominate the entire browser market, I needed it to work across all browsers.

Enter [`Large Local Storage`](https://github.com/tantaman/LargeLocalStorage) -- my solution to this problem of yester years.

<center>
<blockquote class="twitter-tweet"><p lang="en" dir="ltr">LargeLocalStorage: lets you store a large amount of key-value based data in IE, Chrome, Safari and Firefox. <a href="https://t.co/Vw2CPQ4lso">https://t.co/Vw2CPQ4lso</a></p>&mdash; Smashing Magazine 🇺🇦 (@smashingmag) <a href="https://twitter.com/smashingmag/status/410118699577012224?ref_src=twsrc%5Etfw">December 9, 2013</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
</center>

## Learnings

`LargeLocalStorage` (`LLS`) is certainly no longer needed given `IndexedDB` and the `FilesytemAPI` now have reasonable support in all browsers. There's even a new ["storage foundation"](https://web.dev/storage-foundation/) layer coming for better access to storage from the web. In any case, I think its valuable to keep around as a record of

- What I've done
- Where my interests have always been (to identify [[personal strengths]])
- As learning material (e.g., [[software arhitecture]], patterns for solving similar problems of [[abstracting over concretes]])
- To inspire future ideas in the space.

### Architecture

`LLS` proivded a unified interface for:
- FileSystemAPI
- WebSQL
- IndexedDB
- LocalStorage

It leveraged a [pipeline architecture](./2013-07-30-Inheritance-Aggregation-and-Pipelines) to enable adding plugins such as `caching`, `logging`, `s3 uploads`, and so on.

In other words, I could instantiate a `LargeLocalStorage` instance in my app and then later, as my requirements changed, plug in a caching layer, persistence layer, image optimization layer and on and on.

In code this looked like:

```javascript
const storage = new lls({name: 'strut-db', size: 10 * 1024 * 1024});
Cache.addTo(storage);
S3Persist.addTo(storage);
Logger.addTo(storage);
ImageOptimizer.addTo(storage);
BlobDeDuplication.addTo(storage);
... etc
```

If I rebuilt this today, I probably would have gone for a slightly more ergonomic API and one that doesn't mutate the original instance.

E.g.,

```javascript
const storage = new lls({name: 'strut-db', size: 10 * 1024 * 1024})
  .use(LRUCache)
  .use(S3Persist)
  .use(Logger)
  .use(ImageOptimzer)
  .use(BlobDeDuplication);
```

### Build

Building is quite funny. It literally just concatenated JS files together. So simple 🤣  so naive?

https://github.com/tantaman/LargeLocalStorage/blob/master/Gruntfile.js#L12-L22

### Cosmetics

I'm highly impressed by the [super clean document generation](https://tantaman.com/LargeLocalStorage/doc/classes/LargeLocalStorage.html)

They're generated via [`yuidoc`](https://github.com/yui/yuidoc) which apparently never gained much traction and was abandoned in 2017. It'd be interesting to know why `yuidoc` got so little traction.

![docs](/blog-assets/large-local-storage/docs.png)

 the notion of having [the test suite for a project clickable and executable in a browser](https://tantaman.com/LargeLocalStorage/test/)!!

 
 And a super [simple demo app](https://tantaman.com/LargeLocalStorage/examples/album/)

- [Docs](https://tantaman.com/LargeLocalStorage/doc/classes/LargeLocalStorage.html)
- [Demo App](https://tantaman.com/LargeLocalStorage/examples/album/)
- [Online Test Runner](https://tantaman.com/LargeLocalStorage/test/)
- [Repo](https://github.com/tantaman/LargeLocalStorage)


