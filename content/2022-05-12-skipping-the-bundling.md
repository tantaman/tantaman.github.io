---
title: 🧶 Skipping the Bundling
tags: [software-engineering]
---

We're in the era of [ES6 modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules), [esm.sh](https://esm.sh) and [Typescript](https://www.typescriptlang.org/).

Do you _really_ need to spin up that [webpack](https://webpack.js.org/)/[snowpack](https://www.snowpack.dev/)/[rollup](https://rollupjs.org/guide/en/)/[vite](https://vitejs.dev/)/[parcel](https://parceljs.org/)/_insert other bundler here_ for your small scale project?

I think not. These days, module management is built right into the language of `JavaScript`. `JSX` is also so widely used that `Typescript` transpiles it for you by default, removing another responsibility from bundling tools.

> The emphasis on **small scale** is important. If you have hundreds of files that all need importing this would require many round trips to the server as all imports are not known ahead of time, but only as the browser processes a file and sees more import statements.

Need to import React?

```javascript
import React from "https://esm.sh/react"
```

How about react-query?

```javascript
import { QueryClient } from 'https://esm.sh/react-query'
```

You can do this for module that exists in the `NPM` registry and uses the `ESM` format or any `ESM` file that exists on your webserver.

This blog is actually built this way. No bundlers were used and all dependencies are imported via url. Either from [tantaman.com](https://tantaman.com) or from [esm.sh](https://esm.sh).

Some bunlders (like Vite) are a pleasure to use but if you're doing something small (like a personal blog), might as well skip them altogether. You can always add them back pretty easily if/when you need them. [[yagni]]

---
While writing this I found a similar article on LogRocket from 2019: [Building without Bundling](https://blog.logrocket.com/building-without-bundling/)