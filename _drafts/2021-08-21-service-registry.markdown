---
layout: post
title: 'A Collection of Capabilities'
tags: software capabilities
---

How do we build an application as a collection of capabilities that can be swapped in and out to create different experiences?

If you want an application that is a presentation editor when one set of capabilities are available, a text editor with a different set and a blog authoring platform with a third set.

Or maybe the experience is always the same but the set of capabilities needs to vary based on where it'll be deployed. Deployed in a browser an uses REST APIs for storage vs deployed locally and uses the filesystem API.

# The ways:
1. Branching & Forking
2. Conditionals in the capabilities themselves
3. Import re-mapping
4. Whiteboard pattern / (features + service registration + startup)
