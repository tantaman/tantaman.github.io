---
slug: 2022-01-09-improving-code-sharing
title: 'Improving Code Sharing with Yarn Workspaces'
tags: [software-engineering, sharing-code]
---

Sharing code between `JavaScript` & `TypeScript` projects has always been more trouble than it should be.<!--truncate-->

Say you create a common library and you want to use it in `N > 1` of your other projects.

You could publish it to [`NPM`](https://www.npmjs.com/) and install it like any other dependency. This works ok but definitely not if you're still frequently iterating on your shared library. If that's the case, you start hitting a bunch of friction:

1. Having to switch repos and working sets to make changes to the shared library
2. Having to create and deploy a new package for the shared library after each update. This is [overly complicated](https://medium.com/@debshish.pal/publish-a-npm-package-locally-for-testing-9a00015eb9fd).
3. Having to upgrade the dependency on the library across all projects that use it

The remedy this, what I've ended up doing in the past is installing my common libraries as [`git submodules`](https://git-scm.com/book/en/v2/Git-Tools-Submodules) rather than `npm packages`. This lets me have the source of my shared libraries in my current working tree for easy browsing, editing and comitting. Having the full source in my current project and depending on that, rather than an `npm package`, also means there's no re-packaging, re-deploying, or upgrading steps to go through after modifying the common library.

```
- app
  |+ src
  |- git_modules
     |+ common_lib_1
     |+ common_lib_2
```

There are still drawbacks to this approach, however.

1. Managing dependencies of sub-modules. E.g., If the common libs have their own `node_modules` those can conflict with the parent project's node modules or cause duplicate copies of the same code to be loaded.
2. Imports. I generally end up having to add a bunch of import aliases in my root project to get things seeing one another.
3. Building. Some packages may require a build step prior to be usable.

# Yarn Workspaces

`Yarn Workspaces` solve (1) & (2) from above.

Yarn Workspaces makes `Yarn` aware that all of the packages within the working tree are being used in the same application.

This allows me to
(1) keep the source of my dependencies close by by using them as `git submodules`
(2) install all required packages, without conflicts, in a single `yarn install` run
(3) refer to the packages provided by my `git submodules` just as if they were installed as normal `node_modules`

Perfect!

If your dependencies, as `git submodules`, require special build steps you can look into something like [`TurboRepo`](https://turborepo.org/) to manage those. I've not yet looked into this myself as [`Parcel`](https://parceljs.org/), with its 0 config principles, has fit the bill just fine.

## From the [Yarn website](https://classic.yarnpkg.com/lang/en/docs/workspaces/):

### Why would you want to do this?

- Your dependencies can be linked together, which means that your workspaces can depend on one another while always using the most up-to-date code available. This is also a better mechanism than yarn link since it only affects your workspace tree rather than your whole system.
- All your project dependencies will be installed together, giving Yarn more latitude to better optimize them.
- Yarn will use a single lockfile rather than a different one for each project, which means fewer conflicts and easier reviews.
