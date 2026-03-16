// content/pages/artifacts/attention-fields.jsx
import { useState, useRef, useEffect, useCallback } from "https://esm.sh/react";
import { jsx, jsxs } from "https://esm.sh/react/jsx-runtime";
var NUM_ANGLES = 72;
var TWO_PI = Math.PI * 2;
var ANGLE_STEP = TWO_PI / NUM_ANGLES;
var SIGMA = 0.45;
var EXTENSION = 0.55;
var NOISE_AMP = 0.05;
var ASPECT = 0.625;
var PLAY_SPEED = 6 / 30;
var BG = "#0e0e0e";
var HUES = {
  M: 340,
  D: 220,
  B: 45,
  F1: 150,
  F2: 270,
  F3: 180,
  N1: 25,
  N2: 195,
  W1: 250,
  W2: 10
};
var LABELS = {
  M: "M",
  D: "D",
  B: "B",
  F1: "F\u2081",
  F2: "F\u2082",
  F3: "F\u2083",
  N1: "N\u2081",
  N2: "N\u2082",
  W1: "W\u2081",
  W2: "W\u2082"
};
var STAGES = [
  {
    label: "Birth",
    short: "Birth",
    age: 0,
    note: "A child arrives with a nature not yet known to anyone",
    persons: {
      M: { x: 0.42, y: 0.33, r: 0.095, att: { D: 0.7, B: 0.9 } },
      D: { x: 0.58, y: 0.33, r: 0.085, att: { M: 0.7, B: 0.85 } },
      B: { x: 0.5, y: 0.58, r: 0.035, att: { M: 0.6, D: 0.5 } }
    }
  },
  {
    label: "Early Childhood",
    short: "Early",
    age: 4,
    note: "The world is the family; the family is the world",
    persons: {
      M: { x: 0.38, y: 0.3, r: 0.09, att: { D: 0.6, B: 0.85 } },
      D: { x: 0.62, y: 0.3, r: 0.085, att: { M: 0.6, B: 0.75 } },
      B: { x: 0.5, y: 0.53, r: 0.055, att: { M: 0.8, D: 0.7 } }
    }
  },
  {
    label: "Elementary School",
    short: "School",
    age: 8,
    note: "New fields pull attention in new directions",
    persons: {
      M: { x: 0.25, y: 0.28, r: 0.08, att: { D: 0.5, B: 0.65 } },
      D: { x: 0.38, y: 0.24, r: 0.075, att: { M: 0.5, B: 0.55 } },
      B: { x: 0.45, y: 0.5, r: 0.065, att: { M: 0.5, D: 0.45, F1: 0.5, F2: 0.4 } },
      F1: { x: 0.65, y: 0.52, r: 0.055, att: { B: 0.5, F2: 0.3 } },
      F2: { x: 0.75, y: 0.42, r: 0.05, att: { B: 0.35, F1: 0.3 } }
    }
  },
  {
    label: "Middle School",
    short: "Middle",
    age: 12,
    note: "The peer group becomes a second gravity",
    persons: {
      M: { x: 0.18, y: 0.25, r: 0.07, att: { D: 0.5, B: 0.5 } },
      D: { x: 0.28, y: 0.22, r: 0.065, att: { M: 0.5, B: 0.4 } },
      B: { x: 0.42, y: 0.5, r: 0.075, att: { M: 0.3, D: 0.25, F1: 0.65, F2: 0.6, F3: 0.5 } },
      F1: { x: 0.62, y: 0.45, r: 0.06, att: { B: 0.55, F2: 0.4, F3: 0.35 } },
      F2: { x: 0.72, y: 0.38, r: 0.055, att: { B: 0.5, F1: 0.4, F3: 0.3 } },
      F3: { x: 0.67, y: 0.58, r: 0.05, att: { B: 0.45, F1: 0.35, F2: 0.3 } }
    }
  },
  {
    label: "High School",
    short: "HS",
    age: 16,
    note: "Not imitation \u2014 convergence on what the shared world makes glow",
    persons: {
      M: { x: 0.12, y: 0.25, r: 0.065, att: { D: 0.5, B: 0.4 } },
      D: { x: 0.22, y: 0.22, r: 0.06, att: { M: 0.5, B: 0.35 } },
      B: { x: 0.38, y: 0.5, r: 0.08, att: { M: 0.2, D: 0.15, F1: 0.7, F2: 0.65, F3: 0.55 } },
      F1: { x: 0.58, y: 0.42, r: 0.065, att: { B: 0.65, F2: 0.5, F3: 0.45 } },
      F2: { x: 0.68, y: 0.38, r: 0.06, att: { B: 0.55, F1: 0.5, F3: 0.4 } },
      F3: { x: 0.63, y: 0.55, r: 0.055, att: { B: 0.5, F1: 0.45, F2: 0.4 } }
    }
  },
  {
    label: "College",
    short: "College",
    age: 20,
    note: "The prior begins to form \u2014 others learn how to read you",
    persons: {
      M: { x: 0.1, y: 0.22, r: 0.06, att: { D: 0.5, B: 0.35 } },
      D: { x: 0.2, y: 0.2, r: 0.055, att: { M: 0.5, B: 0.3 } },
      B: { x: 0.42, y: 0.48, r: 0.085, att: { M: 0.15, D: 0.12, N1: 0.65, N2: 0.55 } },
      N1: { x: 0.62, y: 0.45, r: 0.06, att: { B: 0.6, N2: 0.4 } },
      N2: { x: 0.72, y: 0.52, r: 0.055, att: { B: 0.5, N1: 0.4 } }
    }
  },
  {
    label: "Early Career",
    short: "Career",
    age: 26,
    note: "Being understood becomes being trapped",
    persons: {
      M: { x: 0.1, y: 0.2, r: 0.055, att: { D: 0.5, B: 0.3 } },
      D: { x: 0.2, y: 0.18, r: 0.05, att: { M: 0.5, B: 0.25 } },
      B: { x: 0.4, y: 0.42, r: 0.085, att: { M: 0.12, D: 0.1, N1: 0.45, W1: 0.5, W2: 0.4 } },
      N1: { x: 0.6, y: 0.32, r: 0.055, att: { B: 0.4 } },
      W1: { x: 0.55, y: 0.65, r: 0.055, att: { B: 0.45, W2: 0.4 } },
      W2: { x: 0.68, y: 0.7, r: 0.05, att: { B: 0.35, W1: 0.4 } }
    }
  }
];
var MAX_T = STAGES.length - 1;
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}
function angleDist(a, b) {
  let d = Math.abs(a - b) % TWO_PI;
  return d > Math.PI ? TWO_PI - d : d;
}
function gaussian(x, sigma) {
  return Math.exp(-(x * x) / (2 * sigma * sigma));
}
function hsl(id, alpha) {
  const h = HUES[id] || 0;
  return `hsla(${h}, 50%, 52%, ${alpha})`;
}
function lerpAtt(a, b, t) {
  const result = {};
  const keys = /* @__PURE__ */ new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const v = lerp(a && a[k] || 0, b && b[k] || 0, t);
    if (v > 0.01)
      result[k] = v;
  }
  return result;
}
function lerpPerson(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    r: lerp(a.r, b.r, t),
    op: lerp(a.op !== void 0 ? a.op : 1, b.op !== void 0 ? b.op : 1, t),
    att: lerpAtt(a.att, b.att, t)
  };
}
function interpolate(tVal) {
  const clamped = Math.max(0, Math.min(tVal, MAX_T));
  const idx = Math.min(Math.floor(clamped), MAX_T);
  const frac = smoothstep(clamped - idx);
  const sA = STAGES[idx];
  const sB = STAGES[Math.min(idx + 1, MAX_T)];
  const allIds = /* @__PURE__ */ new Set([...Object.keys(sA.persons), ...Object.keys(sB.persons)]);
  const persons = {};
  for (const id of allIds) {
    const a = sA.persons[id];
    const b = sB.persons[id];
    if (a && b) {
      persons[id] = lerpPerson(a, b, frac);
    } else if (a) {
      persons[id] = lerpPerson(a, { ...a, op: 0, r: a.r * 0.3 }, frac);
    } else {
      persons[id] = lerpPerson({ ...b, op: 0, r: b.r * 0.3 }, b, frac);
    }
  }
  let note = "";
  let noteAlpha = 0;
  for (let i = 0; i <= MAX_T; i++) {
    const a = Math.max(0, 1 - Math.abs(clamped - i) * 2.5);
    if (a > noteAlpha) {
      noteAlpha = a;
      note = STAGES[i].note || "";
    }
  }
  return { persons, note, noteAlpha };
}
function blobPoints(person, id, all, W, H, time) {
  const px = person.x * W;
  const py = person.y * H;
  const baseR = person.r * W;
  const seed = (HUES[id] || 0) * 0.1;
  const pts = [];
  for (let i = 0; i < NUM_ANGLES; i++) {
    const theta = i * ANGLE_STEP;
    let r = baseR;
    const att = person.att || {};
    for (const [tid, weight] of Object.entries(att)) {
      const target = all[tid];
      if (!target || (target.op || 0) < 0.01)
        continue;
      const tx = target.x * W;
      const ty = target.y * H;
      const dx = tx - px;
      const dy = ty - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1)
        continue;
      const ang = Math.atan2(dy, dx);
      const ew = weight * (target.op !== void 0 ? target.op : 1);
      r += ew * EXTENSION * dist * gaussian(angleDist(theta, ang), SIGMA);
    }
    let n = 0;
    for (let k = 1; k <= 4; k++) {
      n += Math.sin(k * theta + seed * k * 1.7 + time * 4e-4 * k) * NOISE_AMP / k;
    }
    r *= 1 + n;
    r = Math.max(r, baseR * 0.3);
    pts.push({ x: px + r * Math.cos(theta), y: py + r * Math.sin(theta) });
  }
  return pts;
}
function smoothPath(ctx, pts) {
  const n = pts.length;
  if (n < 3)
    return;
  ctx.beginPath();
  const mx0 = (pts[n - 1].x + pts[0].x) / 2;
  const my0 = (pts[n - 1].y + pts[0].y) / 2;
  ctx.moveTo(mx0, my0);
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    ctx.quadraticCurveTo(
      pts[i].x,
      pts[i].y,
      (pts[i].x + pts[next].x) / 2,
      (pts[i].y + pts[next].y) / 2
    );
  }
  ctx.closePath();
}
function draw(ctx, state, W, H, time) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  const { persons, note, noteAlpha } = state;
  const ids = Object.keys(persons).sort((a, b) => {
    if (a === "B")
      return 1;
    if (b === "B")
      return -1;
    return 0;
  });
  for (const id of ids) {
    const p = persons[id];
    if (p.op < 0.01)
      continue;
    const pts = blobPoints(p, id, persons, W, H, time);
    smoothPath(ctx, pts);
    ctx.fillStyle = hsl(id, 0.18 * p.op);
    ctx.fill();
    ctx.strokeStyle = hsl(id, 0.4 * p.op);
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  for (const id of ids) {
    const p = persons[id];
    if (p.op < 0.01)
      continue;
    const cx = p.x * W;
    const cy = p.y * H;
    const nr = Math.max(10, p.r * W * 0.22);
    ctx.beginPath();
    ctx.arc(cx, cy, nr, 0, TWO_PI);
    ctx.fillStyle = hsl(id, 0.85 * p.op);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * p.op})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.9 * p.op})`;
    ctx.font = `bold ${Math.max(10, nr * 0.85)}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(LABELS[id] || id, cx, cy + 1);
  }
  if (note && noteAlpha > 0.01) {
    const fs = Math.max(12, Math.min(14, W * 0.017));
    ctx.fillStyle = `rgba(170,170,165,${noteAlpha * 0.7})`;
    ctx.font = `italic ${fs}px Georgia,serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(note, W / 2, H - 16);
  }
}
function AttentionFields() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const tRef = useRef(0);
  const playingRef = useRef(false);
  const lastFrameRef = useRef(null);
  const animRef = useRef(null);
  const dimsRef = useRef({ w: 800, h: 500 });
  const lastSyncRef = useRef(0);
  const [sliderT, setSliderT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dims, setDims] = useState({ w: 800, h: 500 });
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    function resize(width) {
      const w = Math.round(width);
      const h = Math.round(w * ASPECT);
      dimsRef.current = { w, h };
      setDims({ w, h });
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxRef.current = ctx;
    }
    const observer = new ResizeObserver((entries) => {
      if (entries[0])
        resize(entries[0].contentRect.width);
    });
    observer.observe(container);
    resize(container.offsetWidth);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    function frame(ts) {
      const ctx = ctxRef.current;
      const { w, h } = dimsRef.current;
      if (ctx) {
        if (playingRef.current && lastFrameRef.current != null) {
          const dt = ts - lastFrameRef.current;
          tRef.current = Math.min(tRef.current + dt * PLAY_SPEED / 1e3, MAX_T);
          if (tRef.current >= MAX_T) {
            playingRef.current = false;
            setPlaying(false);
          }
          if (ts - lastSyncRef.current > 80) {
            setSliderT(tRef.current);
            lastSyncRef.current = ts;
          }
        }
        lastFrameRef.current = ts;
        draw(ctx, interpolate(tRef.current), w, h, ts);
      }
      animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, []);
  const onSlider = useCallback((e) => {
    const v = parseFloat(e.target.value);
    tRef.current = v;
    setSliderT(v);
  }, []);
  const onPlay = useCallback(() => {
    if (tRef.current >= MAX_T) {
      tRef.current = 0;
      setSliderT(0);
    }
    const next = !playingRef.current;
    playingRef.current = next;
    lastFrameRef.current = null;
    setPlaying(next);
  }, []);
  const nearest = STAGES[Math.min(Math.round(sliderT), MAX_T)];
  const labelText = `${nearest.label}  \xB7  age ${nearest.age}`;
  return /* @__PURE__ */ jsxs("div", {
    ref: containerRef,
    style: S.wrap,
    children: [
      /* @__PURE__ */ jsx("style", {
        children: CSS
      }),
      /* @__PURE__ */ jsx("canvas", {
        ref: canvasRef,
        style: S.canvas
      }),
      /* @__PURE__ */ jsxs("div", {
        style: S.controls,
        children: [
          /* @__PURE__ */ jsx("div", {
            style: S.label,
            children: labelText
          }),
          /* @__PURE__ */ jsxs("div", {
            style: S.row,
            children: [
              /* @__PURE__ */ jsx("input", {
                type: "range",
                className: "af-range",
                min: 0,
                max: MAX_T,
                step: 5e-3,
                value: sliderT,
                onChange: onSlider
              }),
              /* @__PURE__ */ jsx("button", {
                onClick: onPlay,
                style: S.btn,
                children: playing ? "\u23F8" : "\u25B6"
              })
            ]
          }),
          /* @__PURE__ */ jsx("div", {
            style: S.ticks,
            children: STAGES.map((s, i) => /* @__PURE__ */ jsx("span", {
              style: {
                ...S.tick,
                opacity: Math.abs(sliderT - i) < 0.5 ? 1 : 0.4
              },
              onClick: () => {
                tRef.current = i;
                setSliderT(i);
              },
              children: s.short
            }, i))
          })
        ]
      })
    ]
  });
}
var CSS = `
  html, body { margin: 0; padding: 0; background: ${BG}; }
  .af-range {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    height: 3px;
    background: #333;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  .af-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #888;
    cursor: pointer;
    border: none;
  }
  .af-range::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #888;
    cursor: pointer;
    border: none;
  }
`;
var S = {
  wrap: {
    width: "100%",
    maxWidth: 900,
    margin: "0 auto",
    padding: "40px 20px 60px",
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    background: BG,
    minHeight: "100vh",
    boxSizing: "border-box"
  },
  canvas: {
    display: "block",
    width: "100%",
    borderRadius: 4
  },
  controls: {
    marginTop: 20,
    padding: "0 4px"
  },
  label: {
    color: "#999",
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: "0.04em"
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  btn: {
    background: "none",
    border: "1px solid #444",
    borderRadius: 4,
    color: "#999",
    fontSize: 14,
    width: 34,
    height: 28,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    flexShrink: 0
  },
  ticks: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 8,
    padding: "0 7px"
  },
  tick: {
    color: "#666",
    fontSize: 11,
    cursor: "pointer",
    transition: "opacity 0.3s",
    userSelect: "none"
  }
};
export {
  AttentionFields as default
};
