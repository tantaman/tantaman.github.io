---
layout: post
title: 'Writing a Color Picker From Scratch'
tags: software-engineering demo
jsmodules:
  - /assets/posts/color-picker-from-scratch/color-field.js
css:
  - /assets/posts/color-picker-from-scratch/color-field.css
---

We'll skip the why you'd want to do this and just jump into the how.

I'll break this down into a few parts:

1. Basic color theory
2. The HSV field
3. The Hue slider
4. Generating Swatches

# Basic Color Theory

Color isn't just a single thing. It is made up of components. Rather than thing in terms of "RGB", color is more accessible when we think of it in terms of "HSV" or Hue, Saturation and Value.

## Hue

> "the degree to which a stimulus can be described as similar to or different from stimuli that are described as red, orange, yellow, green, blue, violet,"

I think of hue as being the pure pigment, before any lighting has been applied and before that pigment has been added to a surface.

## Value

Value refers to the lightness or darkness of a color. You can think of this as taking a hue and then mixing an amount of white or black with it.

## Saturation

Saturation is the intesnity of the color. You can think of this in terms of how much of the hue has been spread out over a surface. The more hue per surface area, the higher the saturation.

We'll return to these concepts, and explain them further, as we build out the color picker.

# The HSV Field

<div id="color-field-intro" />

The first component of a color picker I call the HSV field. This shows a single hue and allows the user to adjust the saturation and value being applied to that hue.

Using CSS, and the concepts of HSV defined earlier, we can build this in a pretty straightforward way.

## Adding Hue

First, we need to place the hue. Given hue as "pure pigment", we display this as a surface of a single color.

<div id="adding-hue" />
