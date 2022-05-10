import { publisher, atom } from '/assets/js/publisher.js';

// https://www.rapidtables.com/convert/color/hsv-to-rgb.html

function hsvToRgb(h, s, v) {
  h = h % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rp,
    gp,
    bp = 0;
  // Between 0 and 120 degrees on the color wheel there is no blue
  if (h >= 0 && h < 60) {
    rp = c;
    gp = x;
    bp = 0;
  } else if (h >= 60 && h < 120) {
    rp = x;
    gp = c;
    bp = 0;
  } else if (h >= 120 && h < 180) {
    rp = 0;
    gp = c;
    bp = x;
  } else if (h >= 180 && h < 240) {
    rp = 0;
    gp = x;
    bp = c;
  } else if (h >= 240 && h < 300) {
    rp = x;
    gp = 0;
    bp = c;
  } else if (h >= 300 && h < 360) {
    rp = c;
    gp = 0;
    bp = x;
  }

  return [
    Math.floor((rp + m) * 255),
    Math.floor((gp + m) * 255),
    Math.floor((bp + m) * 255),
  ];
}

function rgbToHsv(r, g, b) {
  const [rp, gp, bp] = [r, g, b].map((x) => x / 255.0);
  const cMax = Math.max(rp, gp, bp);
  const cMin = Math.min(rp, gp, bp);
  const delta = cMax - cMin;

  let hue = 0;
  if (delta === 0) {
    hue = 0;
  } else if (cMax === rp) {
    hue = 60 * (((gp - bp) / delta) % 6);
  } else if (cMax === gp) {
    hue = 60 * ((bp - rp) / delta + 2);
  } else if (cMax === bp) {
    hue = 60 * ((rp - gp) / delta + 4);
  }

  let sat = 0;
  if (cMax === 0) {
    sat = 0;
  } else {
    sat = delta / cMax;
  }

  const value = cMax;

  return [hue, sat, value];
}

function rgbToHex(r, g, b) {
  const pad = (v) => (v.length === 1 ? '0' + v : v);
  return '#' + pad(r.toString(16)) + pad(g.toString(16)) + pad(b.toString(16));
}

const fieldSize = {
  width: 250,
  height: 150,
};
const hues = [0, 60, 120, 180, 240, 300, 360];
const colors = hues.map((h) => rgbToHex(...hsvToRgb(h, 1, 1)));
const hudeGradient = `linear-gradient(90deg, ${colors.join(',')})`;
const templates = {
  colorField: (props) => `
  <div class="colorField" style="width:${fieldSize.width}px; height: ${
    fieldSize.height
  }px;">
    <div class="stretch" style="${'background: ' + props.background}">
      <div class="saturation stretch">
        <div class="value stretch"></div>
      </div>
    </div>
  </div>
  `,
  showingHueEx: (props) => `
  <div class="colorField" style="width:${fieldSize.width}px; height: ${
    fieldSize.height
  }px;">
    <div class="stretch" style="${'background: ' + props.background}"></div>
  </div>
  `,
  hueSliderEx: (props) =>
    `<div style="background: ${hudeGradient}; width: 200px; height: 20px; margin: 0 auto;" class="hueSlider">
      <div class="hueControl" style="left: ${
        props != null ? (props.hue / 360) * 200 : 0
      }px"></div>
    </div>`,
  showingSaturationEx: (props) => `
  <div class="colorField" style="width:${fieldSize.width}px; height: ${
    fieldSize.height
  }px;">
    <div class="stretch" style="${'background: ' + props.background}">
      <div class="saturation stretch">
      </div>
    </div>
  </div>
  `,
  showingValueEx: (props) => `
  <div class="colorField" style="width:${fieldSize.width}px; height: ${
    fieldSize.height
  }px;">
    <div class="stretch" style="${'background: ' + props.background}">
      <div class="value stretch">
      </div>
    </div>
  </div>
  `,
};

let hue = 0;
const state = atom({ background: rgbToHex(...hsvToRgb(hue, 1, 1)) });
const hueState = atom({ hue });

{
  const { _md, html } = publisher(document.getElementById('color-field-intro'));
  html(templates.colorField, state);
}

{
  const { _md, html } = publisher(document.getElementById('hue-slider-ex'));
  html(templates.hueSliderEx, null);
}

{
  const { _md, html } = publisher(document.getElementById('showing-hue-ex'));
  html(templates.showingHueEx, state);
}

{
  const { _md, html } = publisher(document.getElementById('hue-slider-ex2'));
  html(templates.hueSliderEx, hueState);
}
{
  const { _md, html } = publisher(document.getElementById('hue-slider-ex3'));
  html(templates.hueSliderEx, hueState);
}
{
  const { _md, html } = publisher(document.getElementById('hue-slider-ex4'));
  html(templates.hueSliderEx, hueState);
}

{
  const { _md, html } = publisher(
    document.getElementById('showing-saturation-ex'),
  );
  html(templates.showingSaturationEx, state);
}

{
  const { _md, html } = publisher(document.getElementById('showing-value-ex'));
  html(templates.showingValueEx, state);
}

{
  const { _md, html } = publisher(document.getElementById('all-3-ex'));
  html(templates.colorField, state);
}

function step() {
  hue = (hue + 1) % 360;
  state.set({ background: rgbToHex(...hsvToRgb(hue, 1, 1)) });
  hueState.set({ hue });
  requestAnimationFrame(step);
}
requestAnimationFrame(step);
