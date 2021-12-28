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
2. The Hue slider
3. The HSV field
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

# The Hue Slider

Hue is derived from the color wheel and ranges between the values of 0 and 360. To display all available hues to a user, we can set up a gradient with color points at different values between 0 and 360.

```js
const hues = [0, 60, 120, 180, 240, 300, 360];
const colors = hues.map((h) => rgbToHex(...hsvToRgb(h, 1, 1)));
const background = `linear-gradient(90deg, ${colors.join(',')})`;

`<div style="background: ${background};"></div>`;
```

<div id="hue-slider-ex"></div>

Knowing which hue the user selected is fairly straightforward. Divide the `layerX` of the event by the width of the hue slider. This gives you a value between `0` and `1` of where you are within the slider. Multiply that by `360` and you have your hue.

# The HSV Field

<div id="color-field-intro"></div>

The HSV field shows a single hue and allows the user to adjust the saturation and value being applied to that hue.

Using CSS and the concepts of HSV defined earlier, we can build this with three layered divs. The first to display the hue, the second to show the saturation of the hue along a gradient and the third to show the value of the hue along a gradient.

## Showing Hue

First, we need to place the hue. Given hue is "pure pigment", we display this as a surface of a single color.

```html
<div style="background-color: HUE;"></div>
```

<div id="showing-hue-ex"></div>

## Showing Saturation

Remember that sturation is the intensity of the color. To show saturation, we can layer a div with a gradient on top of the hue div.

## Showing Value
