---
layout: post
title: 'Understanding Color by Writing a Color Picker'
tags: software-engineering demo
jsmodules:
  - /assets/posts/color-picker-from-scratch/color-field.js
css:
  - /assets/posts/color-picker-from-scratch/color-field.css
---

> "Programmers re-invent the wheel so they can understand how the wheel works" - unknown

Why write a color picker from scratch? To understand color theory better and to realize that color pickers are actually pretty simplistic.

To understand how to convert user events to colors, you first need to understand a little bit of color theory.

# Basic Color Theory

Color isn't just a single thing. It is made up of components. You could think in terms of "RGB" but color is more accessible when we think of it in terms of "HSV" or Hue, Saturation and Value. HSV conceives color in more human terms.

## Hue

Hue can be thought of as pure pigment. This is the pigment before any lighting has been applied and before that pigment has been spread out over a surface.

## Value

Value is how much or little lighting has been applied to the hue (pure pigment). It there is no light shining on a hue, it appears black. If the hue is perfectly lit, it appears as its true color. Same as when the lights are turned on or off in a room.

No lights? Everything is black. Evenly lit? Everything appears its proper color.

## Saturation

Saturation is the intesnity of the color. You can think of this in terms of how much of the hue has been spread out over a surface. The more hue per surface area, the higher the saturation.

Another way to think of this is if you put a tiny amount of paint on a brush and painted a giant wall or a ton of paint on a brush and painted a small wall. The first wall is less saturated with the hue, the second wall is very saturated.

Now that you understand HSV, lets see how to apply them to create a color picker.

# The Hue Slider

Hue, as a value, ranges between 0 and 360. This is because hue was originally formalized using the analogy of a color wheel. Each angle of the wheel being a different hue. To display all available hues to a user using CSS, we can set up a gradient with color points at different values between 0 and 360.

```jsx
const hues = [0, 60, 120, 180, 240, 300, 360];
const colors = hues.map((h) => rgbToHex(...hsvToRgb(h, 1, 1)));
const background = `linear-gradient(90deg, ${colors.join(',')})`;

<div style={`background: ${background};`}></div>;
```

<div id="hue-slider-ex"></div>

Knowing which hue the user selected is fairly straightforward. Divide the `layerX` of the mouse event by the width of the hue slider. This gives you a value between `0` and `1` of where you are within the slider. Multiply that by `360` and you have your hue.

# The HSV Field

<div id="color-field-intro"></div>
<div id="hue-slider-ex2"></div>

The HSV field shows a single hue and allows the user to adjust the saturation and value being applied to that hue.
Above is a final example of the HSV field, displaying rotating hues.

So how do you build that field?

Using CSS and the concepts of hue, saturation & value defined earlier, we can create this with three layered divs. The first to div display the hue, the second to show the saturation of the hue along a gradient and the third to show the value of the hue along a gradient.

## Showing Hue

First, we need to place the hue. Given hue is "pure pigment", we display this as a surface of a single hue.

To do this, we convert the hue selection (0 to 360) at max saturation and value (1 & 1) to a color in RGB space. See my post on converting color models for more details or [see the source of these functions](https://github.com/tantaman/tantaman.github.io/blob/master/assets/posts/color-picker-from-scratch/color-field.js#L5-L76).

```jsx
<div style={`background-color: ${rgbToHex(...hsvToRgb(HUE, 1, 1))};`}></div>
```

<div id="showing-hue-ex"></div>
<div id="hue-slider-ex3"></div>

## Showing Saturation

Remember that sturation is the intensity of the color. To show saturation, we layer a div with a gradient on top of the hue div.

```jsx
<!-- hue div -->
<div style={`background-color: ${rgbToHex(...hsvToRgb(HUE, 1, 1))};`}>
  <!-- saturation div -->
  <div style="background: background-image: linear-gradient(to right, #fff, rgba(255, 255, 255, 0));"></div>
</div>;
```

<div id="showing-saturation-ex"></div>

The gradient changes from opaque white to completely transparent. This mirrors no pigment being applied (opaque white) to full application of pigment by filtering out how much of the hue div shows through.

```
linear-gradient(to right, #fff, rgba(255, 255, 255, 0));
```

To convert a user's mouse event within the field, we can divide the event's layerX by the width of the field. This gives us a number between 0 and 1 that perfectly maps to the range of saturation.

## Showing Value

Value is the amount of light being applied to the hue. We can simulate this by overlaying a div with a gradient that shifts from black to transparent.

```jsx
<!-- hue div -->
<div style={`background-color: ${rgbToHex(...hsvToRgb(HUE, 1, 1))};`}>
  <!-- value div -->
  <div style="background: background-image: linear-gradient(to top, #000, rgba(255, 255, 255, 0));"></div>
</div>;
```

<div id="showing-value-ex"></div>

We go from bottom to top (instead of left to right) in this case so the user can select value in one axis and saturation in another.

To convert a mouse event with the field to a value, we can divide `height - event's layerY` by the height of the field. This gives us a number between 0 and 1 that perfectly maps to the range of value.

## Combinding Saturation, Hue & Value

The last step for the field is to layer all 3 divs.

```jsx
<!-- hue div -->
<div style={`background-color: ${rgbToHex(...hsvToRgb(HUE, 1, 1))};`}>
  <!-- saturation div -->
  <div style="background: background-image: linear-gradient(to right, #fff, rgba(255, 255, 255, 0));">
    <!-- value div -->
    <div style="background: background-image: linear-gradient(to top, #000, rgba(255, 255, 255, 0));"></div>
  </div>
</div>;
```

<div id="all-3-ex"></div>
<div id="hue-slider-ex4"></div>

# A Workable Component

Now you can see why converting RGB to HSV makes authoring a color picker quite a bit easier and how we can use the concepts of HSV to give a user control of all the variables that go into making a color.

I'll leave it as an exercise to the reader to combine all of these into a workable component as that involves the familiar work of attaching mouse and drag listeners, converting coordinates to ratios and plugging the results into [`hsvToRgb(hue, saturation, value)`](https://github.com/tantaman/tantaman.github.io/blob/master/assets/posts/color-picker-from-scratch/color-field.js#L5-L76) to get back the RGB representation of the color.

<div id="end-ex"></div>

As always the source is available on Github -- [https://github.com/tantaman/tantaman.github.io/tree/master/assets/posts/color-picker-from-scratch](https://github.com/tantaman/tantaman.github.io/tree/master/assets/posts/color-picker-from-scratch)
