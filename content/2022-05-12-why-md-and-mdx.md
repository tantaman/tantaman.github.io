---
title: Why is Markdown a Thing?
tags: [software-engineering]
---

**Why do `Markdown` and `MDX` exist? Why do we even need them?**

**First**, `Markdown` and `MDX` invert our relationship with markup languages. They put the prose, the content, first and the markup second.

**Second**, they're a format that can be written by a human being. The markup characters they use heve even become shortcut keys to apply styles in rich text editors (e.g., google docs, quip, apple notes) without having to click around.

At first glance, these look like great reasons for `Markdown` to take off.

> Puts your prose, your content, ahead of markup? Great.
> 
> Easier to read for a human? Great.

But... how did we even get here? How did we get to the point where these are even acceptable as good reasons? Where the human being writing content needs to be exposed to and versed in the file format used to save their content!? WTF?!

Surely these reasons for success are actually marks of massive failures somewhere else.

They are marks of failure. They're indicative of massive failures in rich text editing software.

Right?

Why else would we need to land in a place where the author of rich text must write in the raw file format of that rich text?

# How Rich Text Editors Failed

In what ways did rich text editing software fail us?

## Portability

One argument is the portability argument. That there was and is no portable rich text format.

The opposition would argue that we do have portable formats for rich text.
- html
- OpenOffice
- pdf

I don't think either one of those is actually portable when it comes to the rich text problem.

### HTML Portability

 `html` is an incredibly portable format for displaying rich text (I know, sounds like a contractiond!). One day everyone on the planet will have a device capable of rendering `html`. The problem with `html`, however, is in its expressiveness and flexibility.

The richness and expressiveness of `html` prevents it from being portable in the authoring space. The reason is that if I write a rich text editor and use `html` as its file format, with the intention of being iteroperable with other editors that use `html` as their format, I now need to support not only rendering but also editing the full range of `html`. Rendering `html` in and of itself is a monumental task. Throw consistent editing into the mix and you're out of luck.

Using `html` as the format is also too open ended. Each node & mark can have additional properties attached to it whose meanings are left to be interpreted by the application.

> (r1) I do think a subset of `html` could have been defined as a portable format for rich text. E.g., restrict ourselves to `<p>`, `<strong>`, `<em>`, `<h1...6>`, etc. This is essentially what markdown targets. So why didn't we end up here?
 
> (r2) The argument around having to support all features of `html` could also be levied against `markdown.` There are a variety of flavors of `markdown` out there. Not all markdown editors support all flavors. We'll have to address this concern as well.

> (r3) but html can be inserted directly into markdown... doesn't this make markdown a superset of html? Not quite given inline html is "second class" within markdown and generally not expected to be surfaced for editing by WYSIWYG editors.

### Open Office

### PDF Portability

`PDF`'s problem isn't so much one of portability but one of it being a bad fit. It was designed to target printers and fixed size documents rather than today's screens and documents that resize to fit the available area.

> (r4) But is not fixed width and/or fixed breaks and typesetting something we want in our rich text? This is something related to google doc's pageless mode and why we've transitioned away from the concept of pages... but we still have fixed widths and font sizes, no?

## Bad Fits

`html`'s complexity makes portability hard but also makes it a bad fit for rich text.

## Enter MDX

MDX works because the components bring with them a notion of their rendering. They also are not editable other than thru changing the parameters provided them. They're immutable blocks.

But why MDX? For inclusion of arbitrary content. HTML _doesn't_ have a component system where opaque blocks are added to a doc.
MDX shines as an advancement here. (something something shadow dom)

# From First Principles
- worse is better
- if you really did create a specific format
- rendering. Target html so all renderings are free.
  - only have to solve the authoring problem...

Create a format for authoring...
- fix on the main use cases
- representation and human readability did not need to coexist though...


# Is Markdown Where you would have landed if you designed a format from first principles?