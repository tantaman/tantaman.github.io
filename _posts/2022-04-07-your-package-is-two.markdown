---
layout: post
title: 'Your One Package Might Be Two'
tags: software-engineering
---

When creating a software package (or module or bundle, pick your term) for others to reuse, there's often a _second_ package in the package that developers overlook.

The second package is the _interface_ package. I.e., the interface that overlays the specific implementation that is your package.

As an example, I might provide a codegen package. The `CodegenFile`, `CodegenStep`, `CodegenPipeline` and such classes comprise the interface of that package. All the other things are implementation details.

In many cases it would benefit the author to move the inetrface into its own separate package.

## Why?

1. Moving the interface out lets developers create alternative implementations of the interface.
2. Moving the interface out lets other packages depend on types from the interface without having to depend on the entire implementation package, which could be large

The second point is useful for cases where an extension consumes outputs of a package but doesn't need to actually run that package. Maybe the outputs come from somewhere else over the wire or are read from disk rather than being a direct invocation of the implementation.