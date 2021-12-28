import { publisher, atom } from '/assets/js/publisher.js';

function hsvToRgb(h, s, v) {
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

  return [(rp + m) * 255, (gp + m) * 255, (bp + m) * 255];
}

function rgbToHex(r, g, b) {
  const pad = (v) => (v.length === 1 ? '0' + v : v);
  return '#' + pad(r.toString(16)) + pad(g.toString(16)) + pad(b.toString(16));
}

const fieldSize = {
  width: 200,
  height: 150,
};
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
};

const state = atom({ background: rgbToHex(...hsvToRgb(0, 1, 1)) });

{
  const { _md, html } = publisher(document.getElementById('color-field-intro'));
  html(templates.colorField, state);
}

console.log(hsvToRgb(0, 1, 1));
console.log(rgbToHex(...hsvToRgb(0, 1, 1)));
