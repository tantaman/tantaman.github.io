---
layout: post
title:  "Fk Your Frameworks"
tags: programming frameworks js
---

I've been writing web-apps for a long time and writing code for longer.

I started writing PHP in middleschool. Editing `.ini`'s to get stuff running on my windows box, learning about [mod_php](https://www.php.net/manual/en/security.apache.php) vs [CGI](https://en.wikipedia.org/wiki/Common_Gateway_Interface) vs [fast-cgi](https://en.wikipedia.org/wiki/FastCGI) in the Apache webserver days.

My first website was a calendaring app for our family to track events and my dad to track business meetings.

Looking back on it, PHP was well positioned to be accessible to a middle schooler.

# Request Model

The simplicity of PHP starts with it's request model. On every web request, the entire world is re-built. There is no persisted state from prior requests.

This "rebuild the world" approach has some great properties that make PHP accessible to newbies:
1. Limited impact of resource leaks
2. Single source of truth
3. Idempotence

## Leaks

"Rebuild the world" eliminates a whole host of problems, suchs as resource and memory leaks. Yes, we could leak resources in the current request but web requests are generally tiny and quick. By the time the leaks start to matter, your request is already over and everything has been cleaned up. A leak in one request won't bleed into and impact a later request.

> **Side note:** obviously leaks (and resource consumption in general) in a request will take resources away from other requests that are running at the same time. But we're concerned with accessibility of development environments and languages in this article, not high-scale deployments. If high-scale deployments were always top of mind for developers, `Facebook` wouldn't have been written in `PHP`, `Instagram` wouldn't have been written in `Python`, `Github` wouldn't have been writtin in `Rails`. Of course there are ways to scale all of these choices which we can digress into at a later date.

Compare this request model to say an Express or Java app. In those environment, every request can add something to the process's memory which will stick around and continue takig up resources for all future requests.

## Single Source of Truth

A side-effect of "rebuild the world" is that there is a single source of truth for your data.

After college, my first set of applications on the job were thick clients written in Java Swing.

# Types

# Templating

# Routing
per file makes it cleaner?

#


What is the cost of all of this accessibility?
Programs that don't scale under any of:
1. more load
2. more developers developing
3. requirements changes

--
apps:
--
* Calendaring program for my dad to save appointments
* Bluepay Payment API updates for compatibility with PHP 4!
* A website to book exotic dancers for private parties (I was in highschool at this point) -- https://web.archive.org/web/20041124042322/http://www.geministripping.com/
* A website to look over student schedules and find conflicts, missing pre-requesites, etc.
*


--
Make this an article about accessible languages and framworks?
Then climb the mountain showing the deficiencies of this accessibility and the solutions:
1. static types
2. caches, in-process cache
3. request pinning
4. asyncio
5. templating or not?
6. JS and Classes later?
