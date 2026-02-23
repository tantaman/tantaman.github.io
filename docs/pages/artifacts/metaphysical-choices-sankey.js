// content/pages/artifacts/metaphysical-choices-sankey.jsx
import { useState as useState8 } from "https://esm.sh/react";

// content/pages/artifacts/metaphysical-choices-sankey/science-sankey.jsx
import { useState, useMemo } from "https://esm.sh/react";
import { Fragment, jsx, jsxs } from "https://esm.sh/react/jsx-runtime";
var COLORS = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848"
};
var STREAM_COLORS = {
  ancient: { start: "#c9a84c", end: "#b8924a" },
  participatory: { start: "#3ac5b5", end: "#2a9a8a" },
  aristotelian: { start: "#8aaa6a", end: "#7a9a5a" },
  platonic: { start: "#3ac5b5", end: "#2ee8d0" },
  islamic: { start: "#8B72BE", end: "#7a6aad" },
  medieval: { start: "#b8924a", end: "#a07a3a" },
  bacon: { start: "#d48a4e", end: "#c4703e" },
  descartes: { start: "#cc6644", end: "#b85a3e" },
  newton: { start: "#d48a4e", end: "#cc6644" },
  mechanist: { start: "#cc5544", end: "#aa4a3a" },
  romantic: { start: "#3ac5b5", end: "#2aaa9a" },
  darwin: { start: "#b8924a", end: "#9a7a4a" },
  positivist: { start: "#cc5544", end: "#d48a4e" },
  pure: { start: "#3ac5b5", end: "#7a6aad" },
  quantum: { start: "#8B72BE", end: "#3ac5b5" },
  ecology: { start: "#8aaa6a", end: "#3ac5b5" },
  industrial: { start: "#993a3a", end: "#8a2a2a" },
  military: { start: "#e84450", end: "#d4344a" },
  techOpt: { start: "#dd3a4a", end: "#cc2a3a" },
  pharma: { start: "#aa5a4a", end: "#9a4a3a" },
  complexity: { start: "#2ee8d0", end: "#3ac5b5" },
  reductionist: { start: "#e06050", end: "#d45a4a" }
};
var W = 1700;
var H = 880;
var LEFT_MARGIN = 100;
var COL_X = [LEFT_MARGIN + 10, LEFT_MARGIN + 250, LEFT_MARGIN + 490, LEFT_MARGIN + 730, LEFT_MARGIN + 1e3, LEFT_MARGIN + 1270];
var NODE_W = 16;
var TOP_Y = 25;
var BOT_Y = 820;
function scoreToY(score) {
  return TOP_Y + (BOT_Y - TOP_Y) * (1 - score / 100);
}
function scoreToColor(score) {
  if (score >= 70)
    return "#3ac5b5";
  if (score >= 50)
    return "#7aaa8a";
  if (score >= 35)
    return "#b8924a";
  if (score >= 20)
    return "#d48a4e";
  if (score >= 10)
    return "#cc6644";
  return "#e84450";
}
var nodesRaw = [
  {
    id: "ancient",
    label: "Ancient Natural Philosophy",
    sub: "Thales \u2192 Aristotle \xB7 thaumazein",
    col: 0,
    h: 240,
    color: "#c9a84c",
    score: 75,
    note: "Science begins in wonder \u2014 knowing as participation in the intelligibility of the cosmos"
  },
  {
    id: "platonic",
    label: "Neoplatonic Science",
    sub: "Plotinus, Proclus \xB7 cosmos as emanation",
    col: 1,
    h: 65,
    color: "#3ac5b5",
    score: 85,
    glow: true,
    note: "Nature as theophany \u2014 studying the world IS knowing the divine mind"
  },
  {
    id: "islamicScience",
    label: "Islamic Golden Age",
    sub: "Al-Khwarizmi, Ibn Sina, Alhazen",
    col: 1,
    h: 75,
    color: "#8B72BE",
    score: 60,
    note: "Preserved and extended Greek participatory science within monotheism"
  },
  {
    id: "medievalNatPhil",
    label: "Medieval Natural Philosophy",
    sub: "Grosseteste, Roger Bacon, Aquinas",
    col: 1,
    h: 80,
    color: "#b8924a",
    score: 55,
    note: "Nature as Book of God \u2014 investigation as a form of devotion"
  },
  {
    id: "nominalistSci",
    label: "Nominalist Turn",
    sub: "Ockham's razor \xB7 14th c.",
    col: 1,
    h: 75,
    color: "#d48a4e",
    score: 22,
    note: "Universals don't exist \u2014 only particular measurable things are real"
  },
  {
    id: "kepler",
    label: "Kepler / Copernicus",
    sub: "Cosmic harmony \xB7 16th\u201317th c.",
    col: 2,
    h: 55,
    color: "#8aaa6a",
    score: 65,
    note: "Still participatory \u2014 Kepler sought God's geometrical mind in the heavens"
  },
  {
    id: "bacon",
    label: "Francis Bacon",
    sub: "'Knowledge is power' \xB7 1620",
    col: 2,
    h: 70,
    color: "#d48a4e",
    score: 15,
    note: "THE FORK \u2014 science redefined as control over nature, not participation in it"
  },
  {
    id: "descartes",
    label: "Descartes",
    sub: "Res cogitans / res extensa \xB7 1637",
    col: 2,
    h: 75,
    color: "#cc6644",
    score: 12,
    note: "Mind-body split \u2014 nature becomes dead matter, mind becomes spectator"
  },
  {
    id: "newton",
    label: "Newton",
    sub: "Principia \xB7 1687",
    col: 2,
    h: 80,
    color: "#b8924a",
    score: 40,
    note: "Genuinely both \u2014 occult alchemist AND mechanist; the tension is the man"
  },
  {
    id: "romanticSci",
    label: "Romantic Science",
    sub: "Goethe, Humboldt, Schelling",
    col: 3,
    h: 50,
    color: "#3ac5b5",
    score: 80,
    glow: true,
    note: "Nature as living whole \u2014 the scientist participates in what she studies"
  },
  {
    id: "mechanistPhysics",
    label: "Mechanist Physics",
    sub: "Laplace, determinism \xB7 18th c.",
    col: 3,
    h: 65,
    color: "#cc5544",
    score: 10,
    note: "'I have no need of that hypothesis' \u2014 the cosmos as clockwork, God expelled"
  },
  {
    id: "darwin",
    label: "Darwin / Evolutionary",
    sub: "Origin of Species \xB7 1859",
    col: 3,
    h: 55,
    color: "#b8924a",
    score: 45,
    note: "Ambiguous \u2014 nature has depth and creativity, but no telos; disenchanting"
  },
  {
    id: "positivism",
    label: "Positivism",
    sub: "Comte, Mach \xB7 only measurables exist",
    col: 3,
    h: 55,
    color: "#d48a4e",
    score: 8,
    note: "The methodological bracket becomes dogma \u2014 if you can't measure it, it isn't real"
  },
  {
    id: "industrialSci",
    label: "Industrial Science",
    sub: "Applied R&D \xB7 19th c. \u2192",
    col: 3,
    h: 55,
    color: "#993a3a",
    score: 6,
    note: "Science in service of production \u2014 the factory consumes natural philosophy"
  },
  {
    id: "quantum",
    label: "Quantum / Relativity",
    sub: "Bohr, Heisenberg, Einstein",
    col: 4,
    h: 45,
    color: "#8B72BE",
    score: 68,
    glow: true,
    note: "The observer re-enters \u2014 mechanism breaks down at the fundamental level"
  },
  {
    id: "pureMath",
    label: "Pure Mathematics",
    sub: "G\xF6del, Grothendieck, Ramanujan",
    col: 4,
    h: 35,
    color: "#3ac5b5",
    score: 85,
    glow: true,
    note: "Knowing for its own sake \u2014 participation in abstract structure, sunder warumbe"
  },
  {
    id: "ecology",
    label: "Ecology / Systems",
    sub: "Carson, Lovelock, Bateson",
    col: 4,
    h: 45,
    color: "#8aaa6a",
    score: 65,
    glow: true,
    note: "Nature as web of relations \u2014 the knower is inside the system, not above it"
  },
  {
    id: "bigScience",
    label: "Big Science",
    sub: "Manhattan Project, CERN, NASA",
    col: 4,
    h: 60,
    color: "#cc5544",
    score: 15,
    note: "State-funded megaprojects \u2014 science as national power, not wonder"
  },
  {
    id: "reductionism",
    label: "Molecular Reductionism",
    sub: "DNA, neuroscience \xB7 genes as code",
    col: 4,
    h: 60,
    color: "#e06050",
    score: 10,
    note: "Life is 'just' chemistry \u2014 the organism disappears into components"
  },
  {
    id: "militaryIndustrial",
    label: "Military-Industrial R&D",
    sub: "DARPA, defense contracts",
    col: 4,
    h: 50,
    color: "#e84450",
    score: 3,
    note: "Science as weapons development \u2014 knowledge for domination"
  },
  {
    id: "complexitySci",
    label: "Complexity / Emergence",
    sub: "Santa Fe, Kauffman, Prigogine",
    col: 5,
    h: 40,
    color: "#2ee8d0",
    score: 72,
    glow: true,
    yOverride: 215,
    note: "Wholes irreducible to parts \u2014 participation and novelty re-enter science"
  },
  {
    id: "contemplativeSci",
    label: "Contemplative Science",
    sub: "Varela, McGilchrist, enactivism",
    col: 5,
    h: 35,
    color: "#3ac5b5",
    score: 80,
    glow: true,
    yOverride: 160,
    note: "The knower participates in the known \u2014 first-person science, embodied cognition"
  },
  {
    id: "deepEcology",
    label: "Deep Ecology",
    sub: "Naess, Abram \xB7 ~3M practitioners",
    col: 5,
    h: 35,
    color: "#8aaa6a",
    score: 75,
    glow: true,
    yOverride: 270,
    note: "Nature has intrinsic value \u2014 science as encounter, not extraction"
  },
  {
    id: "pharmaTech",
    label: "Pharma / Biotech",
    sub: "Drug pipelines, patents \xB7 $1.5T",
    col: 5,
    h: 50,
    color: "#aa5a4a",
    score: 6,
    yOverride: 530,
    note: "Science as IP pipeline \u2014 discover, patent, monetize, repeat"
  },
  {
    id: "moveFast",
    label: "'Move Fast & Break Things'",
    sub: "Silicon Valley R&D \xB7 disruption",
    col: 5,
    h: 50,
    color: "#e84450",
    score: 3,
    yOverride: 600,
    note: "Science as competitive advantage \u2014 ship it before you understand it"
  },
  {
    id: "surveillance",
    label: "Surveillance Science",
    sub: "Behavioral prediction, ad-tech",
    col: 5,
    h: 45,
    color: "#dd3a4a",
    score: 2,
    yOverride: 670,
    note: "Knowledge of humans as instrument of manipulation \u2014 Bacon's endgame"
  },
  {
    id: "weaponsAI",
    label: "Autonomous Weapons / AI Race",
    sub: "Killer drones, arms race logic",
    col: 5,
    h: 45,
    color: "#993a3a",
    score: 1,
    yOverride: 735,
    note: "Knowledge for annihilation \u2014 the ultimate inversion of thaumazein"
  },
  {
    id: "replicationCrisis",
    label: "Replication Crisis",
    sub: "P-hacking, publish-or-perish",
    col: 5,
    h: 40,
    color: "#cc5544",
    score: 8,
    yOverride: 460,
    note: "Science eating itself \u2014 incentive structure corrupts the method"
  }
];
var nodes = nodesRaw.map((n) => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY(n.score) - n.h / 2
}));
var nodeMap = {};
nodes.forEach((n) => {
  nodeMap[n.id] = n;
});
var links = [
  { from: "ancient", to: "platonic", value: 15, stream: "platonic" },
  { from: "ancient", to: "islamicScience", value: 12, stream: "islamic" },
  { from: "ancient", to: "medievalNatPhil", value: 18, stream: "medieval" },
  { from: "ancient", to: "nominalistSci", value: 14, stream: "bacon" },
  { from: "platonic", to: "kepler", value: 10, stream: "platonic" },
  { from: "platonic", to: "newton", value: 3, stream: "platonic" },
  { from: "islamicScience", to: "kepler", value: 4, stream: "islamic" },
  { from: "islamicScience", to: "bacon", value: 4, stream: "islamic" },
  { from: "medievalNatPhil", to: "kepler", value: 5, stream: "medieval" },
  { from: "medievalNatPhil", to: "bacon", value: 6, stream: "bacon" },
  { from: "medievalNatPhil", to: "newton", value: 5, stream: "medieval" },
  { from: "nominalistSci", to: "bacon", value: 8, stream: "bacon" },
  { from: "nominalistSci", to: "descartes", value: 10, stream: "descartes" },
  { from: "kepler", to: "romanticSci", value: 6, stream: "participatory" },
  { from: "kepler", to: "newton", value: 6, stream: "ancient" },
  { from: "bacon", to: "mechanistPhysics", value: 8, stream: "mechanist" },
  { from: "bacon", to: "industrialSci", value: 6, stream: "industrial" },
  { from: "bacon", to: "positivism", value: 4, stream: "positivist" },
  { from: "descartes", to: "mechanistPhysics", value: 12, stream: "mechanist" },
  { from: "descartes", to: "positivism", value: 5, stream: "positivist" },
  { from: "newton", to: "mechanistPhysics", value: 8, stream: "mechanist" },
  { from: "newton", to: "romanticSci", value: 3, stream: "romantic" },
  { from: "newton", to: "darwin", value: 5, stream: "ancient" },
  { from: "romanticSci", to: "ecology", value: 6, stream: "ecology" },
  { from: "romanticSci", to: "quantum", value: 3, stream: "participatory" },
  { from: "romanticSci", to: "pureMath", value: 2, stream: "pure" },
  { from: "mechanistPhysics", to: "quantum", value: 5, stream: "quantum" },
  { from: "mechanistPhysics", to: "bigScience", value: 8, stream: "mechanist" },
  { from: "mechanistPhysics", to: "reductionism", value: 8, stream: "reductionist" },
  { from: "darwin", to: "ecology", value: 5, stream: "ecology" },
  { from: "darwin", to: "reductionism", value: 6, stream: "reductionist" },
  { from: "positivism", to: "bigScience", value: 5, stream: "positivist" },
  { from: "positivism", to: "reductionism", value: 4, stream: "reductionist" },
  { from: "industrialSci", to: "bigScience", value: 5, stream: "industrial" },
  { from: "industrialSci", to: "militaryIndustrial", value: 8, stream: "military" },
  { from: "quantum", to: "complexitySci", value: 4, stream: "complexity" },
  { from: "quantum", to: "contemplativeSci", value: 3, stream: "participatory" },
  { from: "pureMath", to: "complexitySci", value: 3, stream: "pure" },
  { from: "pureMath", to: "contemplativeSci", value: 2, stream: "pure" },
  { from: "ecology", to: "deepEcology", value: 5, stream: "ecology" },
  { from: "ecology", to: "complexitySci", value: 4, stream: "complexity" },
  { from: "bigScience", to: "pharmaTech", value: 5, stream: "industrial" },
  { from: "bigScience", to: "replicationCrisis", value: 4, stream: "positivist" },
  { from: "bigScience", to: "moveFast", value: 3, stream: "techOpt" },
  { from: "reductionism", to: "pharmaTech", value: 6, stream: "pharma" },
  { from: "reductionism", to: "surveillance", value: 4, stream: "techOpt" },
  { from: "reductionism", to: "replicationCrisis", value: 4, stream: "reductionist" },
  { from: "militaryIndustrial", to: "weaponsAI", value: 7, stream: "military" },
  { from: "militaryIndustrial", to: "surveillance", value: 4, stream: "military" },
  { from: "militaryIndustrial", to: "moveFast", value: 3, stream: "military" }
];
function computeLinks() {
  const outOffsets = {};
  const inOffsets = {};
  nodes.forEach((n) => {
    outOffsets[n.id] = 0;
    inOffsets[n.id] = 0;
  });
  const outTotal = {};
  const inTotal = {};
  nodes.forEach((n) => {
    outTotal[n.id] = 0;
    inTotal[n.id] = 0;
  });
  links.forEach((l) => {
    outTotal[l.from] = (outTotal[l.from] || 0) + l.value;
    inTotal[l.to] = (inTotal[l.to] || 0) + l.value;
  });
  return links.map((link) => {
    const fn = nodeMap[link.from];
    const tn = nodeMap[link.to];
    const pad = 4;
    const fAvail = fn.h - pad * 2;
    const fScale = fAvail / Math.max(outTotal[fn.id], 1);
    const thickness = Math.max(3, link.value * fScale);
    const fY = fn.y + pad + outOffsets[fn.id] * fScale + thickness / 2;
    outOffsets[fn.id] += link.value;
    const tAvail = tn.h - pad * 2;
    const tScale = tAvail / Math.max(inTotal[tn.id], 1);
    const tThick = Math.max(3, link.value * tScale);
    const tY = tn.y + pad + inOffsets[tn.id] * tScale + tThick / 2;
    inOffsets[tn.id] += link.value;
    const x1 = COL_X[fn.col] + NODE_W;
    const x2 = COL_X[tn.col];
    return { ...link, x1, y1: fY, x2, y2: tY, thickness: Math.min(thickness, tThick) };
  });
}
function FlowBand({ link, gradientId, dimmed, highlighted }) {
  const { x1, y1, x2, y2, thickness } = link;
  const halfT = thickness / 2;
  const cp = (x2 - x1) * 0.42;
  const d = `M ${x1} ${y1 - halfT} C ${x1 + cp} ${y1 - halfT}, ${x2 - cp} ${y2 - halfT}, ${x2} ${y2 - halfT} L ${x2} ${y2 + halfT} C ${x2 - cp} ${y2 + halfT}, ${x1 + cp} ${y1 + halfT}, ${x1} ${y1 + halfT} Z`;
  return /* @__PURE__ */ jsx("path", {
    d,
    fill: `url(#${gradientId})`,
    opacity: dimmed ? 0.03 : highlighted ? 0.6 : 0.3,
    style: { transition: "opacity 0.4s ease" }
  });
}
function ScorePill({ score, x, y }) {
  const color = scoreToColor(score);
  const pillW = 30;
  const pillH = 12;
  return /* @__PURE__ */ jsxs("g", {
    children: [
      /* @__PURE__ */ jsx("rect", {
        x,
        y,
        width: pillW,
        height: pillH,
        rx: 6,
        fill: color,
        opacity: 0.15
      }),
      /* @__PURE__ */ jsx("rect", {
        x: x + 1,
        y: y + 1,
        width: Math.max(2, (pillW - 2) * (score / 100)),
        height: pillH - 2,
        rx: 5,
        fill: color,
        opacity: 0.55
      }),
      /* @__PURE__ */ jsx("text", {
        x: x + pillW + 4,
        y: y + 10,
        fill: color,
        fontSize: "10.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        children: score
      })
    ]
  });
}
function NodeRect({ node, onHover, dimmed, isHovered }) {
  const x = COL_X[node.col];
  const isRight = node.col >= 4;
  const isLeft = node.col <= 1;
  const labelX = isRight ? x + NODE_W + 10 : isLeft ? x + NODE_W + 10 : x - 8;
  const anchor = isRight ? "start" : isLeft ? "start" : "end";
  return /* @__PURE__ */ jsxs("g", {
    onMouseEnter: () => onHover(node.id),
    onMouseLeave: () => onHover(null),
    style: { cursor: "pointer", opacity: dimmed ? 0.1 : 1, transition: "opacity 0.4s ease" },
    children: [
      node.glow && /* @__PURE__ */ jsxs(Fragment, {
        children: [
          /* @__PURE__ */ jsx("rect", {
            x: x - 4,
            y: node.y - 4,
            width: NODE_W + 8,
            height: node.h + 8,
            rx: 4,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 1.5,
            opacity: 0.3
          }),
          /* @__PURE__ */ jsx("rect", {
            x: x - 8,
            y: node.y - 8,
            width: NODE_W + 16,
            height: node.h + 16,
            rx: 6,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 0.5,
            opacity: 0.15
          })
        ]
      }),
      /* @__PURE__ */ jsx("rect", {
        x,
        y: node.y,
        width: NODE_W,
        height: node.h,
        rx: 3,
        fill: node.color,
        opacity: isHovered ? 1 : 0.9,
        stroke: isHovered ? "#fff" : "none",
        strokeWidth: 1.5
      }),
      /* @__PURE__ */ jsx("text", {
        x: labelX,
        y: node.y + node.h / 2 - 12,
        fill: COLORS.text,
        fontSize: "13",
        fontWeight: "700",
        fontFamily: "'Crimson Pro', Georgia, serif",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.label
      }),
      /* @__PURE__ */ jsx("text", {
        x: labelX,
        y: node.y + node.h / 2 + 1,
        fill: COLORS.textDim,
        fontSize: "10.5",
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontStyle: "italic",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.sub
      }),
      /* @__PURE__ */ jsx(ScorePill, {
        score: node.score,
        x: anchor === "end" ? labelX - 48 : labelX,
        y: node.y + node.h / 2 + 10
      }),
      isHovered && node.note && /* @__PURE__ */ jsxs("g", {
        children: [
          /* @__PURE__ */ jsx("rect", {
            x: x + (isRight ? -10 : -360),
            y: node.y - 38,
            width: 360,
            height: 30,
            rx: 4,
            fill: "#1a1a18ee",
            stroke: scoreToColor(node.score),
            strokeWidth: 0.7
          }),
          /* @__PURE__ */ jsx("text", {
            x: x + (isRight ? -10 : -360) + 8,
            y: node.y - 18,
            fill: COLORS.textDim,
            fontSize: "14",
            fontFamily: "'Crimson Pro', serif",
            fontStyle: "italic",
            children: node.note
          })
        ]
      })
    ]
  });
}
function InvertedBracket() {
  const x = COL_X[5] + NODE_W + 200;
  const y1 = 525;
  const y2 = 785;
  const mid = (y1 + y2) / 2;
  return /* @__PURE__ */ jsxs("g", {
    opacity: 0.3,
    children: [
      /* @__PURE__ */ jsx("path", {
        d: `M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx("path", {
        d: `M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx("text", {
        x: x + 28,
        y: mid - 6,
        fill: "#e84450",
        fontSize: "9.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        letterSpacing: "0.06em",
        children: "ALL SCORE \u2264 8"
      }),
      /* @__PURE__ */ jsx("text", {
        x: x + 28,
        y: mid + 6,
        fill: COLORS.textMuted,
        fontSize: "9.5",
        fontFamily: "'Crimson Pro', serif",
        fontStyle: "italic",
        children: "fully instrumentalized"
      })
    ]
  });
}
var eraLabels = [
  { x: COL_X[0] + 7, label: "ANCIENT" },
  { x: COL_X[1] + 7, label: "MEDIEVAL" },
  { x: COL_X[2] + 7, label: "REVOLUTION" },
  { x: COL_X[3] + 7, label: "18TH\u201319TH C." },
  { x: COL_X[4] + 7, label: "20TH C." },
  { x: COL_X[5] + 7, label: "CONTEMPORARY" }
];
function ScienceSankey() {
  const [hovered, setHovered] = useState(null);
  const linkData = useMemo(() => computeLinks(), []);
  const connectedIds = useMemo(() => {
    if (!hovered)
      return /* @__PURE__ */ new Set();
    const ids = /* @__PURE__ */ new Set([hovered]);
    const visitedFwd = /* @__PURE__ */ new Set();
    const visitedBack = /* @__PURE__ */ new Set();
    const fwdQ = [hovered];
    while (fwdQ.length) {
      const cur = fwdQ.pop();
      if (visitedFwd.has(cur))
        continue;
      visitedFwd.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.from === cur) {
          ids.add(l.to);
          fwdQ.push(l.to);
        }
      });
    }
    const bwdQ = [hovered];
    while (bwdQ.length) {
      const cur = bwdQ.pop();
      if (visitedBack.has(cur))
        continue;
      visitedBack.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.to === cur) {
          ids.add(l.from);
          bwdQ.push(l.from);
        }
      });
    }
    return ids;
  }, [hovered, linkData]);
  const isLinkHL = (link) => hovered && connectedIds.has(link.from) && connectedIds.has(link.to);
  return /* @__PURE__ */ jsxs("div", {
    style: {
      background: `radial-gradient(ellipse at 20% 15%, #1a1815 0%, ${COLORS.bg} 70%)`,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 16px 20px",
      fontFamily: "'Crimson Pro', Georgia, serif"
    },
    children: [
      /* @__PURE__ */ jsx("link", {
        href: "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400&family=JetBrains+Mono:wght@300;400;600&display=swap",
        rel: "stylesheet"
      }),
      /* @__PURE__ */ jsx("h1", {
        style: {
          color: COLORS.text,
          fontSize: "30px",
          fontWeight: 300,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: "2px",
          textAlign: "center"
        },
        children: "The Disenchantment of Wonder"
      }),
      /* @__PURE__ */ jsxs("p", {
        style: {
          color: COLORS.textDim,
          fontSize: "16px",
          fontWeight: 300,
          fontStyle: "italic",
          marginBottom: "12px",
          textAlign: "center",
          maxWidth: 700,
          lineHeight: 1.5
        },
        children: [
          "From ",
          /* @__PURE__ */ jsx("em", {
            children: "thaumazein"
          }),
          ' to "move fast and break things" \u2014 how science lost participation and became instrumentation. The methodological bracket that ate the world. Hover for notes.'
        ]
      }),
      /* @__PURE__ */ jsx("div", {
        style: { display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" },
        children: [
          { color: "#3ac5b5", label: "Participatory (70\u2013100)" },
          { color: "#7aaa8a", label: "Moderate (50\u201369)" },
          { color: "#b8924a", label: "Mixed (35\u201349)" },
          { color: "#d48a4e", label: "Thinned (20\u201334)" },
          { color: "#cc6644", label: "Instrumental (10\u201319)" },
          { color: "#e84450", label: "Fully extractive (0\u20139)" }
        ].map((item, i) => /* @__PURE__ */ jsxs("div", {
          style: { display: "flex", alignItems: "center", gap: "5px" },
          children: [
            /* @__PURE__ */ jsx("div", {
              style: {
                width: 14,
                height: 5,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${item.color}cc, ${item.color}55)`
              }
            }),
            /* @__PURE__ */ jsx("span", {
              style: { color: COLORS.textDim },
              children: item.label
            })
          ]
        }, i))
      }),
      /* @__PURE__ */ jsxs("svg", {
        viewBox: `0 -10 ${W} ${H + 80}`,
        width: "100%",
        style: { maxWidth: W + 20, overflow: "visible" },
        children: [
          /* @__PURE__ */ jsxs("defs", {
            children: [
              /* @__PURE__ */ jsxs("linearGradient", {
                id: "bgVertGrad",
                x1: "0",
                y1: "0",
                x2: "0",
                y2: "1",
                children: [
                  /* @__PURE__ */ jsx("stop", {
                    offset: "0%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.05"
                  }),
                  /* @__PURE__ */ jsx("stop", {
                    offset: "30%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx("stop", {
                    offset: "50%",
                    stopColor: "#b8924a",
                    stopOpacity: "0.01"
                  }),
                  /* @__PURE__ */ jsx("stop", {
                    offset: "70%",
                    stopColor: "#e84450",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx("stop", {
                    offset: "100%",
                    stopColor: "#e84450",
                    stopOpacity: "0.07"
                  })
                ]
              }),
              linkData.map((link, i) => {
                const sc = STREAM_COLORS[link.stream] || { start: "#888", end: "#888" };
                return /* @__PURE__ */ jsxs("linearGradient", {
                  id: `fg-${i}`,
                  x1: "0",
                  y1: "0",
                  x2: "1",
                  y2: "0",
                  children: [
                    /* @__PURE__ */ jsx("stop", {
                      offset: "0%",
                      stopColor: sc.start,
                      stopOpacity: "0.8"
                    }),
                    /* @__PURE__ */ jsx("stop", {
                      offset: "50%",
                      stopColor: sc.start,
                      stopOpacity: "0.4"
                    }),
                    /* @__PURE__ */ jsx("stop", {
                      offset: "100%",
                      stopColor: sc.end,
                      stopOpacity: "0.8"
                    })
                  ]
                }, `g${i}`);
              })
            ]
          }),
          /* @__PURE__ */ jsx("rect", {
            x: LEFT_MARGIN - 10,
            y: TOP_Y - 15,
            width: W - LEFT_MARGIN + 10,
            height: BOT_Y - TOP_Y + 60,
            fill: "url(#bgVertGrad)",
            rx: 8
          }),
          /* @__PURE__ */ jsxs("g", {
            children: [
              /* @__PURE__ */ jsx("line", {
                x1: 58,
                y1: TOP_Y + 5,
                x2: 58,
                y2: BOT_Y + 10,
                stroke: COLORS.textMuted,
                strokeWidth: 0.5,
                opacity: 0.25
              }),
              /* @__PURE__ */ jsx("path", {
                d: "M 55 32 L 58 22 L 61 32",
                fill: "none",
                stroke: "#3ac5b5",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx("path", {
                d: `M 55 ${BOT_Y + 3} L 58 ${BOT_Y + 13} L 61 ${BOT_Y + 3}`,
                fill: "none",
                stroke: "#e84450",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx("text", {
                x: 25,
                y: TOP_Y + 12,
                fill: "#3ac5b5",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "WONDER"
              }),
              ["thaumazein", "participation", "knowing as being", "intrinsic value"].map((w, i) => /* @__PURE__ */ jsx("text", {
                x: 25,
                y: TOP_Y + 24 + i * 10,
                fill: "#3ac5b5",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w)),
              /* @__PURE__ */ jsx("text", {
                x: 25,
                y: BOT_Y - 40,
                fill: "#e84450",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "CONTROL"
              }),
              ["extraction", "domination", "knowledge as power", "instrumental value"].map((w, i) => /* @__PURE__ */ jsx("text", {
                x: 25,
                y: BOT_Y - 28 + i * 10,
                fill: "#e84450",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w))
            ]
          }),
          [75, 50, 25].map((score) => /* @__PURE__ */ jsxs("g", {
            children: [
              /* @__PURE__ */ jsx("line", {
                x1: LEFT_MARGIN - 5,
                y1: scoreToY(score),
                x2: W - 20,
                y2: scoreToY(score),
                stroke: COLORS.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "4,12",
                opacity: 0.18
              }),
              /* @__PURE__ */ jsx("text", {
                x: 63,
                y: scoreToY(score) + 3,
                fill: COLORS.textMuted,
                fontSize: "9",
                fontFamily: "'JetBrains Mono', monospace",
                opacity: 0.35,
                textAnchor: "end",
                children: score
              })
            ]
          }, score)),
          eraLabels.map((era, i) => /* @__PURE__ */ jsxs("g", {
            children: [
              /* @__PURE__ */ jsx("line", {
                x1: COL_X[i],
                y1: TOP_Y - 5,
                x2: COL_X[i],
                y2: BOT_Y + 25,
                stroke: COLORS.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "2,8",
                opacity: 0.2
              }),
              /* @__PURE__ */ jsx("text", {
                x: era.x,
                y: BOT_Y + 45,
                fill: COLORS.textMuted,
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                letterSpacing: "0.08em",
                children: era.label
              })
            ]
          }, i)),
          /* @__PURE__ */ jsx(InvertedBracket, {}),
          linkData.map((link, i) => /* @__PURE__ */ jsx(FlowBand, {
            link,
            gradientId: `fg-${i}`,
            dimmed: hovered ? !isLinkHL(link) : false,
            highlighted: isLinkHL(link)
          }, i)),
          nodes.map((node) => /* @__PURE__ */ jsx(NodeRect, {
            node,
            onHover: setHovered,
            dimmed: hovered && !connectedIds.has(node.id),
            isHovered: hovered === node.id
          }, node.id))
        ]
      }),
      /* @__PURE__ */ jsx("div", {
        style: {
          maxWidth: 750,
          marginTop: "8px",
          padding: "14px 20px",
          background: "rgba(255,255,255,0.025)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.05)"
        },
        children: /* @__PURE__ */ jsxs("p", {
          style: {
            color: COLORS.textDim,
            fontSize: "14px",
            lineHeight: 1.7,
            margin: 0,
            fontFamily: "'Crimson Pro', serif",
            fontWeight: 300
          },
          children: [
            /* @__PURE__ */ jsx("strong", {
              style: { color: COLORS.text, fontWeight: 600 },
              children: "The methodological bracket that ate the world:"
            }),
            " ",
            /* @__PURE__ */ jsx("span", {
              style: { color: "#d48a4e" },
              children: "Bacon"
            }),
            " and",
            " ",
            /* @__PURE__ */ jsx("span", {
              style: { color: "#cc6644" },
              children: "Descartes"
            }),
            " made a practical choice \u2014 study only what you can measure and manipulate. This produced genuine knowledge. But the bracket hardened into dogma: if you can't measure it, it doesn't exist.",
            " ",
            /* @__PURE__ */ jsx("span", {
              style: { color: "#b8924a" },
              children: "Newton"
            }),
            " at 40 genuinely held both \u2014 alchemist and mechanist \u2014 paralleling Catholicism. ",
            /* @__PURE__ */ jsx("span", {
              style: { color: "#8B72BE" },
              children: "Quantum mechanics"
            }),
            " at 68 broke the mechanist framework from within: the observer re-entered. The thin",
            " ",
            /* @__PURE__ */ jsx("span", {
              style: { color: "#3ac5b5" },
              children: "teal stream"
            }),
            " \u2014 complexity science, deep ecology, enactivism \u2014 represents science recovering participation. The",
            " ",
            /* @__PURE__ */ jsx("span", {
              style: { color: "#e84450" },
              children: "red zone"
            }),
            " is Bacon's vision fully realized: knowledge as domination, nature as resource, the human as object."
          ]
        })
      })
    ]
  });
}

// content/pages/artifacts/metaphysical-choices-sankey/education-sankey.jsx
import { useState as useState2, useMemo as useMemo2 } from "https://esm.sh/react";
import { Fragment as Fragment2, jsx as jsx2, jsxs as jsxs2 } from "https://esm.sh/react/jsx-runtime";
var COLORS2 = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848"
};
var STREAM_COLORS2 = {
  ancient: { start: "#c9a84c", end: "#b8924a" },
  paideia: { start: "#3ac5b5", end: "#2a9a8a" },
  monastic: { start: "#8B72BE", end: "#7a6aad" },
  liberal: { start: "#3ac5b5", end: "#2ee8d0" },
  bildung: { start: "#2ee8d0", end: "#3ac5b5" },
  humanist: { start: "#8aaa6a", end: "#7a9a5a" },
  catechism: { start: "#b8924a", end: "#a07a3a" },
  prussian: { start: "#d48a4e", end: "#c4703e" },
  industrial: { start: "#cc6644", end: "#b85a3e" },
  progressive: { start: "#8aaa6a", end: "#3ac5b5" },
  montessori: { start: "#3ac5b5", end: "#2aaa9a" },
  waldorf: { start: "#8B72BE", end: "#3ac5b5" },
  dewey: { start: "#8aaa6a", end: "#7a9a5a" },
  taylorist: { start: "#cc5544", end: "#aa4a3a" },
  testing: { start: "#e06050", end: "#d45a4a" },
  classical: { start: "#3ac5b5", end: "#8B72BE" },
  greatBooks: { start: "#7a9aaa", end: "#6a8a9a" },
  credential: { start: "#993a3a", end: "#8a2a2a" },
  mooc: { start: "#e84450", end: "#d4344a" },
  corporate: { start: "#dd3a4a", end: "#cc2a3a" },
  unschool: { start: "#2ee8d0", end: "#3ac5b5" },
  stem: { start: "#aa5a4a", end: "#9a4a3a" }
};
var W2 = 1700;
var H2 = 880;
var LEFT_MARGIN2 = 100;
var COL_X2 = [LEFT_MARGIN2 + 10, LEFT_MARGIN2 + 250, LEFT_MARGIN2 + 490, LEFT_MARGIN2 + 730, LEFT_MARGIN2 + 1e3, LEFT_MARGIN2 + 1270];
var NODE_W2 = 16;
var TOP_Y2 = 25;
var BOT_Y2 = 820;
function scoreToY2(score) {
  return TOP_Y2 + (BOT_Y2 - TOP_Y2) * (1 - score / 100);
}
function scoreToColor2(score) {
  if (score >= 70)
    return "#3ac5b5";
  if (score >= 50)
    return "#7aaa8a";
  if (score >= 35)
    return "#b8924a";
  if (score >= 20)
    return "#d48a4e";
  if (score >= 10)
    return "#cc6644";
  return "#e84450";
}
var nodesRaw2 = [
  {
    id: "ancient",
    label: "Ancient Paideia",
    sub: "Plato's Academy, Aristotle's Lyceum",
    col: 0,
    h: 240,
    color: "#c9a84c",
    score: 85,
    note: "Education as formation of the whole soul \u2014 truth, beauty, goodness"
  },
  {
    id: "monastic",
    label: "Monastic Education",
    sub: "Lectio divina, trivium, quadrivium",
    col: 1,
    h: 70,
    color: "#8B72BE",
    score: 75,
    glow: true,
    note: "Learning as spiritual practice \u2014 reading as encounter, not information"
  },
  {
    id: "medieval",
    label: "Medieval University",
    sub: "Paris, Bologna, Oxford \xB7 12th c.",
    col: 1,
    h: 80,
    color: "#b8924a",
    score: 55,
    note: "Mixed \u2014 genuine inquiry + credentialing clerics; disputatio as formation"
  },
  {
    id: "humanistRen",
    label: "Renaissance Humanism",
    sub: "Erasmus, Vittorino, studia humanitatis",
    col: 1,
    h: 70,
    color: "#3ac5b5",
    score: 80,
    glow: true,
    note: "Recovery of classical paideia \u2014 the educated person as fully human"
  },
  {
    id: "catechism",
    label: "Catechetical / Confessional",
    sub: "Luther's catechism, Jesuit Ratio",
    col: 1,
    h: 70,
    color: "#d48a4e",
    score: 30,
    note: "Education as doctrinal transmission \u2014 correct propositions into young minds"
  },
  {
    id: "bildung",
    label: "Bildung",
    sub: "Humboldt, Schiller, Goethe \xB7 1800s",
    col: 2,
    h: 60,
    color: "#2ee8d0",
    score: 90,
    glow: true,
    note: "Self-cultivation through encounter with culture \u2014 the whole person unfolds"
  },
  {
    id: "prussian",
    label: "Prussian Model",
    sub: "State-run, compulsory \xB7 1763 \u2192",
    col: 2,
    h: 80,
    color: "#d48a4e",
    score: 15,
    note: "THE FORK \u2014 education as state manufacture of obedient, literate citizens"
  },
  {
    id: "liberalArts",
    label: "Liberal Arts Tradition",
    sub: "Newman, Arnold \xB7 cultivation of mind",
    col: 2,
    h: 60,
    color: "#8aaa6a",
    score: 65,
    note: "Knowledge as its own end \u2014 the gentleman's education, broad and deep"
  },
  {
    id: "rousseau",
    label: "Rousseau / Natural Education",
    sub: "\xC9mile \xB7 1762",
    col: 2,
    h: 50,
    color: "#8aaa6a",
    score: 60,
    note: "The child has innate development \u2014 don't pour in content, let it unfold"
  },
  {
    id: "montessori",
    label: "Montessori",
    sub: "Prepared environment \xB7 1907 \u2192",
    col: 3,
    h: 45,
    color: "#3ac5b5",
    score: 78,
    glow: true,
    note: "Follow the child \u2014 self-directed encounter with materials, inner formation"
  },
  {
    id: "waldorf",
    label: "Waldorf / Steiner",
    sub: "Imagination, rhythm, will \xB7 1919 \u2192",
    col: 3,
    h: 40,
    color: "#8B72BE",
    score: 75,
    glow: true,
    note: "Head, heart, hands \u2014 education addresses the whole human being"
  },
  {
    id: "dewey",
    label: "Dewey / Progressive",
    sub: "Learning by doing \xB7 1890s \u2192",
    col: 3,
    h: 50,
    color: "#8aaa6a",
    score: 55,
    note: "Ambiguous \u2014 genuine experience-based learning but instrumentalized toward democracy"
  },
  {
    id: "factorySchool",
    label: "Factory Model School",
    sub: "Bells, rows, grades, age-sorting",
    col: 3,
    h: 70,
    color: "#cc5544",
    score: 8,
    note: "The Prussian model industrialized \u2014 school as assembly line for workers"
  },
  {
    id: "greatBooks",
    label: "Great Books",
    sub: "Hutchins, Adler, St. John's \xB7 1930s",
    col: 3,
    h: 45,
    color: "#7a9aaa",
    score: 68,
    note: "Encounter with primary texts \u2014 the seminar as Socratic dialogue"
  },
  {
    id: "landGrant",
    label: "Land-Grant / Practical",
    sub: "Morrill Act \xB7 1862",
    col: 3,
    h: 50,
    color: "#b8924a",
    score: 30,
    note: "Education for agricultural and mechanical arts \u2014 useful but narrow"
  },
  {
    id: "classicalRenewal",
    label: "Classical Schools",
    sub: "Dorothy Sayers, trivium revival",
    col: 4,
    h: 35,
    color: "#3ac5b5",
    score: 72,
    glow: true,
    note: "Recovery of grammar-logic-rhetoric \u2014 formation over information"
  },
  {
    id: "unschooling",
    label: "Unschooling / Free Schools",
    sub: "Holt, Illich, Sudbury",
    col: 4,
    h: 35,
    color: "#2ee8d0",
    score: 70,
    glow: true,
    note: "Radical trust in intrinsic motivation \u2014 deschooling society"
  },
  {
    id: "standardizedTesting",
    label: "Standardized Testing",
    sub: "SAT, No Child Left Behind \xB7 NCLB",
    col: 4,
    h: 60,
    color: "#e06050",
    score: 6,
    note: "If you can't measure it, it doesn't count \u2014 the test becomes the telos"
  },
  {
    id: "credential",
    label: "Credentialism",
    sub: "College as prerequisite \xB7 degree inflation",
    col: 4,
    h: 55,
    color: "#993a3a",
    score: 5,
    note: "The diploma as ticket \u2014 content irrelevant, only the credential matters"
  },
  {
    id: "stemPush",
    label: "STEM Ideology",
    sub: "'Learn to code' as sole value",
    col: 4,
    h: 50,
    color: "#aa5a4a",
    score: 10,
    note: "Only instrumental knowledge counts \u2014 humanities as luxury or waste"
  },
  {
    id: "libArtsModern",
    label: "Liberal Arts Colleges",
    sub: "Small, residential \xB7 ~200 schools",
    col: 4,
    h: 40,
    color: "#8aaa6a",
    score: 55,
    note: "Surviving reservoir \u2014 shrinking enrollments, existential financial pressure"
  },
  {
    id: "contemplativeEd",
    label: "Contemplative Education",
    sub: "Waldorf, classical, forest schools \xB7 ~2M",
    col: 5,
    h: 40,
    color: "#3ac5b5",
    score: 75,
    glow: true,
    yOverride: 195,
    note: "Thin stream \u2014 whole-child formation, inner life, beauty as pedagogy"
  },
  {
    id: "homeschoolClassical",
    label: "Classical Homeschool",
    sub: "Charlotte Mason, Well-Trained Mind",
    col: 5,
    h: 35,
    color: "#8aaa6a",
    score: 65,
    yOverride: 260,
    note: "Parent-led recovery of liberal arts \u2014 living books, narration, wonder"
  },
  {
    id: "seminar",
    label: "Great Books / Seminar",
    sub: "St. John's, Gutenberg, Catherine Project",
    col: 5,
    h: 35,
    color: "#7a9aaa",
    score: 70,
    glow: true,
    yOverride: 320,
    note: "Primary text encounter \u2014 small, fragile, irreplaceable"
  },
  {
    id: "mooc",
    label: "MOOCs / EdTech",
    sub: "Coursera, Khan Academy \xB7 content delivery",
    col: 5,
    h: 50,
    color: "#e84450",
    score: 5,
    yOverride: 510,
    note: "Education as content pipeline \u2014 watch videos, pass quizzes, get certificate"
  },
  {
    id: "bootcamp",
    label: "Coding Bootcamps",
    sub: "12 weeks to job-ready \xB7 $15B market",
    col: 5,
    h: 45,
    color: "#dd3a4a",
    score: 3,
    yOverride: 580,
    note: "Pure skill extraction \u2014 the human as code-producing unit"
  },
  {
    id: "corporateTraining",
    label: "Corporate Training",
    sub: "Upskilling, compliance, LMS",
    col: 5,
    h: 45,
    color: "#993a3a",
    score: 2,
    yOverride: 645,
    note: "Learning in service of employer \u2014 you are human capital to be developed"
  },
  {
    id: "aiTutor",
    label: "AI Tutoring / Personalized",
    sub: "Adaptive algorithms \xB7 Khanmigo",
    col: 5,
    h: 45,
    color: "#cc5544",
    score: 8,
    yOverride: 440,
    note: "Optimization of content delivery \u2014 efficient but disembodied"
  },
  {
    id: "microCredential",
    label: "Micro-credentials / Badges",
    sub: "Stackable certificates \xB7 LinkedIn",
    col: 5,
    h: 40,
    color: "#e84450",
    score: 2,
    yOverride: 720,
    note: "Education atomized into resume tokens \u2014 the credential without the formation"
  }
];
var nodes2 = nodesRaw2.map((n) => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY2(n.score) - n.h / 2
}));
var nodeMap2 = {};
nodes2.forEach((n) => {
  nodeMap2[n.id] = n;
});
var links2 = [
  { from: "ancient", to: "monastic", value: 12, stream: "monastic" },
  { from: "ancient", to: "medieval", value: 18, stream: "ancient" },
  { from: "ancient", to: "humanistRen", value: 15, stream: "paideia" },
  { from: "ancient", to: "catechism", value: 10, stream: "catechism" },
  { from: "monastic", to: "bildung", value: 5, stream: "bildung" },
  { from: "monastic", to: "liberalArts", value: 5, stream: "liberal" },
  { from: "humanistRen", to: "bildung", value: 10, stream: "bildung" },
  { from: "humanistRen", to: "liberalArts", value: 5, stream: "liberal" },
  { from: "humanistRen", to: "rousseau", value: 4, stream: "progressive" },
  { from: "medieval", to: "liberalArts", value: 6, stream: "liberal" },
  { from: "medieval", to: "prussian", value: 8, stream: "prussian" },
  { from: "catechism", to: "prussian", value: 8, stream: "prussian" },
  { from: "catechism", to: "liberalArts", value: 2, stream: "catechism" },
  { from: "bildung", to: "montessori", value: 4, stream: "montessori" },
  { from: "bildung", to: "waldorf", value: 4, stream: "waldorf" },
  { from: "bildung", to: "greatBooks", value: 4, stream: "greatBooks" },
  { from: "rousseau", to: "montessori", value: 4, stream: "montessori" },
  { from: "rousseau", to: "dewey", value: 5, stream: "dewey" },
  { from: "liberalArts", to: "greatBooks", value: 5, stream: "greatBooks" },
  { from: "liberalArts", to: "dewey", value: 3, stream: "progressive" },
  { from: "liberalArts", to: "landGrant", value: 3, stream: "humanist" },
  { from: "prussian", to: "factorySchool", value: 16, stream: "industrial" },
  { from: "prussian", to: "landGrant", value: 4, stream: "prussian" },
  { from: "montessori", to: "unschooling", value: 3, stream: "unschool" },
  { from: "montessori", to: "classicalRenewal", value: 2, stream: "classical" },
  { from: "waldorf", to: "classicalRenewal", value: 3, stream: "classical" },
  { from: "waldorf", to: "unschooling", value: 2, stream: "unschool" },
  { from: "greatBooks", to: "classicalRenewal", value: 4, stream: "classical" },
  { from: "greatBooks", to: "libArtsModern", value: 4, stream: "greatBooks" },
  { from: "dewey", to: "libArtsModern", value: 3, stream: "progressive" },
  { from: "dewey", to: "standardizedTesting", value: 3, stream: "testing" },
  { from: "factorySchool", to: "standardizedTesting", value: 12, stream: "testing" },
  { from: "factorySchool", to: "credential", value: 10, stream: "credential" },
  { from: "factorySchool", to: "stemPush", value: 6, stream: "stem" },
  { from: "landGrant", to: "stemPush", value: 4, stream: "stem" },
  { from: "landGrant", to: "credential", value: 3, stream: "credential" },
  { from: "classicalRenewal", to: "contemplativeEd", value: 4, stream: "classical" },
  { from: "classicalRenewal", to: "homeschoolClassical", value: 4, stream: "classical" },
  { from: "unschooling", to: "contemplativeEd", value: 3, stream: "unschool" },
  { from: "libArtsModern", to: "seminar", value: 4, stream: "greatBooks" },
  { from: "libArtsModern", to: "homeschoolClassical", value: 2, stream: "liberal" },
  { from: "standardizedTesting", to: "mooc", value: 6, stream: "mooc" },
  { from: "standardizedTesting", to: "aiTutor", value: 5, stream: "testing" },
  { from: "standardizedTesting", to: "microCredential", value: 4, stream: "credential" },
  { from: "credential", to: "bootcamp", value: 6, stream: "corporate" },
  { from: "credential", to: "corporateTraining", value: 5, stream: "corporate" },
  { from: "credential", to: "microCredential", value: 5, stream: "credential" },
  { from: "credential", to: "mooc", value: 4, stream: "mooc" },
  { from: "stemPush", to: "bootcamp", value: 5, stream: "stem" },
  { from: "stemPush", to: "aiTutor", value: 3, stream: "stem" }
];
function computeLinks2() {
  const outOffsets = {};
  const inOffsets = {};
  nodes2.forEach((n) => {
    outOffsets[n.id] = 0;
    inOffsets[n.id] = 0;
  });
  const outTotal = {};
  const inTotal = {};
  nodes2.forEach((n) => {
    outTotal[n.id] = 0;
    inTotal[n.id] = 0;
  });
  links2.forEach((l) => {
    outTotal[l.from] = (outTotal[l.from] || 0) + l.value;
    inTotal[l.to] = (inTotal[l.to] || 0) + l.value;
  });
  return links2.map((link) => {
    const fn = nodeMap2[link.from];
    const tn = nodeMap2[link.to];
    const pad = 4;
    const fAvail = fn.h - pad * 2;
    const fScale = fAvail / Math.max(outTotal[fn.id], 1);
    const thickness = Math.max(3, link.value * fScale);
    const fY = fn.y + pad + outOffsets[fn.id] * fScale + thickness / 2;
    outOffsets[fn.id] += link.value;
    const tAvail = tn.h - pad * 2;
    const tScale = tAvail / Math.max(inTotal[tn.id], 1);
    const tThick = Math.max(3, link.value * tScale);
    const tY = tn.y + pad + inOffsets[tn.id] * tScale + tThick / 2;
    inOffsets[tn.id] += link.value;
    const x1 = COL_X2[fn.col] + NODE_W2;
    const x2 = COL_X2[tn.col];
    return { ...link, x1, y1: fY, x2, y2: tY, thickness: Math.min(thickness, tThick) };
  });
}
function FlowBand2({ link, gradientId, dimmed, highlighted }) {
  const { x1, y1, x2, y2, thickness } = link;
  const halfT = thickness / 2;
  const cp = (x2 - x1) * 0.42;
  const d = `M ${x1} ${y1 - halfT} C ${x1 + cp} ${y1 - halfT}, ${x2 - cp} ${y2 - halfT}, ${x2} ${y2 - halfT} L ${x2} ${y2 + halfT} C ${x2 - cp} ${y2 + halfT}, ${x1 + cp} ${y1 + halfT}, ${x1} ${y1 + halfT} Z`;
  return /* @__PURE__ */ jsx2("path", {
    d,
    fill: `url(#${gradientId})`,
    opacity: dimmed ? 0.03 : highlighted ? 0.6 : 0.3,
    style: { transition: "opacity 0.4s ease" }
  });
}
function ScorePill2({ score, x, y }) {
  const color = scoreToColor2(score);
  const pillW = 30;
  const pillH = 12;
  return /* @__PURE__ */ jsxs2("g", {
    children: [
      /* @__PURE__ */ jsx2("rect", {
        x,
        y,
        width: pillW,
        height: pillH,
        rx: 6,
        fill: color,
        opacity: 0.15
      }),
      /* @__PURE__ */ jsx2("rect", {
        x: x + 1,
        y: y + 1,
        width: Math.max(2, (pillW - 2) * (score / 100)),
        height: pillH - 2,
        rx: 5,
        fill: color,
        opacity: 0.55
      }),
      /* @__PURE__ */ jsx2("text", {
        x: x + pillW + 4,
        y: y + 10,
        fill: color,
        fontSize: "10.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        children: score
      })
    ]
  });
}
function NodeRect2({ node, onHover, dimmed, isHovered }) {
  const x = COL_X2[node.col];
  const isRight = node.col >= 4;
  const isLeft = node.col <= 1;
  const labelX = isRight ? x + NODE_W2 + 10 : isLeft ? x + NODE_W2 + 10 : x - 8;
  const anchor = isRight ? "start" : isLeft ? "start" : "end";
  return /* @__PURE__ */ jsxs2("g", {
    onMouseEnter: () => onHover(node.id),
    onMouseLeave: () => onHover(null),
    style: { cursor: "pointer", opacity: dimmed ? 0.1 : 1, transition: "opacity 0.4s ease" },
    children: [
      node.glow && /* @__PURE__ */ jsxs2(Fragment2, {
        children: [
          /* @__PURE__ */ jsx2("rect", {
            x: x - 4,
            y: node.y - 4,
            width: NODE_W2 + 8,
            height: node.h + 8,
            rx: 4,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 1.5,
            opacity: 0.3
          }),
          /* @__PURE__ */ jsx2("rect", {
            x: x - 8,
            y: node.y - 8,
            width: NODE_W2 + 16,
            height: node.h + 16,
            rx: 6,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 0.5,
            opacity: 0.15
          })
        ]
      }),
      /* @__PURE__ */ jsx2("rect", {
        x,
        y: node.y,
        width: NODE_W2,
        height: node.h,
        rx: 3,
        fill: node.color,
        opacity: isHovered ? 1 : 0.9,
        stroke: isHovered ? "#fff" : "none",
        strokeWidth: 1.5
      }),
      /* @__PURE__ */ jsx2("text", {
        x: labelX,
        y: node.y + node.h / 2 - 12,
        fill: COLORS2.text,
        fontSize: "13",
        fontWeight: "700",
        fontFamily: "'Crimson Pro', Georgia, serif",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.label
      }),
      /* @__PURE__ */ jsx2("text", {
        x: labelX,
        y: node.y + node.h / 2 + 1,
        fill: COLORS2.textDim,
        fontSize: "10.5",
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontStyle: "italic",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.sub
      }),
      /* @__PURE__ */ jsx2(ScorePill2, {
        score: node.score,
        x: anchor === "end" ? labelX - 48 : labelX,
        y: node.y + node.h / 2 + 10
      }),
      isHovered && node.note && /* @__PURE__ */ jsxs2("g", {
        children: [
          /* @__PURE__ */ jsx2("rect", {
            x: x + (isRight ? -10 : -360),
            y: node.y - 38,
            width: 360,
            height: 30,
            rx: 4,
            fill: "#1a1a18ee",
            stroke: scoreToColor2(node.score),
            strokeWidth: 0.7
          }),
          /* @__PURE__ */ jsx2("text", {
            x: x + (isRight ? -10 : -360) + 8,
            y: node.y - 18,
            fill: COLORS2.textDim,
            fontSize: "14",
            fontFamily: "'Crimson Pro', serif",
            fontStyle: "italic",
            children: node.note
          })
        ]
      })
    ]
  });
}
function InvertedBracket2() {
  const x = COL_X2[5] + NODE_W2 + 200;
  const y1 = 505;
  const y2 = 765;
  const mid = (y1 + y2) / 2;
  return /* @__PURE__ */ jsxs2("g", {
    opacity: 0.3,
    children: [
      /* @__PURE__ */ jsx2("path", {
        d: `M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx2("path", {
        d: `M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx2("text", {
        x: x + 28,
        y: mid - 6,
        fill: "#e84450",
        fontSize: "9.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        letterSpacing: "0.06em",
        children: "ALL SCORE \u2264 8"
      }),
      /* @__PURE__ */ jsx2("text", {
        x: x + 28,
        y: mid + 6,
        fill: COLORS2.textMuted,
        fontSize: "9.5",
        fontFamily: "'Crimson Pro', serif",
        fontStyle: "italic",
        children: "formation eliminated"
      })
    ]
  });
}
var eraLabels2 = [
  { x: COL_X2[0] + 7, label: "ANCIENT" },
  { x: COL_X2[1] + 7, label: "MEDIEVAL" },
  { x: COL_X2[2] + 7, label: "ENLIGHTENMENT" },
  { x: COL_X2[3] + 7, label: "19TH\u2013EARLY 20TH" },
  { x: COL_X2[4] + 7, label: "LATE 20TH C." },
  { x: COL_X2[5] + 7, label: "CONTEMPORARY" }
];
function EducationSankey() {
  const [hovered, setHovered] = useState2(null);
  const linkData = useMemo2(() => computeLinks2(), []);
  const connectedIds = useMemo2(() => {
    if (!hovered)
      return /* @__PURE__ */ new Set();
    const ids = /* @__PURE__ */ new Set([hovered]);
    const visitedFwd = /* @__PURE__ */ new Set();
    const visitedBack = /* @__PURE__ */ new Set();
    const fwdQ = [hovered];
    while (fwdQ.length) {
      const cur = fwdQ.pop();
      if (visitedFwd.has(cur))
        continue;
      visitedFwd.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.from === cur) {
          ids.add(l.to);
          fwdQ.push(l.to);
        }
      });
    }
    const bwdQ = [hovered];
    while (bwdQ.length) {
      const cur = bwdQ.pop();
      if (visitedBack.has(cur))
        continue;
      visitedBack.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.to === cur) {
          ids.add(l.from);
          bwdQ.push(l.from);
        }
      });
    }
    return ids;
  }, [hovered, linkData]);
  const isLinkHL = (link) => hovered && connectedIds.has(link.from) && connectedIds.has(link.to);
  return /* @__PURE__ */ jsxs2("div", {
    style: {
      background: `radial-gradient(ellipse at 20% 15%, #1a1815 0%, ${COLORS2.bg} 70%)`,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 16px 20px",
      fontFamily: "'Crimson Pro', Georgia, serif"
    },
    children: [
      /* @__PURE__ */ jsx2("link", {
        href: "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400&family=JetBrains+Mono:wght@300;400;600&display=swap",
        rel: "stylesheet"
      }),
      /* @__PURE__ */ jsx2("h1", {
        style: {
          color: COLORS2.text,
          fontSize: "30px",
          fontWeight: 300,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: "2px",
          textAlign: "center"
        },
        children: "The Flattening of Formation"
      }),
      /* @__PURE__ */ jsxs2("p", {
        style: {
          color: COLORS2.textDim,
          fontSize: "16px",
          fontWeight: 300,
          fontStyle: "italic",
          marginBottom: "12px",
          textAlign: "center",
          maxWidth: 700,
          lineHeight: 1.5
        },
        children: [
          "From ",
          /* @__PURE__ */ jsx2("em", {
            children: "paideia"
          }),
          " to micro-credentials \u2014 how education moved from forming whole persons to producing human capital. Hover for diagnostic notes."
        ]
      }),
      /* @__PURE__ */ jsx2("div", {
        style: { display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" },
        children: [
          { color: "#3ac5b5", label: "Formative (70\u2013100)" },
          { color: "#7aaa8a", label: "Moderate (50\u201369)" },
          { color: "#b8924a", label: "Mixed (35\u201349)" },
          { color: "#d48a4e", label: "Thinned (20\u201334)" },
          { color: "#cc6644", label: "Instrumental (10\u201319)" },
          { color: "#e84450", label: "Fully extractive (0\u20139)" }
        ].map((item, i) => /* @__PURE__ */ jsxs2("div", {
          style: { display: "flex", alignItems: "center", gap: "5px" },
          children: [
            /* @__PURE__ */ jsx2("div", {
              style: {
                width: 14,
                height: 5,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${item.color}cc, ${item.color}55)`
              }
            }),
            /* @__PURE__ */ jsx2("span", {
              style: { color: COLORS2.textDim },
              children: item.label
            })
          ]
        }, i))
      }),
      /* @__PURE__ */ jsxs2("svg", {
        viewBox: `0 -10 ${W2} ${H2 + 80}`,
        width: "100%",
        style: { maxWidth: W2 + 20, overflow: "visible" },
        children: [
          /* @__PURE__ */ jsxs2("defs", {
            children: [
              /* @__PURE__ */ jsxs2("linearGradient", {
                id: "bgVertGrad",
                x1: "0",
                y1: "0",
                x2: "0",
                y2: "1",
                children: [
                  /* @__PURE__ */ jsx2("stop", {
                    offset: "0%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.05"
                  }),
                  /* @__PURE__ */ jsx2("stop", {
                    offset: "30%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx2("stop", {
                    offset: "50%",
                    stopColor: "#b8924a",
                    stopOpacity: "0.01"
                  }),
                  /* @__PURE__ */ jsx2("stop", {
                    offset: "70%",
                    stopColor: "#e84450",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx2("stop", {
                    offset: "100%",
                    stopColor: "#e84450",
                    stopOpacity: "0.07"
                  })
                ]
              }),
              linkData.map((link, i) => {
                const sc = STREAM_COLORS2[link.stream] || { start: "#888", end: "#888" };
                return /* @__PURE__ */ jsxs2("linearGradient", {
                  id: `fg-${i}`,
                  x1: "0",
                  y1: "0",
                  x2: "1",
                  y2: "0",
                  children: [
                    /* @__PURE__ */ jsx2("stop", {
                      offset: "0%",
                      stopColor: sc.start,
                      stopOpacity: "0.8"
                    }),
                    /* @__PURE__ */ jsx2("stop", {
                      offset: "50%",
                      stopColor: sc.start,
                      stopOpacity: "0.4"
                    }),
                    /* @__PURE__ */ jsx2("stop", {
                      offset: "100%",
                      stopColor: sc.end,
                      stopOpacity: "0.8"
                    })
                  ]
                }, `g${i}`);
              })
            ]
          }),
          /* @__PURE__ */ jsx2("rect", {
            x: LEFT_MARGIN2 - 10,
            y: TOP_Y2 - 15,
            width: W2 - LEFT_MARGIN2 + 10,
            height: BOT_Y2 - TOP_Y2 + 60,
            fill: "url(#bgVertGrad)",
            rx: 8
          }),
          /* @__PURE__ */ jsxs2("g", {
            children: [
              /* @__PURE__ */ jsx2("line", {
                x1: 58,
                y1: TOP_Y2 + 5,
                x2: 58,
                y2: BOT_Y2 + 10,
                stroke: COLORS2.textMuted,
                strokeWidth: 0.5,
                opacity: 0.25
              }),
              /* @__PURE__ */ jsx2("path", {
                d: "M 55 32 L 58 22 L 61 32",
                fill: "none",
                stroke: "#3ac5b5",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx2("path", {
                d: `M 55 ${BOT_Y2 + 3} L 58 ${BOT_Y2 + 13} L 61 ${BOT_Y2 + 3}`,
                fill: "none",
                stroke: "#e84450",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx2("text", {
                x: 25,
                y: TOP_Y2 + 12,
                fill: "#3ac5b5",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "FORMATION"
              }),
              ["whole person", "encounter with truth", "inner transformation", "beauty & goodness"].map((w, i) => /* @__PURE__ */ jsx2("text", {
                x: 25,
                y: TOP_Y2 + 24 + i * 10,
                fill: "#3ac5b5",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w)),
              /* @__PURE__ */ jsx2("text", {
                x: 25,
                y: BOT_Y2 - 40,
                fill: "#e84450",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "EXTRACTION"
              }),
              ["human capital", "content delivery", "credential production", "skill as commodity"].map((w, i) => /* @__PURE__ */ jsx2("text", {
                x: 25,
                y: BOT_Y2 - 28 + i * 10,
                fill: "#e84450",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w))
            ]
          }),
          [75, 50, 25].map((score) => /* @__PURE__ */ jsxs2("g", {
            children: [
              /* @__PURE__ */ jsx2("line", {
                x1: LEFT_MARGIN2 - 5,
                y1: scoreToY2(score),
                x2: W2 - 20,
                y2: scoreToY2(score),
                stroke: COLORS2.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "4,12",
                opacity: 0.18
              }),
              /* @__PURE__ */ jsx2("text", {
                x: 63,
                y: scoreToY2(score) + 3,
                fill: COLORS2.textMuted,
                fontSize: "9",
                fontFamily: "'JetBrains Mono', monospace",
                opacity: 0.35,
                textAnchor: "end",
                children: score
              })
            ]
          }, score)),
          eraLabels2.map((era, i) => /* @__PURE__ */ jsxs2("g", {
            children: [
              /* @__PURE__ */ jsx2("line", {
                x1: COL_X2[i],
                y1: TOP_Y2 - 5,
                x2: COL_X2[i],
                y2: BOT_Y2 + 25,
                stroke: COLORS2.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "2,8",
                opacity: 0.2
              }),
              /* @__PURE__ */ jsx2("text", {
                x: era.x,
                y: BOT_Y2 + 45,
                fill: COLORS2.textMuted,
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                letterSpacing: "0.08em",
                children: era.label
              })
            ]
          }, i)),
          /* @__PURE__ */ jsx2(InvertedBracket2, {}),
          linkData.map((link, i) => /* @__PURE__ */ jsx2(FlowBand2, {
            link,
            gradientId: `fg-${i}`,
            dimmed: hovered ? !isLinkHL(link) : false,
            highlighted: isLinkHL(link)
          }, i)),
          nodes2.map((node) => /* @__PURE__ */ jsx2(NodeRect2, {
            node,
            onHover: setHovered,
            dimmed: hovered && !connectedIds.has(node.id),
            isHovered: hovered === node.id
          }, node.id))
        ]
      }),
      /* @__PURE__ */ jsx2("div", {
        style: {
          maxWidth: 750,
          marginTop: "8px",
          padding: "14px 20px",
          background: "rgba(255,255,255,0.025)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.05)"
        },
        children: /* @__PURE__ */ jsxs2("p", {
          style: {
            color: COLORS2.textDim,
            fontSize: "14px",
            lineHeight: 1.7,
            margin: 0,
            fontFamily: "'Crimson Pro', serif",
            fontWeight: 300
          },
          children: [
            /* @__PURE__ */ jsx2("strong", {
              style: { color: COLORS2.text, fontWeight: 600 },
              children: "From souls to skills:"
            }),
            " ",
            /* @__PURE__ */ jsx2("span", {
              style: { color: "#2ee8d0" },
              children: "Bildung"
            }),
            " at 90 is the Eckhart of education \u2014 self-cultivation as encounter with culture, the person unfolding into wholeness.",
            " ",
            /* @__PURE__ */ jsx2("span", {
              style: { color: "#d48a4e" },
              children: "The Prussian model"
            }),
            " at 15 is the fork \u2014 compulsory state schooling designed to produce obedient citizens and factory workers.",
            " ",
            /* @__PURE__ */ jsx2("span", {
              style: { color: "#8aaa6a" },
              children: "Dewey"
            }),
            " at 55 is this diagram's Catholicism \u2014 genuinely tried to hold both formation and function, with mixed results.",
            " ",
            "The contemporary teal stream \u2014 ",
            /* @__PURE__ */ jsx2("span", {
              style: { color: "#3ac5b5" },
              children: "classical schools"
            }),
            ",",
            " ",
            /* @__PURE__ */ jsx2("span", {
              style: { color: "#7a9aaa" },
              children: "Great Books seminars"
            }),
            ",",
            " ",
            "Charlotte Mason homeschoolers \u2014 is the contemplative remnant: small, underfunded, and irreplaceable. The ",
            /* @__PURE__ */ jsx2("span", {
              style: { color: "#e84450" },
              children: "red zone"
            }),
            " is education with the education removed \u2014 credential production, content delivery, and human capital development."
          ]
        })
      })
    ]
  });
}

// content/pages/artifacts/metaphysical-choices-sankey/theological-sankey.jsx
import { useState as useState3, useMemo as useMemo3 } from "https://esm.sh/react";
import { Fragment as Fragment3, jsx as jsx3, jsxs as jsxs3 } from "https://esm.sh/react/jsx-runtime";
var COLORS3 = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848"
};
var STREAM_COLORS3 = {
  orthodox: { start: "#8B72BE", end: "#7a6aad" },
  catholic: { start: "#b8924a", end: "#a07a3a" },
  mystical: { start: "#3ac5b5", end: "#2a9a8a" },
  nominalist: { start: "#d48a4e", end: "#c4703e" },
  reformation: { start: "#d48a4e", end: "#c46a3e" },
  reformed: { start: "#cc6644", end: "#b85a3e" },
  pietist: { start: "#d4a06e", end: "#c48a5e" },
  mainline: { start: "#8aaa6a", end: "#7a9a5a" },
  contemplative: { start: "#3ac5b5", end: "#2aaa9a" },
  pentecostal: { start: "#e06050", end: "#d45a4a" },
  fundamentalist: { start: "#cc5544", end: "#aa4a3a" },
  amEvang: { start: "#d48a4e", end: "#cc6644" },
  prosperity: { start: "#e84450", end: "#d4344a" },
  dispensationalism: { start: "#cc6654", end: "#ba5a4a" },
  nationalism: { start: "#993a3a", end: "#8a2a2a" },
  dominion: { start: "#aa5a4a", end: "#9a4a3a" },
  wordOfFaith: { start: "#dd3a4a", end: "#cc2a3a" }
};
var W3 = 1700;
var H3 = 880;
var LEFT_MARGIN3 = 100;
var COL_X3 = [LEFT_MARGIN3 + 10, LEFT_MARGIN3 + 250, LEFT_MARGIN3 + 490, LEFT_MARGIN3 + 730, LEFT_MARGIN3 + 1e3, LEFT_MARGIN3 + 1270];
var NODE_W3 = 16;
var TOP_Y3 = 25;
var BOT_Y3 = 820;
function scoreToY3(score) {
  return TOP_Y3 + (BOT_Y3 - TOP_Y3) * (1 - score / 100);
}
function scoreToColor3(score) {
  if (score >= 70)
    return "#3ac5b5";
  if (score >= 50)
    return "#7aaa8a";
  if (score >= 35)
    return "#b8924a";
  if (score >= 20)
    return "#d48a4e";
  if (score >= 10)
    return "#cc6644";
  return "#e84450";
}
var nodesRaw3 = [
  {
    id: "early",
    label: "Early Church",
    sub: "1st\u20134th c.",
    col: 0,
    h: 220,
    color: "#c9a84c",
    score: 60,
    note: "Mixed \u2014 Desert Fathers & institutional hierarchy coexist"
  },
  {
    id: "orthodox",
    label: "Eastern Orthodox",
    sub: "220M",
    col: 1,
    h: 75,
    color: "#7a6aad",
    score: 75,
    note: "Theosis, apophatic theology, hesychasm \u2014 strong participatory DNA"
  },
  {
    id: "western",
    label: "Western Church",
    sub: "5th\u201313th c.",
    col: 1,
    h: 200,
    color: "#b8924a",
    score: 55,
    note: "Aquinas's participation + growing institutional legalism"
  },
  {
    id: "mystical",
    label: "Mystical / Participatory",
    sub: "Eckhart, Rhineland Mystics",
    col: 2,
    h: 65,
    color: "#3ac5b5",
    score: 95,
    glow: true,
    note: "The source \u2014 Gelassenheit, sunder warumbe, ground of being"
  },
  {
    id: "nominalist",
    label: "Nominalist / Voluntarist",
    sub: "Ockham, Scotus \u2014 14th c.",
    col: 2,
    h: 105,
    color: "#d48a4e",
    score: 12,
    note: "THE FORK \u2014 God as supreme will, not ground of being"
  },
  {
    id: "cathContinue",
    label: "Catholic Church",
    sub: "1.4B",
    col: 2,
    h: 170,
    color: "#b8924a",
    score: 55,
    note: "Theology ~70% participatory, practice ~40% \u2014 holds both"
  },
  {
    id: "contemplative",
    label: "Contemplative Tradition",
    sub: "John of Cross, Teresa, Cloud",
    col: 3,
    h: 45,
    color: "#3ac5b5",
    score: 90,
    glow: true,
    note: "Preserves the interior, apophatic, detached tradition"
  },
  {
    id: "reformation",
    label: "Reformation",
    sub: "1517 \u2192",
    col: 3,
    h: 70,
    color: "#cc6644",
    score: 18,
    note: "Sola scriptura + forensic justification = voluntarist framework"
  },
  {
    id: "reformed",
    label: "Reformed / Calvinist",
    sub: "75M",
    col: 3,
    h: 55,
    color: "#b85a3e",
    score: 12,
    note: "TULIP, divine sovereignty as will, double predestination"
  },
  {
    id: "pietist",
    label: "Pietist / Methodist",
    sub: "80M",
    col: 3,
    h: 50,
    color: "#c48a5e",
    score: 30,
    note: "Some interiority (heart religion) but experiential, not apophatic"
  },
  {
    id: "mainline",
    label: "Mainline Protestant",
    sub: "80M",
    col: 3,
    h: 50,
    color: "#8aaa6a",
    score: 35,
    note: "Some recovered contemplative elements; less transactional"
  },
  {
    id: "modContemp",
    label: "Modern Contemplatives",
    sub: "Merton, Keating, Rohr \xB7 ~10M",
    col: 4,
    h: 32,
    color: "#3ac5b5",
    score: 88,
    glow: true,
    note: "Active recovery of Eckhartian interiority & participation"
  },
  {
    id: "amEvang",
    label: "American Evangelicalism",
    sub: "Great Awakenings \u2192 incl. McLean Bible",
    col: 4,
    h: 68,
    color: "#d48a4e",
    score: 14,
    note: "Propositional faith, forensic atonement, decisionism"
  },
  {
    id: "pentecostal",
    label: "Pentecostalism",
    sub: "300M",
    col: 4,
    h: 75,
    color: "#e06050",
    score: 10,
    note: "Experiential but exteriorized \u2014 power, signs, spiritual combat"
  },
  {
    id: "fundamentalism",
    label: "Fundamentalism",
    sub: "~100M",
    col: 4,
    h: 65,
    color: "#cc5544",
    score: 6,
    note: "Epistemological certainty replaces unknowing; inerrancy"
  },
  {
    id: "prosperity",
    label: "Prosperity Gospel",
    sub: "Osteen, Copeland \xB7 ~300M",
    col: 5,
    h: 65,
    color: "#e84450",
    score: 2,
    yOverride: 470,
    note: "Acquisition vs. poverty \u2014 most direct inversion of Gelassenheit"
  },
  {
    id: "wordOfFaith",
    label: "Word of Faith",
    sub: "name it, claim it \xB7 ~150M",
    col: 5,
    h: 55,
    color: "#dd3a4a",
    score: 3,
    yOverride: 555,
    note: "Spoken words as causal magic \u2014 technique replaces contemplation"
  },
  {
    id: "dispensationalism",
    label: "Dispensationalism",
    sub: "Darby \u2192 Scofield \xB7 ~50M",
    col: 5,
    h: 48,
    color: "#cc6654",
    score: 5,
    yOverride: 630,
    note: "Obsessive timeline replaces Eckhart's eternal now"
  },
  {
    id: "nationalism",
    label: "Christian Nationalism",
    sub: "dominion + identity \xB7 ~35M",
    col: 5,
    h: 48,
    color: "#993a3a",
    score: 3,
    yOverride: 698,
    note: "Exteriorizes faith into political conquest"
  },
  {
    id: "dominion",
    label: "Dominion / 7 Mountains",
    sub: "cultural conquest \xB7 ~15M",
    col: 5,
    h: 42,
    color: "#aa5a4a",
    score: 2,
    yOverride: 766,
    note: "Power over vs. participation in \u2014 institutional capture"
  }
];
var nodes3 = nodesRaw3.map((n) => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY3(n.score) - n.h / 2
}));
var nodeMap3 = {};
nodes3.forEach((n) => {
  nodeMap3[n.id] = n;
});
var links3 = [
  { from: "early", to: "orthodox", value: 18, stream: "orthodox" },
  { from: "early", to: "western", value: 82, stream: "catholic" },
  { from: "western", to: "mystical", value: 10, stream: "mystical" },
  { from: "western", to: "nominalist", value: 28, stream: "nominalist" },
  { from: "western", to: "cathContinue", value: 50, stream: "catholic" },
  { from: "mystical", to: "contemplative", value: 7, stream: "contemplative" },
  { from: "mystical", to: "cathContinue", value: 3, stream: "mystical" },
  { from: "nominalist", to: "reformation", value: 22, stream: "reformation" },
  { from: "nominalist", to: "cathContinue", value: 6, stream: "nominalist" },
  { from: "contemplative", to: "modContemp", value: 5, stream: "contemplative" },
  { from: "reformation", to: "reformed", value: 9, stream: "reformed" },
  { from: "reformation", to: "pietist", value: 7, stream: "pietist" },
  { from: "reformation", to: "mainline", value: 6, stream: "mainline" },
  { from: "reformed", to: "amEvang", value: 7, stream: "reformed" },
  { from: "pietist", to: "amEvang", value: 5, stream: "pietist" },
  { from: "pietist", to: "pentecostal", value: 2, stream: "pentecostal" },
  { from: "amEvang", to: "pentecostal", value: 6, stream: "pentecostal" },
  { from: "amEvang", to: "fundamentalism", value: 6, stream: "fundamentalist" },
  { from: "pentecostal", to: "prosperity", value: 10, stream: "prosperity" },
  { from: "pentecostal", to: "wordOfFaith", value: 7, stream: "wordOfFaith" },
  { from: "fundamentalism", to: "dispensationalism", value: 5, stream: "dispensationalism" },
  { from: "fundamentalism", to: "nationalism", value: 4, stream: "nationalism" },
  { from: "fundamentalism", to: "dominion", value: 3, stream: "dominion" },
  { from: "amEvang", to: "nationalism", value: 2, stream: "nationalism" }
];
function computeLinks3() {
  const outOffsets = {};
  const inOffsets = {};
  nodes3.forEach((n) => {
    outOffsets[n.id] = 0;
    inOffsets[n.id] = 0;
  });
  const outTotal = {};
  const inTotal = {};
  nodes3.forEach((n) => {
    outTotal[n.id] = 0;
    inTotal[n.id] = 0;
  });
  links3.forEach((l) => {
    outTotal[l.from] = (outTotal[l.from] || 0) + l.value;
    inTotal[l.to] = (inTotal[l.to] || 0) + l.value;
  });
  return links3.map((link) => {
    const fn = nodeMap3[link.from];
    const tn = nodeMap3[link.to];
    const pad = 4;
    const fAvail = fn.h - pad * 2;
    const fScale = fAvail / Math.max(outTotal[fn.id], 1);
    const thickness = Math.max(3, link.value * fScale);
    const fY = fn.y + pad + outOffsets[fn.id] * fScale + thickness / 2;
    outOffsets[fn.id] += link.value;
    const tAvail = tn.h - pad * 2;
    const tScale = tAvail / Math.max(inTotal[tn.id], 1);
    const tThick = Math.max(3, link.value * tScale);
    const tY = tn.y + pad + inOffsets[tn.id] * tScale + tThick / 2;
    inOffsets[tn.id] += link.value;
    const x1 = COL_X3[fn.col] + NODE_W3;
    const x2 = COL_X3[tn.col];
    return { ...link, x1, y1: fY, x2, y2: tY, thickness: Math.min(thickness, tThick) };
  });
}
function FlowBand3({ link, gradientId, dimmed, highlighted }) {
  const { x1, y1, x2, y2, thickness } = link;
  const halfT = thickness / 2;
  const cp = (x2 - x1) * 0.42;
  const d = `M ${x1} ${y1 - halfT} C ${x1 + cp} ${y1 - halfT}, ${x2 - cp} ${y2 - halfT}, ${x2} ${y2 - halfT} L ${x2} ${y2 + halfT} C ${x2 - cp} ${y2 + halfT}, ${x1 + cp} ${y1 + halfT}, ${x1} ${y1 + halfT} Z`;
  return /* @__PURE__ */ jsx3("path", {
    d,
    fill: `url(#${gradientId})`,
    opacity: dimmed ? 0.03 : highlighted ? 0.6 : 0.3,
    style: { transition: "opacity 0.4s ease" }
  });
}
function ScorePill3({ score, x, y }) {
  const color = scoreToColor3(score);
  const pillW = 30;
  const pillH = 12;
  return /* @__PURE__ */ jsxs3("g", {
    children: [
      /* @__PURE__ */ jsx3("rect", {
        x,
        y,
        width: pillW,
        height: pillH,
        rx: 6,
        fill: color,
        opacity: 0.15
      }),
      /* @__PURE__ */ jsx3("rect", {
        x: x + 1,
        y: y + 1,
        width: Math.max(2, (pillW - 2) * (score / 100)),
        height: pillH - 2,
        rx: 5,
        fill: color,
        opacity: 0.55
      }),
      /* @__PURE__ */ jsx3("text", {
        x: x + pillW + 4,
        y: y + 10,
        fill: color,
        fontSize: "10.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        children: score
      })
    ]
  });
}
function NodeRect3({ node, onHover, dimmed, isHovered }) {
  const x = COL_X3[node.col];
  const isRight = node.col >= 4;
  const isLeft = node.col <= 1;
  const labelX = isRight ? x + NODE_W3 + 10 : isLeft ? x + NODE_W3 + 10 : x - 8;
  const anchor = isRight ? "start" : isLeft ? "start" : "end";
  return /* @__PURE__ */ jsxs3("g", {
    onMouseEnter: () => onHover(node.id),
    onMouseLeave: () => onHover(null),
    style: { cursor: "pointer", opacity: dimmed ? 0.1 : 1, transition: "opacity 0.4s ease" },
    children: [
      node.glow && /* @__PURE__ */ jsxs3(Fragment3, {
        children: [
          /* @__PURE__ */ jsx3("rect", {
            x: x - 4,
            y: node.y - 4,
            width: NODE_W3 + 8,
            height: node.h + 8,
            rx: 4,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 1.5,
            opacity: 0.3
          }),
          /* @__PURE__ */ jsx3("rect", {
            x: x - 8,
            y: node.y - 8,
            width: NODE_W3 + 16,
            height: node.h + 16,
            rx: 6,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 0.5,
            opacity: 0.15
          })
        ]
      }),
      /* @__PURE__ */ jsx3("rect", {
        x,
        y: node.y,
        width: NODE_W3,
        height: node.h,
        rx: 3,
        fill: node.color,
        opacity: isHovered ? 1 : 0.9,
        stroke: isHovered ? "#fff" : "none",
        strokeWidth: 1.5
      }),
      /* @__PURE__ */ jsx3("text", {
        x: labelX,
        y: node.y + node.h / 2 - 12,
        fill: COLORS3.text,
        fontSize: "13",
        fontWeight: "700",
        fontFamily: "'Crimson Pro', Georgia, serif",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.label
      }),
      /* @__PURE__ */ jsx3("text", {
        x: labelX,
        y: node.y + node.h / 2 + 1,
        fill: COLORS3.textDim,
        fontSize: "10.5",
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontStyle: "italic",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.sub
      }),
      /* @__PURE__ */ jsx3(ScorePill3, {
        score: node.score,
        x: anchor === "end" ? labelX - 48 : labelX,
        y: node.y + node.h / 2 + 10
      }),
      isHovered && node.note && /* @__PURE__ */ jsxs3("g", {
        children: [
          /* @__PURE__ */ jsx3("rect", {
            x: x + (isRight ? -10 : -330),
            y: node.y - 38,
            width: 330,
            height: 30,
            rx: 4,
            fill: "#1a1a18ee",
            stroke: scoreToColor3(node.score),
            strokeWidth: 0.7
          }),
          /* @__PURE__ */ jsx3("text", {
            x: x + (isRight ? -10 : -330) + 8,
            y: node.y - 18,
            fill: COLORS3.textDim,
            fontSize: "14",
            fontFamily: "'Crimson Pro', serif",
            fontStyle: "italic",
            children: node.note
          })
        ]
      })
    ]
  });
}
function InvertedBracket3() {
  const x = COL_X3[5] + NODE_W3 + 185;
  const y1 = 465;
  const y2 = 812;
  const mid = (y1 + y2) / 2;
  return /* @__PURE__ */ jsxs3("g", {
    opacity: 0.3,
    children: [
      /* @__PURE__ */ jsx3("path", {
        d: `M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx3("path", {
        d: `M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx3("text", {
        x: x + 28,
        y: mid - 6,
        fill: "#e84450",
        fontSize: "9.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        letterSpacing: "0.06em",
        children: "ALL SCORE \u2264 5"
      }),
      /* @__PURE__ */ jsx3("text", {
        x: x + 28,
        y: mid + 6,
        fill: COLORS3.textMuted,
        fontSize: "9.5",
        fontFamily: "'Crimson Pro', serif",
        fontStyle: "italic",
        children: "fully inverted"
      })
    ]
  });
}
var eraLabels3 = [
  { x: COL_X3[0] + 7, label: "ORIGINS" },
  { x: COL_X3[1] + 7, label: "SCHISM" },
  { x: COL_X3[2] + 7, label: "MEDIEVAL FORK" },
  { x: COL_X3[3] + 7, label: "REFORMATION" },
  { x: COL_X3[4] + 7, label: "AMERICAN" },
  { x: COL_X3[5] + 7, label: "CONTEMPORARY" }
];
function TheologicalSankey() {
  const [hovered, setHovered] = useState3(null);
  const linkData = useMemo3(() => computeLinks3(), []);
  const connectedIds = useMemo3(() => {
    if (!hovered)
      return /* @__PURE__ */ new Set();
    const ids = /* @__PURE__ */ new Set([hovered]);
    const visitedFwd = /* @__PURE__ */ new Set();
    const visitedBack = /* @__PURE__ */ new Set();
    const fwdQ = [hovered];
    while (fwdQ.length) {
      const cur = fwdQ.pop();
      if (visitedFwd.has(cur))
        continue;
      visitedFwd.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.from === cur) {
          ids.add(l.to);
          fwdQ.push(l.to);
        }
      });
    }
    const bwdQ = [hovered];
    while (bwdQ.length) {
      const cur = bwdQ.pop();
      if (visitedBack.has(cur))
        continue;
      visitedBack.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.to === cur) {
          ids.add(l.from);
          bwdQ.push(l.from);
        }
      });
    }
    return ids;
  }, [hovered, linkData]);
  const isLinkHL = (link) => hovered && connectedIds.has(link.from) && connectedIds.has(link.to);
  return /* @__PURE__ */ jsxs3("div", {
    style: {
      background: `radial-gradient(ellipse at 20% 15%, #1a1815 0%, ${COLORS3.bg} 70%)`,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 16px 20px",
      fontFamily: "'Crimson Pro', Georgia, serif"
    },
    children: [
      /* @__PURE__ */ jsx3("link", {
        href: "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400&family=JetBrains+Mono:wght@300;400;600&display=swap",
        rel: "stylesheet"
      }),
      /* @__PURE__ */ jsx3("h1", {
        style: {
          color: COLORS3.text,
          fontSize: "30px",
          fontWeight: 300,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: "2px",
          textAlign: "center"
        },
        children: "The Genealogy of Inversion"
      }),
      /* @__PURE__ */ jsxs3("p", {
        style: {
          color: COLORS3.textDim,
          fontSize: "16px",
          fontWeight: 300,
          fontStyle: "italic",
          marginBottom: "12px",
          textAlign: "center",
          maxWidth: 680,
          lineHeight: 1.5
        },
        children: [
          "Vertical position = alignment with Eckhart's participatory metaphysics. Each node shows an ",
          /* @__PURE__ */ jsx3("strong", {
            style: { color: COLORS3.text, fontWeight: 600 },
            children: "alignment score"
          }),
          " (0\u2013100). Hover for diagnostic notes."
        ]
      }),
      /* @__PURE__ */ jsx3("div", {
        style: { display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" },
        children: [
          { color: "#3ac5b5", label: "High alignment (70\u2013100)" },
          { color: "#7aaa8a", label: "Moderate (50\u201369)" },
          { color: "#b8924a", label: "Mixed (35\u201349)" },
          { color: "#d48a4e", label: "Low (20\u201334)" },
          { color: "#cc6644", label: "Very low (10\u201319)" },
          { color: "#e84450", label: "Inverted (0\u20139)" }
        ].map((item, i) => /* @__PURE__ */ jsxs3("div", {
          style: { display: "flex", alignItems: "center", gap: "5px" },
          children: [
            /* @__PURE__ */ jsx3("div", {
              style: {
                width: 14,
                height: 5,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${item.color}cc, ${item.color}55)`
              }
            }),
            /* @__PURE__ */ jsx3("span", {
              style: { color: COLORS3.textDim },
              children: item.label
            })
          ]
        }, i))
      }),
      /* @__PURE__ */ jsxs3("svg", {
        viewBox: `0 -10 ${W3} ${H3 + 80}`,
        width: "100%",
        style: { maxWidth: W3 + 20, overflow: "visible" },
        children: [
          /* @__PURE__ */ jsxs3("defs", {
            children: [
              /* @__PURE__ */ jsxs3("linearGradient", {
                id: "bgVertGrad",
                x1: "0",
                y1: "0",
                x2: "0",
                y2: "1",
                children: [
                  /* @__PURE__ */ jsx3("stop", {
                    offset: "0%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.05"
                  }),
                  /* @__PURE__ */ jsx3("stop", {
                    offset: "30%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx3("stop", {
                    offset: "50%",
                    stopColor: "#b8924a",
                    stopOpacity: "0.01"
                  }),
                  /* @__PURE__ */ jsx3("stop", {
                    offset: "70%",
                    stopColor: "#e84450",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx3("stop", {
                    offset: "100%",
                    stopColor: "#e84450",
                    stopOpacity: "0.07"
                  })
                ]
              }),
              linkData.map((link, i) => {
                const sc = STREAM_COLORS3[link.stream] || { start: "#888", end: "#888" };
                return /* @__PURE__ */ jsxs3("linearGradient", {
                  id: `fg-${i}`,
                  x1: "0",
                  y1: "0",
                  x2: "1",
                  y2: "0",
                  children: [
                    /* @__PURE__ */ jsx3("stop", {
                      offset: "0%",
                      stopColor: sc.start,
                      stopOpacity: "0.8"
                    }),
                    /* @__PURE__ */ jsx3("stop", {
                      offset: "50%",
                      stopColor: sc.start,
                      stopOpacity: "0.4"
                    }),
                    /* @__PURE__ */ jsx3("stop", {
                      offset: "100%",
                      stopColor: sc.end,
                      stopOpacity: "0.8"
                    })
                  ]
                }, `g${i}`);
              })
            ]
          }),
          /* @__PURE__ */ jsx3("rect", {
            x: LEFT_MARGIN3 - 10,
            y: TOP_Y3 - 15,
            width: W3 - LEFT_MARGIN3 + 10,
            height: BOT_Y3 - TOP_Y3 + 60,
            fill: "url(#bgVertGrad)",
            rx: 8
          }),
          /* @__PURE__ */ jsxs3("g", {
            children: [
              /* @__PURE__ */ jsx3("line", {
                x1: 58,
                y1: TOP_Y3 + 5,
                x2: 58,
                y2: BOT_Y3 + 10,
                stroke: COLORS3.textMuted,
                strokeWidth: 0.5,
                opacity: 0.25
              }),
              /* @__PURE__ */ jsx3("path", {
                d: "M 55 32 L 58 22 L 61 32",
                fill: "none",
                stroke: "#3ac5b5",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx3("path", {
                d: `M 55 ${BOT_Y3 + 3} L 58 ${BOT_Y3 + 13} L 61 ${BOT_Y3 + 3}`,
                fill: "none",
                stroke: "#e84450",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx3("text", {
                x: 25,
                y: TOP_Y3 + 12,
                fill: "#3ac5b5",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "ECKHARTIAN"
              }),
              ["interiority", "detachment", "participation", "apophasis"].map((w, i) => /* @__PURE__ */ jsx3("text", {
                x: 25,
                y: TOP_Y3 + 24 + i * 10,
                fill: "#3ac5b5",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w)),
              /* @__PURE__ */ jsx3("text", {
                x: 25,
                y: BOT_Y3 - 40,
                fill: "#e84450",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "INVERTED"
              }),
              ["exteriority", "acquisition", "contract", "certainty"].map((w, i) => /* @__PURE__ */ jsx3("text", {
                x: 25,
                y: BOT_Y3 - 28 + i * 10,
                fill: "#e84450",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w))
            ]
          }),
          [75, 50, 25].map((score) => /* @__PURE__ */ jsxs3("g", {
            children: [
              /* @__PURE__ */ jsx3("line", {
                x1: LEFT_MARGIN3 - 5,
                y1: scoreToY3(score),
                x2: W3 - 20,
                y2: scoreToY3(score),
                stroke: COLORS3.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "4,12",
                opacity: 0.18
              }),
              /* @__PURE__ */ jsx3("text", {
                x: 63,
                y: scoreToY3(score) + 3,
                fill: COLORS3.textMuted,
                fontSize: "9",
                fontFamily: "'JetBrains Mono', monospace",
                opacity: 0.35,
                textAnchor: "end",
                children: score
              })
            ]
          }, score)),
          eraLabels3.map((era, i) => /* @__PURE__ */ jsxs3("g", {
            children: [
              /* @__PURE__ */ jsx3("line", {
                x1: COL_X3[i],
                y1: TOP_Y3 - 5,
                x2: COL_X3[i],
                y2: BOT_Y3 + 25,
                stroke: COLORS3.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "2,8",
                opacity: 0.2
              }),
              /* @__PURE__ */ jsx3("text", {
                x: era.x,
                y: BOT_Y3 + 45,
                fill: COLORS3.textMuted,
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                letterSpacing: "0.08em",
                children: era.label
              })
            ]
          }, i)),
          /* @__PURE__ */ jsx3(InvertedBracket3, {}),
          linkData.map((link, i) => /* @__PURE__ */ jsx3(FlowBand3, {
            link,
            gradientId: `fg-${i}`,
            dimmed: hovered ? !isLinkHL(link) : false,
            highlighted: isLinkHL(link)
          }, i)),
          nodes3.map((node) => /* @__PURE__ */ jsx3(NodeRect3, {
            node,
            onHover: setHovered,
            dimmed: hovered && !connectedIds.has(node.id),
            isHovered: hovered === node.id
          }, node.id))
        ]
      }),
      /* @__PURE__ */ jsx3("div", {
        style: {
          maxWidth: 750,
          marginTop: "10px",
          padding: "14px 20px",
          background: "rgba(255,255,255,0.025)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.05)"
        },
        children: /* @__PURE__ */ jsxs3("p", {
          style: {
            color: COLORS3.textDim,
            fontSize: "14px",
            lineHeight: 1.7,
            margin: 0,
            fontFamily: "'Crimson Pro', serif",
            fontWeight: 300
          },
          children: [
            /* @__PURE__ */ jsx3("strong", {
              style: { color: COLORS3.text, fontWeight: 600 },
              children: "How to read this:"
            }),
            " ",
            "Higher = closer to Eckhart (interiority, detachment, participation, apophatic unknowing). Lower = the inversion (exteriority, acquisition, contractual God, propositional certainty).",
            " ",
            "The five movements in the bottom-right are spaced for readability but all score \u2264 5 \u2014 they are each a distinct flavor of the same fundamental inversion.",
            " ",
            /* @__PURE__ */ jsx3("span", {
              style: { color: "#b8924a" },
              children: "Catholicism"
            }),
            " at 55 genuinely holds both streams.",
            " ",
            /* @__PURE__ */ jsx3("span", {
              style: { color: "#7a6aad" },
              children: "Eastern Orthodoxy"
            }),
            " at 75 retains more participatory DNA. Churches like McLean Bible sit in American Evangelicalism (~14)."
          ]
        })
      })
    ]
  });
}

// content/pages/artifacts/metaphysical-choices-sankey/psychology-sankey.jsx
import { useState as useState4, useMemo as useMemo4 } from "https://esm.sh/react";
import { Fragment as Fragment4, jsx as jsx4, jsxs as jsxs4 } from "https://esm.sh/react/jsx-runtime";
var COLORS4 = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848"
};
var STREAM_COLORS4 = {
  ancient: { start: "#c9a84c", end: "#b8924a" },
  depth: { start: "#3ac5b5", end: "#2a9a8a" },
  freud: { start: "#3ac5b5", end: "#2aaa9a" },
  jung: { start: "#2ee8d0", end: "#2ac5b5" },
  humanistic: { start: "#8aaa6a", end: "#7a9a5a" },
  existential: { start: "#7a9aaa", end: "#6a8a9a" },
  psychoanalytic: { start: "#8B72BE", end: "#7a6aad" },
  behavioral: { start: "#d48a4e", end: "#c4703e" },
  cognitive: { start: "#cc6644", end: "#b85a3e" },
  cbt: { start: "#cc5544", end: "#aa4a3a" },
  positive: { start: "#e06050", end: "#d45a4a" },
  neuro: { start: "#d48a4e", end: "#cc6644" },
  selfHelp: { start: "#e84450", end: "#d4344a" },
  biohack: { start: "#dd3a4a", end: "#cc2a3a" },
  somatic: { start: "#3ac5b5", end: "#7a6aad" },
  relational: { start: "#8B72BE", end: "#3ac5b5" },
  contemplative: { start: "#3ac5b5", end: "#2ee8d0" },
  industrial: { start: "#993a3a", end: "#8a2a2a" },
  pop: { start: "#aa5a4a", end: "#9a4a3a" },
  mainPsych: { start: "#b8924a", end: "#9a7a4a" },
  attachment: { start: "#8aaa6a", end: "#3ac5b5" }
};
var W4 = 1700;
var H4 = 880;
var LEFT_MARGIN4 = 100;
var COL_X4 = [LEFT_MARGIN4 + 10, LEFT_MARGIN4 + 250, LEFT_MARGIN4 + 490, LEFT_MARGIN4 + 730, LEFT_MARGIN4 + 1e3, LEFT_MARGIN4 + 1270];
var NODE_W4 = 16;
var TOP_Y4 = 25;
var BOT_Y4 = 820;
function scoreToY4(score) {
  return TOP_Y4 + (BOT_Y4 - TOP_Y4) * (1 - score / 100);
}
function scoreToColor4(score) {
  if (score >= 70)
    return "#3ac5b5";
  if (score >= 50)
    return "#7aaa8a";
  if (score >= 35)
    return "#b8924a";
  if (score >= 20)
    return "#d48a4e";
  if (score >= 10)
    return "#cc6644";
  return "#e84450";
}
var nodesRaw4 = [
  {
    id: "ancient",
    label: "Ancient Psychology",
    sub: "Plato, Aristotle, Stoics \xB7 soul as whole",
    col: 0,
    h: 240,
    color: "#c9a84c",
    score: 70,
    note: "'Know thyself' \u2014 psyche as unfathomable depth, not mechanism"
  },
  {
    id: "romantic",
    label: "Romantic Interiority",
    sub: "Schelling, Goethe, Coleridge",
    col: 1,
    h: 70,
    color: "#3ac5b5",
    score: 80,
    glow: true,
    note: "The unconscious as living depth \u2014 nature creating through us"
  },
  {
    id: "mesmerism",
    label: "Mesmerism / Magnetism",
    sub: "Trance, hypnosis \xB7 18th\u201319th c.",
    col: 1,
    h: 55,
    color: "#8aaa6a",
    score: 50,
    note: "Early encounter with the unconscious \u2014 ambiguous, pre-scientific"
  },
  {
    id: "empiricist",
    label: "British Empiricism",
    sub: "Locke, Hume \xB7 mind as blank slate",
    col: 1,
    h: 85,
    color: "#d48a4e",
    score: 25,
    note: "THE FORK \u2014 mind as passive receiver of sense data, no depth"
  },
  {
    id: "physiology",
    label: "Experimental Physiology",
    sub: "Fechner, Wundt, Helmholtz",
    col: 1,
    h: 75,
    color: "#b8924a",
    score: 30,
    note: "Psyche becomes measurable \u2014 reaction times, thresholds, stimuli"
  },
  {
    id: "freud",
    label: "Freud / Psychoanalysis",
    sub: "The Unconscious \xB7 1895\u20131939",
    col: 2,
    h: 80,
    color: "#8B72BE",
    score: 65,
    note: "Depth recovered \u2014 but reduced to drives, instincts, hydraulic model"
  },
  {
    id: "jung",
    label: "Jung / Analytical",
    sub: "Archetypes, individuation \xB7 1912 \u2192",
    col: 2,
    h: 60,
    color: "#2ee8d0",
    score: 88,
    glow: true,
    note: "The psyche as unfathomable \u2014 archetypes, shadow, Self beyond ego"
  },
  {
    id: "behaviorism",
    label: "Behaviorism",
    sub: "Watson, Skinner \xB7 1913 \u2192",
    col: 2,
    h: 95,
    color: "#d48a4e",
    score: 8,
    note: "THE INVERSION \u2014 no inner life exists, only stimulus \u2192 response"
  },
  {
    id: "gestalt",
    label: "Gestalt Psychology",
    sub: "Wertheimer, K\xF6hler \xB7 wholes",
    col: 2,
    h: 45,
    color: "#8aaa6a",
    score: 55,
    note: "The whole is more than parts \u2014 resists reductionism, preserves form"
  },
  {
    id: "existential",
    label: "Existential Psychology",
    sub: "Frankl, May, Binswanger",
    col: 3,
    h: 50,
    color: "#7a9aaa",
    score: 78,
    glow: true,
    note: "Meaning, freedom, death, groundlessness \u2014 depth without dogma"
  },
  {
    id: "humanistic",
    label: "Humanistic",
    sub: "Maslow, Rogers \xB7 1960s",
    col: 3,
    h: 55,
    color: "#8aaa6a",
    score: 55,
    note: "Self-actualization \u2014 recovered interiority, but thinned to 'growth'"
  },
  {
    id: "objectRelations",
    label: "Object Relations",
    sub: "Winnicott, Klein, Bion",
    col: 3,
    h: 50,
    color: "#8B72BE",
    score: 68,
    note: "Intersubjective depth \u2014 the psyche formed in relationship, not isolation"
  },
  {
    id: "cogRev",
    label: "Cognitive Revolution",
    sub: "Chomsky, Neisser \xB7 1960s",
    col: 3,
    h: 65,
    color: "#cc6644",
    score: 18,
    note: "Mind as information processor \u2014 depth replaced by computation"
  },
  {
    id: "industrialOrg",
    label: "Industrial / Org Psych",
    sub: "Taylorism meets psychology",
    col: 3,
    h: 50,
    color: "#993a3a",
    score: 8,
    note: "How to extract maximum productivity from human units"
  },
  {
    id: "jungianContemp",
    label: "Contemporary Jungian",
    sub: "Hillman, Romanyshyn \xB7 ~2M",
    col: 4,
    h: 35,
    color: "#3ac5b5",
    score: 85,
    glow: true,
    note: "Archetypal psychology \u2014 soul-making, image, depth as irreducible"
  },
  {
    id: "somatic",
    label: "Somatic / Body",
    sub: "Levine, van der Kolk, Porges",
    col: 4,
    h: 40,
    color: "#3ac5b5",
    score: 70,
    glow: true,
    note: "The body keeps the score \u2014 depth recovered through flesh, not cognition"
  },
  {
    id: "relational",
    label: "Relational Psychoanalysis",
    sub: "Mitchell, Benjamin \xB7 intersubjective",
    col: 4,
    h: 40,
    color: "#8B72BE",
    score: 72,
    glow: true,
    note: "Analyst and patient co-create meaning \u2014 participatory knowing"
  },
  {
    id: "cbt",
    label: "CBT",
    sub: "Beck, Ellis \xB7 ~dominant",
    col: 4,
    h: 65,
    color: "#cc5544",
    score: 20,
    note: "Swap bad propositions for good ones \u2014 forensic, propositional, effective"
  },
  {
    id: "positivePsych",
    label: "Positive Psychology",
    sub: "Seligman \xB7 1998 \u2192",
    col: 4,
    h: 55,
    color: "#e06050",
    score: 12,
    note: "Happiness as measurable output \u2014 optimism techniques, gratitude lists"
  },
  {
    id: "neuroreductionism",
    label: "Neuroreductionism",
    sub: "Brain scans as explanation",
    col: 4,
    h: 55,
    color: "#d48a4e",
    score: 10,
    note: "You ARE your brain \u2014 consciousness as epiphenomenon, medicate it"
  },
  {
    id: "contemplativePsych",
    label: "Contemplative / Depth",
    sub: "IFS depth, psychedelic therapy \xB7 ~5M",
    col: 5,
    h: 40,
    color: "#3ac5b5",
    score: 78,
    glow: true,
    yOverride: 195,
    note: "Psychedelics + depth tradition recovery \u2014 participatory encounter"
  },
  {
    id: "attachModern",
    label: "Attachment / Polyvagal",
    sub: "Relational neuroscience",
    col: 5,
    h: 40,
    color: "#8aaa6a",
    score: 55,
    yOverride: 310,
    note: "Bridge \u2014 uses neuroscience but respects relational depth"
  },
  {
    id: "appBasedCBT",
    label: "App-Based Therapy",
    sub: "BetterHelp, Woebot, Calm",
    col: 5,
    h: 50,
    color: "#cc5544",
    score: 8,
    yOverride: 530,
    note: "Therapy as subscription product \u2014 scale over depth"
  },
  {
    id: "selfHelp",
    label: "Self-Help Industrial",
    sub: "Huberman, Atomic Habits \xB7 ~$15B",
    col: 5,
    h: 55,
    color: "#e84450",
    score: 4,
    yOverride: 600,
    note: "Optimize your dopamine \u2014 psychology as productivity technique"
  },
  {
    id: "biohack",
    label: "Biohacking / Optimization",
    sub: "Quantified self, nootropics",
    col: 5,
    h: 45,
    color: "#dd3a4a",
    score: 2,
    yOverride: 675,
    note: "The human as machine to be tuned \u2014 total exteriorization"
  },
  {
    id: "corporateWellness",
    label: "Corporate Wellness",
    sub: "Resilience training, EAPs",
    col: 5,
    h: 45,
    color: "#993a3a",
    score: 3,
    yOverride: 740,
    note: "Manage your stress so you can produce more \u2014 psychology in service of capital"
  }
];
var nodes4 = nodesRaw4.map((n) => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY4(n.score) - n.h / 2
}));
var nodeMap4 = {};
nodes4.forEach((n) => {
  nodeMap4[n.id] = n;
});
var links4 = [
  { from: "ancient", to: "romantic", value: 15, stream: "depth" },
  { from: "ancient", to: "mesmerism", value: 8, stream: "ancient" },
  { from: "ancient", to: "empiricist", value: 25, stream: "behavioral" },
  { from: "ancient", to: "physiology", value: 18, stream: "mainPsych" },
  { from: "romantic", to: "jung", value: 8, stream: "jung" },
  { from: "romantic", to: "freud", value: 5, stream: "depth" },
  { from: "mesmerism", to: "freud", value: 5, stream: "freud" },
  { from: "empiricist", to: "behaviorism", value: 20, stream: "behavioral" },
  { from: "empiricist", to: "freud", value: 3, stream: "freud" },
  { from: "physiology", to: "behaviorism", value: 8, stream: "behavioral" },
  { from: "physiology", to: "gestalt", value: 6, stream: "humanistic" },
  { from: "physiology", to: "freud", value: 5, stream: "freud" },
  { from: "freud", to: "objectRelations", value: 10, stream: "psychoanalytic" },
  { from: "freud", to: "existential", value: 4, stream: "existential" },
  { from: "freud", to: "humanistic", value: 4, stream: "humanistic" },
  { from: "jung", to: "existential", value: 4, stream: "jung" },
  { from: "jung", to: "humanistic", value: 3, stream: "jung" },
  { from: "jung", to: "jungianContemp", value: 6, stream: "jung" },
  { from: "gestalt", to: "humanistic", value: 4, stream: "humanistic" },
  { from: "behaviorism", to: "cogRev", value: 20, stream: "cognitive" },
  { from: "behaviorism", to: "industrialOrg", value: 10, stream: "industrial" },
  { from: "existential", to: "jungianContemp", value: 3, stream: "depth" },
  { from: "existential", to: "somatic", value: 3, stream: "somatic" },
  { from: "existential", to: "relational", value: 3, stream: "relational" },
  { from: "objectRelations", to: "relational", value: 8, stream: "relational" },
  { from: "objectRelations", to: "somatic", value: 3, stream: "somatic" },
  { from: "humanistic", to: "positivePsych", value: 5, stream: "positive" },
  { from: "humanistic", to: "somatic", value: 3, stream: "somatic" },
  { from: "cogRev", to: "cbt", value: 12, stream: "cbt" },
  { from: "cogRev", to: "neuroreductionism", value: 8, stream: "neuro" },
  { from: "cogRev", to: "positivePsych", value: 4, stream: "positive" },
  { from: "industrialOrg", to: "positivePsych", value: 3, stream: "industrial" },
  { from: "industrialOrg", to: "neuroreductionism", value: 3, stream: "industrial" },
  { from: "jungianContemp", to: "contemplativePsych", value: 5, stream: "depth" },
  { from: "somatic", to: "contemplativePsych", value: 4, stream: "somatic" },
  { from: "somatic", to: "attachModern", value: 4, stream: "attachment" },
  { from: "relational", to: "contemplativePsych", value: 3, stream: "relational" },
  { from: "relational", to: "attachModern", value: 4, stream: "attachment" },
  { from: "cbt", to: "appBasedCBT", value: 8, stream: "cbt" },
  { from: "cbt", to: "attachModern", value: 3, stream: "mainPsych" },
  { from: "positivePsych", to: "selfHelp", value: 7, stream: "selfHelp" },
  { from: "positivePsych", to: "corporateWellness", value: 5, stream: "industrial" },
  { from: "neuroreductionism", to: "biohack", value: 6, stream: "biohack" },
  { from: "neuroreductionism", to: "appBasedCBT", value: 4, stream: "neuro" },
  { from: "neuroreductionism", to: "selfHelp", value: 3, stream: "selfHelp" }
];
function computeLinks4() {
  const outOffsets = {};
  const inOffsets = {};
  nodes4.forEach((n) => {
    outOffsets[n.id] = 0;
    inOffsets[n.id] = 0;
  });
  const outTotal = {};
  const inTotal = {};
  nodes4.forEach((n) => {
    outTotal[n.id] = 0;
    inTotal[n.id] = 0;
  });
  links4.forEach((l) => {
    outTotal[l.from] = (outTotal[l.from] || 0) + l.value;
    inTotal[l.to] = (inTotal[l.to] || 0) + l.value;
  });
  return links4.map((link) => {
    const fn = nodeMap4[link.from];
    const tn = nodeMap4[link.to];
    const pad = 4;
    const fAvail = fn.h - pad * 2;
    const fScale = fAvail / Math.max(outTotal[fn.id], 1);
    const thickness = Math.max(3, link.value * fScale);
    const fY = fn.y + pad + outOffsets[fn.id] * fScale + thickness / 2;
    outOffsets[fn.id] += link.value;
    const tAvail = tn.h - pad * 2;
    const tScale = tAvail / Math.max(inTotal[tn.id], 1);
    const tThick = Math.max(3, link.value * tScale);
    const tY = tn.y + pad + inOffsets[tn.id] * tScale + tThick / 2;
    inOffsets[tn.id] += link.value;
    const x1 = COL_X4[fn.col] + NODE_W4;
    const x2 = COL_X4[tn.col];
    return { ...link, x1, y1: fY, x2, y2: tY, thickness: Math.min(thickness, tThick) };
  });
}
function FlowBand4({ link, gradientId, dimmed, highlighted }) {
  const { x1, y1, x2, y2, thickness } = link;
  const halfT = thickness / 2;
  const cp = (x2 - x1) * 0.42;
  const d = `M ${x1} ${y1 - halfT} C ${x1 + cp} ${y1 - halfT}, ${x2 - cp} ${y2 - halfT}, ${x2} ${y2 - halfT} L ${x2} ${y2 + halfT} C ${x2 - cp} ${y2 + halfT}, ${x1 + cp} ${y1 + halfT}, ${x1} ${y1 + halfT} Z`;
  return /* @__PURE__ */ jsx4("path", {
    d,
    fill: `url(#${gradientId})`,
    opacity: dimmed ? 0.03 : highlighted ? 0.6 : 0.3,
    style: { transition: "opacity 0.4s ease" }
  });
}
function ScorePill4({ score, x, y }) {
  const color = scoreToColor4(score);
  const pillW = 30;
  const pillH = 12;
  return /* @__PURE__ */ jsxs4("g", {
    children: [
      /* @__PURE__ */ jsx4("rect", {
        x,
        y,
        width: pillW,
        height: pillH,
        rx: 6,
        fill: color,
        opacity: 0.15
      }),
      /* @__PURE__ */ jsx4("rect", {
        x: x + 1,
        y: y + 1,
        width: Math.max(2, (pillW - 2) * (score / 100)),
        height: pillH - 2,
        rx: 5,
        fill: color,
        opacity: 0.55
      }),
      /* @__PURE__ */ jsx4("text", {
        x: x + pillW + 4,
        y: y + 10,
        fill: color,
        fontSize: "10.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        children: score
      })
    ]
  });
}
function NodeRect4({ node, onHover, dimmed, isHovered }) {
  const x = COL_X4[node.col];
  const isRight = node.col >= 4;
  const isLeft = node.col <= 1;
  const labelX = isRight ? x + NODE_W4 + 10 : isLeft ? x + NODE_W4 + 10 : x - 8;
  const anchor = isRight ? "start" : isLeft ? "start" : "end";
  return /* @__PURE__ */ jsxs4("g", {
    onMouseEnter: () => onHover(node.id),
    onMouseLeave: () => onHover(null),
    style: { cursor: "pointer", opacity: dimmed ? 0.1 : 1, transition: "opacity 0.4s ease" },
    children: [
      node.glow && /* @__PURE__ */ jsxs4(Fragment4, {
        children: [
          /* @__PURE__ */ jsx4("rect", {
            x: x - 4,
            y: node.y - 4,
            width: NODE_W4 + 8,
            height: node.h + 8,
            rx: 4,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 1.5,
            opacity: 0.3
          }),
          /* @__PURE__ */ jsx4("rect", {
            x: x - 8,
            y: node.y - 8,
            width: NODE_W4 + 16,
            height: node.h + 16,
            rx: 6,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 0.5,
            opacity: 0.15
          })
        ]
      }),
      /* @__PURE__ */ jsx4("rect", {
        x,
        y: node.y,
        width: NODE_W4,
        height: node.h,
        rx: 3,
        fill: node.color,
        opacity: isHovered ? 1 : 0.9,
        stroke: isHovered ? "#fff" : "none",
        strokeWidth: 1.5
      }),
      /* @__PURE__ */ jsx4("text", {
        x: labelX,
        y: node.y + node.h / 2 - 12,
        fill: COLORS4.text,
        fontSize: "13",
        fontWeight: "700",
        fontFamily: "'Crimson Pro', Georgia, serif",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.label
      }),
      /* @__PURE__ */ jsx4("text", {
        x: labelX,
        y: node.y + node.h / 2 + 1,
        fill: COLORS4.textDim,
        fontSize: "10.5",
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontStyle: "italic",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.sub
      }),
      /* @__PURE__ */ jsx4(ScorePill4, {
        score: node.score,
        x: anchor === "end" ? labelX - 48 : labelX,
        y: node.y + node.h / 2 + 10
      }),
      isHovered && node.note && /* @__PURE__ */ jsxs4("g", {
        children: [
          /* @__PURE__ */ jsx4("rect", {
            x: x + (isRight ? -10 : -350),
            y: node.y - 38,
            width: 350,
            height: 30,
            rx: 4,
            fill: "#1a1a18ee",
            stroke: scoreToColor4(node.score),
            strokeWidth: 0.7
          }),
          /* @__PURE__ */ jsx4("text", {
            x: x + (isRight ? -10 : -350) + 8,
            y: node.y - 18,
            fill: COLORS4.textDim,
            fontSize: "14",
            fontFamily: "'Crimson Pro', serif",
            fontStyle: "italic",
            children: node.note
          })
        ]
      })
    ]
  });
}
function InvertedBracket4() {
  const x = COL_X4[5] + NODE_W4 + 195;
  const y1 = 525;
  const y2 = 790;
  const mid = (y1 + y2) / 2;
  return /* @__PURE__ */ jsxs4("g", {
    opacity: 0.3,
    children: [
      /* @__PURE__ */ jsx4("path", {
        d: `M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx4("path", {
        d: `M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx4("text", {
        x: x + 28,
        y: mid - 6,
        fill: "#e84450",
        fontSize: "9.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        letterSpacing: "0.06em",
        children: "ALL SCORE \u2264 8"
      }),
      /* @__PURE__ */ jsx4("text", {
        x: x + 28,
        y: mid + 6,
        fill: COLORS4.textMuted,
        fontSize: "9.5",
        fontFamily: "'Crimson Pro', serif",
        fontStyle: "italic",
        children: "fully instrumentalized"
      })
    ]
  });
}
var eraLabels4 = [
  { x: COL_X4[0] + 7, label: "ANCIENT" },
  { x: COL_X4[1] + 7, label: "EARLY MODERN" },
  { x: COL_X4[2] + 7, label: "FOUNDERS" },
  { x: COL_X4[3] + 7, label: "MID 20TH C." },
  { x: COL_X4[4] + 7, label: "LATE 20TH C." },
  { x: COL_X4[5] + 7, label: "CONTEMPORARY" }
];
function PsychologySankey() {
  const [hovered, setHovered] = useState4(null);
  const linkData = useMemo4(() => computeLinks4(), []);
  const connectedIds = useMemo4(() => {
    if (!hovered)
      return /* @__PURE__ */ new Set();
    const ids = /* @__PURE__ */ new Set([hovered]);
    const visitedFwd = /* @__PURE__ */ new Set();
    const visitedBack = /* @__PURE__ */ new Set();
    const fwdQ = [hovered];
    while (fwdQ.length) {
      const cur = fwdQ.pop();
      if (visitedFwd.has(cur))
        continue;
      visitedFwd.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.from === cur) {
          ids.add(l.to);
          fwdQ.push(l.to);
        }
      });
    }
    const bwdQ = [hovered];
    while (bwdQ.length) {
      const cur = bwdQ.pop();
      if (visitedBack.has(cur))
        continue;
      visitedBack.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.to === cur) {
          ids.add(l.from);
          bwdQ.push(l.from);
        }
      });
    }
    return ids;
  }, [hovered, linkData]);
  const isLinkHL = (link) => hovered && connectedIds.has(link.from) && connectedIds.has(link.to);
  return /* @__PURE__ */ jsxs4("div", {
    style: {
      background: `radial-gradient(ellipse at 20% 15%, #1a1815 0%, ${COLORS4.bg} 70%)`,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 16px 20px",
      fontFamily: "'Crimson Pro', Georgia, serif"
    },
    children: [
      /* @__PURE__ */ jsx4("link", {
        href: "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400&family=JetBrains+Mono:wght@300;400;600&display=swap",
        rel: "stylesheet"
      }),
      /* @__PURE__ */ jsx4("h1", {
        style: {
          color: COLORS4.text,
          fontSize: "30px",
          fontWeight: 300,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: "2px",
          textAlign: "center"
        },
        children: "The Genealogy of Depth"
      }),
      /* @__PURE__ */ jsx4("p", {
        style: {
          color: COLORS4.textDim,
          fontSize: "16px",
          fontWeight: 300,
          fontStyle: "italic",
          marginBottom: "12px",
          textAlign: "center",
          maxWidth: 700,
          lineHeight: 1.5
        },
        children: 'From "know thyself" to "optimize your dopamine" \u2014 how psychology lost and sometimes recovered the participatory depths of the psyche. Hover for diagnostic notes.'
      }),
      /* @__PURE__ */ jsx4("div", {
        style: { display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" },
        children: [
          { color: "#3ac5b5", label: "Depth / participatory (70\u2013100)" },
          { color: "#7aaa8a", label: "Moderate (50\u201369)" },
          { color: "#b8924a", label: "Mixed (35\u201349)" },
          { color: "#d48a4e", label: "Thinned (20\u201334)" },
          { color: "#cc6644", label: "Instrumental (10\u201319)" },
          { color: "#e84450", label: "Fully externalized (0\u20139)" }
        ].map((item, i) => /* @__PURE__ */ jsxs4("div", {
          style: { display: "flex", alignItems: "center", gap: "5px" },
          children: [
            /* @__PURE__ */ jsx4("div", {
              style: {
                width: 14,
                height: 5,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${item.color}cc, ${item.color}55)`
              }
            }),
            /* @__PURE__ */ jsx4("span", {
              style: { color: COLORS4.textDim },
              children: item.label
            })
          ]
        }, i))
      }),
      /* @__PURE__ */ jsxs4("svg", {
        viewBox: `0 -10 ${W4} ${H4 + 80}`,
        width: "100%",
        style: { maxWidth: W4 + 20, overflow: "visible" },
        children: [
          /* @__PURE__ */ jsxs4("defs", {
            children: [
              /* @__PURE__ */ jsxs4("linearGradient", {
                id: "bgVertGrad",
                x1: "0",
                y1: "0",
                x2: "0",
                y2: "1",
                children: [
                  /* @__PURE__ */ jsx4("stop", {
                    offset: "0%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.05"
                  }),
                  /* @__PURE__ */ jsx4("stop", {
                    offset: "30%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx4("stop", {
                    offset: "50%",
                    stopColor: "#b8924a",
                    stopOpacity: "0.01"
                  }),
                  /* @__PURE__ */ jsx4("stop", {
                    offset: "70%",
                    stopColor: "#e84450",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx4("stop", {
                    offset: "100%",
                    stopColor: "#e84450",
                    stopOpacity: "0.07"
                  })
                ]
              }),
              linkData.map((link, i) => {
                const sc = STREAM_COLORS4[link.stream] || { start: "#888", end: "#888" };
                return /* @__PURE__ */ jsxs4("linearGradient", {
                  id: `fg-${i}`,
                  x1: "0",
                  y1: "0",
                  x2: "1",
                  y2: "0",
                  children: [
                    /* @__PURE__ */ jsx4("stop", {
                      offset: "0%",
                      stopColor: sc.start,
                      stopOpacity: "0.8"
                    }),
                    /* @__PURE__ */ jsx4("stop", {
                      offset: "50%",
                      stopColor: sc.start,
                      stopOpacity: "0.4"
                    }),
                    /* @__PURE__ */ jsx4("stop", {
                      offset: "100%",
                      stopColor: sc.end,
                      stopOpacity: "0.8"
                    })
                  ]
                }, `g${i}`);
              })
            ]
          }),
          /* @__PURE__ */ jsx4("rect", {
            x: LEFT_MARGIN4 - 10,
            y: TOP_Y4 - 15,
            width: W4 - LEFT_MARGIN4 + 10,
            height: BOT_Y4 - TOP_Y4 + 60,
            fill: "url(#bgVertGrad)",
            rx: 8
          }),
          /* @__PURE__ */ jsxs4("g", {
            children: [
              /* @__PURE__ */ jsx4("line", {
                x1: 58,
                y1: TOP_Y4 + 5,
                x2: 58,
                y2: BOT_Y4 + 10,
                stroke: COLORS4.textMuted,
                strokeWidth: 0.5,
                opacity: 0.25
              }),
              /* @__PURE__ */ jsx4("path", {
                d: "M 55 32 L 58 22 L 61 32",
                fill: "none",
                stroke: "#3ac5b5",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx4("path", {
                d: `M 55 ${BOT_Y4 + 3} L 58 ${BOT_Y4 + 13} L 61 ${BOT_Y4 + 3}`,
                fill: "none",
                stroke: "#e84450",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx4("text", {
                x: 25,
                y: TOP_Y4 + 12,
                fill: "#3ac5b5",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "DEPTH"
              }),
              ["unfathomable psyche", "participatory knowing", "soul as whole", "transformation"].map((w, i) => /* @__PURE__ */ jsx4("text", {
                x: 25,
                y: TOP_Y4 + 24 + i * 10,
                fill: "#3ac5b5",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w)),
              /* @__PURE__ */ jsx4("text", {
                x: 25,
                y: BOT_Y4 - 40,
                fill: "#e84450",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "SURFACE"
              }),
              ["mechanism", "optimization", "productivity", "technique"].map((w, i) => /* @__PURE__ */ jsx4("text", {
                x: 25,
                y: BOT_Y4 - 28 + i * 10,
                fill: "#e84450",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w))
            ]
          }),
          [75, 50, 25].map((score) => /* @__PURE__ */ jsxs4("g", {
            children: [
              /* @__PURE__ */ jsx4("line", {
                x1: LEFT_MARGIN4 - 5,
                y1: scoreToY4(score),
                x2: W4 - 20,
                y2: scoreToY4(score),
                stroke: COLORS4.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "4,12",
                opacity: 0.18
              }),
              /* @__PURE__ */ jsx4("text", {
                x: 63,
                y: scoreToY4(score) + 3,
                fill: COLORS4.textMuted,
                fontSize: "9",
                fontFamily: "'JetBrains Mono', monospace",
                opacity: 0.35,
                textAnchor: "end",
                children: score
              })
            ]
          }, score)),
          eraLabels4.map((era, i) => /* @__PURE__ */ jsxs4("g", {
            children: [
              /* @__PURE__ */ jsx4("line", {
                x1: COL_X4[i],
                y1: TOP_Y4 - 5,
                x2: COL_X4[i],
                y2: BOT_Y4 + 25,
                stroke: COLORS4.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "2,8",
                opacity: 0.2
              }),
              /* @__PURE__ */ jsx4("text", {
                x: era.x,
                y: BOT_Y4 + 45,
                fill: COLORS4.textMuted,
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                letterSpacing: "0.08em",
                children: era.label
              })
            ]
          }, i)),
          /* @__PURE__ */ jsx4(InvertedBracket4, {}),
          linkData.map((link, i) => /* @__PURE__ */ jsx4(FlowBand4, {
            link,
            gradientId: `fg-${i}`,
            dimmed: hovered ? !isLinkHL(link) : false,
            highlighted: isLinkHL(link)
          }, i)),
          nodes4.map((node) => /* @__PURE__ */ jsx4(NodeRect4, {
            node,
            onHover: setHovered,
            dimmed: hovered && !connectedIds.has(node.id),
            isHovered: hovered === node.id
          }, node.id))
        ]
      }),
      /* @__PURE__ */ jsx4("div", {
        style: {
          maxWidth: 750,
          marginTop: "8px",
          padding: "14px 20px",
          background: "rgba(255,255,255,0.025)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.05)"
        },
        children: /* @__PURE__ */ jsxs4("p", {
          style: {
            color: COLORS4.textDim,
            fontSize: "14px",
            lineHeight: 1.7,
            margin: 0,
            fontFamily: "'Crimson Pro', serif",
            fontWeight: 300
          },
          children: [
            /* @__PURE__ */ jsx4("strong", {
              style: { color: COLORS4.text, fontWeight: 600 },
              children: "The same shape:"
            }),
            " ",
            /* @__PURE__ */ jsx4("span", {
              style: { color: "#2ee8d0" },
              children: "Jung"
            }),
            " at 88 plays Eckhart's role \u2014 the psyche as unfathomable depth, individuation as participatory transformation.",
            " ",
            /* @__PURE__ */ jsx4("span", {
              style: { color: "#d48a4e" },
              children: "Behaviorism"
            }),
            " at 8 is the nominalist fork \u2014 there IS no inner life, only stimulus and response.",
            " ",
            /* @__PURE__ */ jsx4("span", {
              style: { color: "#8B72BE" },
              children: "Freud"
            }),
            " at 65 parallels Catholicism \u2014 recovered depth but reduced it to mechanism (drives, hydraulics).",
            " ",
            /* @__PURE__ */ jsx4("span", {
              style: { color: "#cc5544" },
              children: "CBT"
            }),
            " at 20 is the Westminster Confession of psychology \u2014 swap bad propositions for correct ones. The bottom row is the prosperity gospel of the mind: optimize, hack, subscribe, produce. The thin ",
            /* @__PURE__ */ jsx4("span", {
              style: { color: "#3ac5b5" },
              children: "teal stream"
            }),
            " \u2014 somatic work, psychedelic therapy, depth analysis \u2014 persists but is dwarfed by the $15B self-help industry."
          ]
        })
      })
    ]
  });
}

// content/pages/artifacts/metaphysical-choices-sankey/buddhism-sankey.jsx
import { useState as useState5, useMemo as useMemo5 } from "https://esm.sh/react";
import { Fragment as Fragment5, jsx as jsx5, jsxs as jsxs5 } from "https://esm.sh/react/jsx-runtime";
var COLORS5 = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848"
};
var STREAM_COLORS5 = {
  early: { start: "#c9a84c", end: "#b8924a" },
  theravada: { start: "#b8924a", end: "#a07a3a" },
  mahayana: { start: "#8B72BE", end: "#7a6aad" },
  zen: { start: "#2ee8d0", end: "#3ac5b5" },
  vajrayana: { start: "#8B72BE", end: "#3ac5b5" },
  madhyamaka: { start: "#3ac5b5", end: "#2a9a8a" },
  yogacara: { start: "#7a9aaa", end: "#6a8a9a" },
  pureLand: { start: "#d48a4e", end: "#c4703e" },
  abhidharma: { start: "#b8924a", end: "#d48a4e" },
  scholastic: { start: "#cc6644", end: "#b85a3e" },
  chan: { start: "#2ee8d0", end: "#3ac5b5" },
  tibetan: { start: "#8B72BE", end: "#7a6aad" },
  dzogchen: { start: "#3ac5b5", end: "#2ee8d0" },
  nichiren: { start: "#cc5544", end: "#aa4a3a" },
  vipassana: { start: "#8aaa6a", end: "#7a9a5a" },
  engaged: { start: "#8aaa6a", end: "#3ac5b5" },
  secular: { start: "#cc6644", end: "#d48a4e" },
  mcmind: { start: "#e84450", end: "#d4344a" },
  wellness: { start: "#dd3a4a", end: "#cc2a3a" },
  nationalist: { start: "#993a3a", end: "#8a2a2a" },
  sgi: { start: "#e06050", end: "#d45a4a" },
  institutional: { start: "#b8924a", end: "#cc6644" },
  app: { start: "#aa5a4a", end: "#9a4a3a" }
};
var W5 = 1700;
var H5 = 880;
var LEFT_MARGIN5 = 100;
var COL_X5 = [LEFT_MARGIN5 + 10, LEFT_MARGIN5 + 250, LEFT_MARGIN5 + 490, LEFT_MARGIN5 + 730, LEFT_MARGIN5 + 1e3, LEFT_MARGIN5 + 1270];
var NODE_W5 = 16;
var TOP_Y5 = 25;
var BOT_Y5 = 820;
function scoreToY5(score) {
  return TOP_Y5 + (BOT_Y5 - TOP_Y5) * (1 - score / 100);
}
function scoreToColor5(score) {
  if (score >= 70)
    return "#3ac5b5";
  if (score >= 50)
    return "#7aaa8a";
  if (score >= 35)
    return "#b8924a";
  if (score >= 20)
    return "#d48a4e";
  if (score >= 10)
    return "#cc6644";
  return "#e84450";
}
var nodesRaw5 = [
  {
    id: "buddha",
    label: "The Buddha's Teaching",
    sub: "Siddhartha Gautama \xB7 ~5th c. BCE",
    col: 0,
    h: 240,
    color: "#c9a84c",
    score: 92,
    note: "Direct awakening \u2014 dukkha, anatta, sunyata; you are already what you seek"
  },
  {
    id: "theravada",
    label: "Theravada",
    sub: "Pali Canon \xB7 'Way of the Elders'",
    col: 1,
    h: 85,
    color: "#b8924a",
    score: 60,
    note: "Preserved early teachings but systematized them \u2014 monasticism + canon"
  },
  {
    id: "abhidharma",
    label: "Abhidharma",
    sub: "Scholastic cataloging \xB7 3rd c. BCE \u2192",
    col: 1,
    h: 65,
    color: "#d48a4e",
    score: 28,
    note: "The Westminster Confession impulse \u2014 catalog all phenomena, classify all states"
  },
  {
    id: "mahayana",
    label: "Early Mahayana",
    sub: "Bodhisattva ideal \xB7 1st c. BCE \u2192",
    col: 1,
    h: 90,
    color: "#8B72BE",
    score: 75,
    note: "Compassion + emptiness; liberation for all beings, not just monks"
  },
  {
    id: "nagarjuna",
    label: "Nagarjuna / Madhyamaka",
    sub: "Emptiness of emptiness \xB7 2nd c.",
    col: 2,
    h: 60,
    color: "#3ac5b5",
    score: 95,
    glow: true,
    note: "THE PEAK \u2014 sunyata dissolves all categories including 'sunyata'; Eckhart's twin"
  },
  {
    id: "yogacara",
    label: "Yogacara",
    sub: "Mind-only \xB7 Vasubandhu, Asanga",
    col: 2,
    h: 50,
    color: "#7a9aaa",
    score: 70,
    glow: true,
    note: "Consciousness as ground \u2014 deep interiority, eight-consciousness model"
  },
  {
    id: "pureLand",
    label: "Pure Land",
    sub: "Amitabha saves \xB7 other-power",
    col: 2,
    h: 65,
    color: "#d48a4e",
    score: 25,
    note: "Externalized liberation \u2014 faith in another Buddha who saves you from outside"
  },
  {
    id: "chan",
    label: "Chan Buddhism",
    sub: "Bodhidharma \u2192 Chinese Zen \xB7 6th c.",
    col: 2,
    h: 60,
    color: "#2ee8d0",
    score: 90,
    glow: true,
    note: "Direct pointing at mind \u2014 'not dependent on words and letters'"
  },
  {
    id: "tantra",
    label: "Vajrayana / Tantra",
    sub: "Esoteric Buddhism \xB7 7th c. \u2192",
    col: 2,
    h: 55,
    color: "#8B72BE",
    score: 72,
    note: "Transformation through ritual, mantra, visualization \u2014 powerful but ambiguous"
  },
  {
    id: "zenJapan",
    label: "Japanese Zen",
    sub: "Dogen, Rinzai, Soto \xB7 12th c. \u2192",
    col: 3,
    h: 50,
    color: "#2ee8d0",
    score: 85,
    glow: true,
    note: "Shikantaza \u2014 just sitting; practice-realization unity; sunder warumbe"
  },
  {
    id: "tibetan",
    label: "Tibetan Buddhism",
    sub: "Dalai Lama, Kagyu, Nyingma, Gelug",
    col: 3,
    h: 55,
    color: "#8B72BE",
    score: 65,
    note: "Preserved vast teachings \u2014 but also theocratic power, institutional hierarchy"
  },
  {
    id: "dzogchen",
    label: "Dzogchen / Mahamudra",
    sub: "Great Perfection \xB7 Nyingma, Kagyu",
    col: 3,
    h: 40,
    color: "#3ac5b5",
    score: 92,
    glow: true,
    note: "Already awake \u2014 natural state needs no modification; pure Gelassenheit"
  },
  {
    id: "theravadaSE",
    label: "Southeast Asian Theravada",
    sub: "Sri Lanka, Thailand, Myanmar",
    col: 3,
    h: 60,
    color: "#b8924a",
    score: 48,
    note: "Mixed \u2014 forest monks at 80+ but state Buddhism at 25; holds both"
  },
  {
    id: "nichiren",
    label: "Nichiren",
    sub: "Chant for benefits \xB7 13th c. Japan",
    col: 3,
    h: 50,
    color: "#cc5544",
    score: 12,
    note: "THE FORK \u2014 chant the Lotus Sutra title for worldly results; transactional"
  },
  {
    id: "pureLandEA",
    label: "East Asian Pure Land",
    sub: "Honen, Shinran \xB7 nembutsu",
    col: 3,
    h: 50,
    color: "#d48a4e",
    score: 22,
    note: "Radical other-power \u2014 but Shinran deepened it into genuine humility"
  },
  {
    id: "zenWest",
    label: "Western Zen",
    sub: "Suzuki, Shunryu Suzuki, Thich Nhat Hanh",
    col: 4,
    h: 40,
    color: "#3ac5b5",
    score: 80,
    glow: true,
    note: "Genuine transmission \u2014 sitting practice, teacher-student, koan; thin but alive"
  },
  {
    id: "vipassana",
    label: "Vipassana Revival",
    sub: "Mahasi, Goenka, IMS \xB7 insight meditation",
    col: 4,
    h: 45,
    color: "#8aaa6a",
    score: 55,
    note: "Recovered practice from scholasticism \u2014 but risks technique-ification"
  },
  {
    id: "engagedBuddhism",
    label: "Engaged Buddhism",
    sub: "Thich Nhat Hanh, Macy, Loy",
    col: 4,
    h: 40,
    color: "#8aaa6a",
    score: 62,
    note: "Awakening applied to social suffering \u2014 contemplation + action"
  },
  {
    id: "tibetanWest",
    label: "Tibetan in West",
    sub: "Trungpa, FPMT, Shambhala",
    col: 4,
    h: 40,
    color: "#8B72BE",
    score: 60,
    note: "Rich teachings transmitted but institutional scandals reveal power problems"
  },
  {
    id: "secularBuddhism",
    label: "Secular Buddhism",
    sub: "Batchelor, naturalized dharma",
    col: 4,
    h: 45,
    color: "#cc6644",
    score: 30,
    note: "Strips metaphysics, keeps ethics and meditation \u2014 useful but thinned"
  },
  {
    id: "sgi",
    label: "SGI / Soka Gakkai",
    sub: "Nichiren lay movement \xB7 12M members",
    col: 4,
    h: 50,
    color: "#e06050",
    score: 8,
    note: "Chant nam-myoho-renge-kyo for car, job, partner \u2014 prosperity gospel of Buddhism"
  },
  {
    id: "buddhistNationalism",
    label: "Buddhist Nationalism",
    sub: "Myanmar 969, Sri Lanka BBS",
    col: 4,
    h: 45,
    color: "#993a3a",
    score: 3,
    note: "Buddhist identity as ethnic weapon \u2014 the compassion tradition weaponized"
  },
  {
    id: "livingPractice",
    label: "Living Practice",
    sub: "Zen, Dzogchen, forest monks \xB7 ~15M",
    col: 5,
    h: 40,
    color: "#3ac5b5",
    score: 82,
    glow: true,
    yOverride: 165,
    note: "Genuine awakening traditions \u2014 teacher-student, intensive retreat, koan"
  },
  {
    id: "dharmaTeachers",
    label: "Independent Dharma",
    sub: "Post-lineage teachers, podcasts",
    col: 5,
    h: 35,
    color: "#8aaa6a",
    score: 55,
    yOverride: 310,
    note: "Bridge \u2014 sincere practice but untethered from institutional depth"
  },
  {
    id: "mcmindfulness",
    label: "McMindfulness",
    sub: "Corporate MBSR \xB7 Google, SAP",
    col: 5,
    h: 55,
    color: "#e84450",
    score: 3,
    yOverride: 510,
    note: "Awakening repurposed as productivity tool \u2014 meditate to optimize output"
  },
  {
    id: "wellnessApps",
    label: "Meditation Apps",
    sub: "Headspace, Calm, Ten Percent \xB7 $5B",
    col: 5,
    h: 50,
    color: "#dd3a4a",
    score: 4,
    yOverride: 585,
    note: "Sunyata as subscription \u2014 'reduce anxiety in 10 minutes a day'"
  },
  {
    id: "retreatIndustry",
    label: "Retreat Tourism",
    sub: "Bali, Sedona, ayahuasca circuit",
    col: 5,
    h: 45,
    color: "#aa5a4a",
    score: 5,
    yOverride: 655,
    note: "Spiritual experiences as luxury consumption \u2014 enlightenment vacations"
  },
  {
    id: "buddhistCapital",
    label: "Mindful Capitalism",
    sub: "'Conscious leadership', Wisdom 2.0",
    col: 5,
    h: 45,
    color: "#993a3a",
    score: 2,
    yOverride: 720,
    note: "Dharma in service of capital \u2014 the ultimate inversion of renunciation"
  }
];
var nodes5 = nodesRaw5.map((n) => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY5(n.score) - n.h / 2
}));
var nodeMap5 = {};
nodes5.forEach((n) => {
  nodeMap5[n.id] = n;
});
var links5 = [
  { from: "buddha", to: "theravada", value: 20, stream: "theravada" },
  { from: "buddha", to: "abhidharma", value: 12, stream: "abhidharma" },
  { from: "buddha", to: "mahayana", value: 25, stream: "mahayana" },
  { from: "theravada", to: "pureLand", value: 3, stream: "pureLand" },
  { from: "theravada", to: "theravadaSE", value: 8, stream: "theravada" },
  { from: "abhidharma", to: "yogacara", value: 5, stream: "yogacara" },
  { from: "abhidharma", to: "pureLand", value: 3, stream: "scholastic" },
  { from: "abhidharma", to: "nichiren", value: 3, stream: "scholastic" },
  { from: "mahayana", to: "nagarjuna", value: 10, stream: "madhyamaka" },
  { from: "mahayana", to: "yogacara", value: 6, stream: "yogacara" },
  { from: "mahayana", to: "chan", value: 8, stream: "chan" },
  { from: "mahayana", to: "tantra", value: 6, stream: "vajrayana" },
  { from: "mahayana", to: "pureLand", value: 5, stream: "pureLand" },
  { from: "nagarjuna", to: "chan", value: 4, stream: "madhyamaka" },
  { from: "nagarjuna", to: "dzogchen", value: 4, stream: "dzogchen" },
  { from: "nagarjuna", to: "tibetan", value: 3, stream: "madhyamaka" },
  { from: "chan", to: "zenJapan", value: 10, stream: "zen" },
  { from: "tantra", to: "tibetan", value: 6, stream: "vajrayana" },
  { from: "tantra", to: "dzogchen", value: 4, stream: "dzogchen" },
  { from: "yogacara", to: "tibetan", value: 3, stream: "yogacara" },
  { from: "yogacara", to: "zenJapan", value: 2, stream: "yogacara" },
  { from: "pureLand", to: "pureLandEA", value: 8, stream: "pureLand" },
  { from: "pureLand", to: "nichiren", value: 4, stream: "nichiren" },
  { from: "zenJapan", to: "zenWest", value: 8, stream: "zen" },
  { from: "dzogchen", to: "tibetanWest", value: 4, stream: "dzogchen" },
  { from: "dzogchen", to: "zenWest", value: 2, stream: "dzogchen" },
  { from: "tibetan", to: "tibetanWest", value: 6, stream: "tibetan" },
  { from: "theravadaSE", to: "vipassana", value: 8, stream: "vipassana" },
  { from: "theravadaSE", to: "buddhistNationalism", value: 5, stream: "nationalist" },
  { from: "theravadaSE", to: "secularBuddhism", value: 3, stream: "secular" },
  { from: "nichiren", to: "sgi", value: 8, stream: "sgi" },
  { from: "pureLandEA", to: "secularBuddhism", value: 3, stream: "secular" },
  { from: "zenWest", to: "livingPractice", value: 6, stream: "zen" },
  { from: "zenWest", to: "dharmaTeachers", value: 3, stream: "engaged" },
  { from: "tibetanWest", to: "livingPractice", value: 4, stream: "tibetan" },
  { from: "tibetanWest", to: "retreatIndustry", value: 3, stream: "wellness" },
  { from: "vipassana", to: "livingPractice", value: 3, stream: "vipassana" },
  { from: "vipassana", to: "mcmindfulness", value: 5, stream: "mcmind" },
  { from: "vipassana", to: "wellnessApps", value: 4, stream: "app" },
  { from: "vipassana", to: "dharmaTeachers", value: 3, stream: "vipassana" },
  { from: "engagedBuddhism", to: "dharmaTeachers", value: 4, stream: "engaged" },
  { from: "engagedBuddhism", to: "mcmindfulness", value: 2, stream: "mcmind" },
  { from: "secularBuddhism", to: "mcmindfulness", value: 4, stream: "mcmind" },
  { from: "secularBuddhism", to: "wellnessApps", value: 4, stream: "app" },
  { from: "secularBuddhism", to: "buddhistCapital", value: 3, stream: "wellness" },
  { from: "sgi", to: "buddhistCapital", value: 3, stream: "sgi" },
  { from: "sgi", to: "retreatIndustry", value: 2, stream: "wellness" }
];
function computeLinks5() {
  const outOffsets = {};
  const inOffsets = {};
  nodes5.forEach((n) => {
    outOffsets[n.id] = 0;
    inOffsets[n.id] = 0;
  });
  const outTotal = {};
  const inTotal = {};
  nodes5.forEach((n) => {
    outTotal[n.id] = 0;
    inTotal[n.id] = 0;
  });
  links5.forEach((l) => {
    outTotal[l.from] = (outTotal[l.from] || 0) + l.value;
    inTotal[l.to] = (inTotal[l.to] || 0) + l.value;
  });
  return links5.map((link) => {
    const fn = nodeMap5[link.from];
    const tn = nodeMap5[link.to];
    const pad = 4;
    const fAvail = fn.h - pad * 2;
    const fScale = fAvail / Math.max(outTotal[fn.id], 1);
    const thickness = Math.max(3, link.value * fScale);
    const fY = fn.y + pad + outOffsets[fn.id] * fScale + thickness / 2;
    outOffsets[fn.id] += link.value;
    const tAvail = tn.h - pad * 2;
    const tScale = tAvail / Math.max(inTotal[tn.id], 1);
    const tThick = Math.max(3, link.value * tScale);
    const tY = tn.y + pad + inOffsets[tn.id] * tScale + tThick / 2;
    inOffsets[tn.id] += link.value;
    const x1 = COL_X5[fn.col] + NODE_W5;
    const x2 = COL_X5[tn.col];
    return { ...link, x1, y1: fY, x2, y2: tY, thickness: Math.min(thickness, tThick) };
  });
}
function FlowBand5({ link, gradientId, dimmed, highlighted }) {
  const { x1, y1, x2, y2, thickness } = link;
  const halfT = thickness / 2;
  const cp = (x2 - x1) * 0.42;
  const d = `M ${x1} ${y1 - halfT} C ${x1 + cp} ${y1 - halfT}, ${x2 - cp} ${y2 - halfT}, ${x2} ${y2 - halfT} L ${x2} ${y2 + halfT} C ${x2 - cp} ${y2 + halfT}, ${x1 + cp} ${y1 + halfT}, ${x1} ${y1 + halfT} Z`;
  return /* @__PURE__ */ jsx5("path", {
    d,
    fill: `url(#${gradientId})`,
    opacity: dimmed ? 0.03 : highlighted ? 0.6 : 0.3,
    style: { transition: "opacity 0.4s ease" }
  });
}
function ScorePill5({ score, x, y }) {
  const color = scoreToColor5(score);
  const pillW = 30;
  const pillH = 12;
  return /* @__PURE__ */ jsxs5("g", {
    children: [
      /* @__PURE__ */ jsx5("rect", {
        x,
        y,
        width: pillW,
        height: pillH,
        rx: 6,
        fill: color,
        opacity: 0.15
      }),
      /* @__PURE__ */ jsx5("rect", {
        x: x + 1,
        y: y + 1,
        width: Math.max(2, (pillW - 2) * (score / 100)),
        height: pillH - 2,
        rx: 5,
        fill: color,
        opacity: 0.55
      }),
      /* @__PURE__ */ jsx5("text", {
        x: x + pillW + 4,
        y: y + 10,
        fill: color,
        fontSize: "10.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        children: score
      })
    ]
  });
}
function NodeRect5({ node, onHover, dimmed, isHovered }) {
  const x = COL_X5[node.col];
  const isRight = node.col >= 4;
  const isLeft = node.col <= 1;
  const labelX = isRight ? x + NODE_W5 + 10 : isLeft ? x + NODE_W5 + 10 : x - 8;
  const anchor = isRight ? "start" : isLeft ? "start" : "end";
  return /* @__PURE__ */ jsxs5("g", {
    onMouseEnter: () => onHover(node.id),
    onMouseLeave: () => onHover(null),
    style: { cursor: "pointer", opacity: dimmed ? 0.1 : 1, transition: "opacity 0.4s ease" },
    children: [
      node.glow && /* @__PURE__ */ jsxs5(Fragment5, {
        children: [
          /* @__PURE__ */ jsx5("rect", {
            x: x - 4,
            y: node.y - 4,
            width: NODE_W5 + 8,
            height: node.h + 8,
            rx: 4,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 1.5,
            opacity: 0.3
          }),
          /* @__PURE__ */ jsx5("rect", {
            x: x - 8,
            y: node.y - 8,
            width: NODE_W5 + 16,
            height: node.h + 16,
            rx: 6,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 0.5,
            opacity: 0.15
          })
        ]
      }),
      /* @__PURE__ */ jsx5("rect", {
        x,
        y: node.y,
        width: NODE_W5,
        height: node.h,
        rx: 3,
        fill: node.color,
        opacity: isHovered ? 1 : 0.9,
        stroke: isHovered ? "#fff" : "none",
        strokeWidth: 1.5
      }),
      /* @__PURE__ */ jsx5("text", {
        x: labelX,
        y: node.y + node.h / 2 - 12,
        fill: COLORS5.text,
        fontSize: "13",
        fontWeight: "700",
        fontFamily: "'Crimson Pro', Georgia, serif",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.label
      }),
      /* @__PURE__ */ jsx5("text", {
        x: labelX,
        y: node.y + node.h / 2 + 1,
        fill: COLORS5.textDim,
        fontSize: "10.5",
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontStyle: "italic",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.sub
      }),
      /* @__PURE__ */ jsx5(ScorePill5, {
        score: node.score,
        x: anchor === "end" ? labelX - 48 : labelX,
        y: node.y + node.h / 2 + 10
      }),
      isHovered && node.note && /* @__PURE__ */ jsxs5("g", {
        children: [
          /* @__PURE__ */ jsx5("rect", {
            x: x + (isRight ? -10 : -360),
            y: node.y - 38,
            width: 360,
            height: 30,
            rx: 4,
            fill: "#1a1a18ee",
            stroke: scoreToColor5(node.score),
            strokeWidth: 0.7
          }),
          /* @__PURE__ */ jsx5("text", {
            x: x + (isRight ? -10 : -360) + 8,
            y: node.y - 18,
            fill: COLORS5.textDim,
            fontSize: "14",
            fontFamily: "'Crimson Pro', serif",
            fontStyle: "italic",
            children: node.note
          })
        ]
      })
    ]
  });
}
function InvertedBracket5() {
  const x = COL_X5[5] + NODE_W5 + 195;
  const y1 = 505;
  const y2 = 770;
  const mid = (y1 + y2) / 2;
  return /* @__PURE__ */ jsxs5("g", {
    opacity: 0.3,
    children: [
      /* @__PURE__ */ jsx5("path", {
        d: `M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx5("path", {
        d: `M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx5("text", {
        x: x + 28,
        y: mid - 6,
        fill: "#e84450",
        fontSize: "9.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        letterSpacing: "0.06em",
        children: "ALL SCORE \u2264 5"
      }),
      /* @__PURE__ */ jsx5("text", {
        x: x + 28,
        y: mid + 6,
        fill: COLORS5.textMuted,
        fontSize: "9.5",
        fontFamily: "'Crimson Pro', serif",
        fontStyle: "italic",
        children: "awakening commodified"
      })
    ]
  });
}
var eraLabels5 = [
  { x: COL_X5[0] + 7, label: "ORIGINS" },
  { x: COL_X5[1] + 7, label: "EARLY SCHOOLS" },
  { x: COL_X5[2] + 7, label: "CLASSICAL" },
  { x: COL_X5[3] + 7, label: "REGIONAL" },
  { x: COL_X5[4] + 7, label: "MODERN" },
  { x: COL_X5[5] + 7, label: "CONTEMPORARY" }
];
function BuddhismSankey() {
  const [hovered, setHovered] = useState5(null);
  const linkData = useMemo5(() => computeLinks5(), []);
  const connectedIds = useMemo5(() => {
    if (!hovered)
      return /* @__PURE__ */ new Set();
    const ids = /* @__PURE__ */ new Set([hovered]);
    const visitedFwd = /* @__PURE__ */ new Set();
    const visitedBack = /* @__PURE__ */ new Set();
    const fwdQ = [hovered];
    while (fwdQ.length) {
      const cur = fwdQ.pop();
      if (visitedFwd.has(cur))
        continue;
      visitedFwd.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.from === cur) {
          ids.add(l.to);
          fwdQ.push(l.to);
        }
      });
    }
    const bwdQ = [hovered];
    while (bwdQ.length) {
      const cur = bwdQ.pop();
      if (visitedBack.has(cur))
        continue;
      visitedBack.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.to === cur) {
          ids.add(l.from);
          bwdQ.push(l.from);
        }
      });
    }
    return ids;
  }, [hovered, linkData]);
  const isLinkHL = (link) => hovered && connectedIds.has(link.from) && connectedIds.has(link.to);
  return /* @__PURE__ */ jsxs5("div", {
    style: {
      background: `radial-gradient(ellipse at 20% 15%, #1a1815 0%, ${COLORS5.bg} 70%)`,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 16px 20px",
      fontFamily: "'Crimson Pro', Georgia, serif"
    },
    children: [
      /* @__PURE__ */ jsx5("link", {
        href: "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400&family=JetBrains+Mono:wght@300;400;600&display=swap",
        rel: "stylesheet"
      }),
      /* @__PURE__ */ jsx5("h1", {
        style: {
          color: COLORS5.text,
          fontSize: "30px",
          fontWeight: 300,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: "2px",
          textAlign: "center"
        },
        children: "The Commodification of Awakening"
      }),
      /* @__PURE__ */ jsx5("p", {
        style: {
          color: COLORS5.textDim,
          fontSize: "16px",
          fontWeight: 300,
          fontStyle: "italic",
          marginBottom: "12px",
          textAlign: "center",
          maxWidth: 700,
          lineHeight: 1.5
        },
        children: "From the Buddha's direct insight to corporate mindfulness \u2014 how a tradition of radical renunciation became a productivity tool. Hover for diagnostic notes."
      }),
      /* @__PURE__ */ jsx5("div", {
        style: { display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" },
        children: [
          { color: "#3ac5b5", label: "Awakened / participatory (70\u2013100)" },
          { color: "#7aaa8a", label: "Moderate (50\u201369)" },
          { color: "#b8924a", label: "Mixed (35\u201349)" },
          { color: "#d48a4e", label: "Thinned (20\u201334)" },
          { color: "#cc6644", label: "Instrumental (10\u201319)" },
          { color: "#e84450", label: "Fully inverted (0\u20139)" }
        ].map((item, i) => /* @__PURE__ */ jsxs5("div", {
          style: { display: "flex", alignItems: "center", gap: "5px" },
          children: [
            /* @__PURE__ */ jsx5("div", {
              style: {
                width: 14,
                height: 5,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${item.color}cc, ${item.color}55)`
              }
            }),
            /* @__PURE__ */ jsx5("span", {
              style: { color: COLORS5.textDim },
              children: item.label
            })
          ]
        }, i))
      }),
      /* @__PURE__ */ jsxs5("svg", {
        viewBox: `0 -10 ${W5} ${H5 + 80}`,
        width: "100%",
        style: { maxWidth: W5 + 20, overflow: "visible" },
        children: [
          /* @__PURE__ */ jsxs5("defs", {
            children: [
              /* @__PURE__ */ jsxs5("linearGradient", {
                id: "bgVertGrad",
                x1: "0",
                y1: "0",
                x2: "0",
                y2: "1",
                children: [
                  /* @__PURE__ */ jsx5("stop", {
                    offset: "0%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.05"
                  }),
                  /* @__PURE__ */ jsx5("stop", {
                    offset: "30%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx5("stop", {
                    offset: "50%",
                    stopColor: "#b8924a",
                    stopOpacity: "0.01"
                  }),
                  /* @__PURE__ */ jsx5("stop", {
                    offset: "70%",
                    stopColor: "#e84450",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx5("stop", {
                    offset: "100%",
                    stopColor: "#e84450",
                    stopOpacity: "0.07"
                  })
                ]
              }),
              linkData.map((link, i) => {
                const sc = STREAM_COLORS5[link.stream] || { start: "#888", end: "#888" };
                return /* @__PURE__ */ jsxs5("linearGradient", {
                  id: `fg-${i}`,
                  x1: "0",
                  y1: "0",
                  x2: "1",
                  y2: "0",
                  children: [
                    /* @__PURE__ */ jsx5("stop", {
                      offset: "0%",
                      stopColor: sc.start,
                      stopOpacity: "0.8"
                    }),
                    /* @__PURE__ */ jsx5("stop", {
                      offset: "50%",
                      stopColor: sc.start,
                      stopOpacity: "0.4"
                    }),
                    /* @__PURE__ */ jsx5("stop", {
                      offset: "100%",
                      stopColor: sc.end,
                      stopOpacity: "0.8"
                    })
                  ]
                }, `g${i}`);
              })
            ]
          }),
          /* @__PURE__ */ jsx5("rect", {
            x: LEFT_MARGIN5 - 10,
            y: TOP_Y5 - 15,
            width: W5 - LEFT_MARGIN5 + 10,
            height: BOT_Y5 - TOP_Y5 + 60,
            fill: "url(#bgVertGrad)",
            rx: 8
          }),
          /* @__PURE__ */ jsxs5("g", {
            children: [
              /* @__PURE__ */ jsx5("line", {
                x1: 58,
                y1: TOP_Y5 + 5,
                x2: 58,
                y2: BOT_Y5 + 10,
                stroke: COLORS5.textMuted,
                strokeWidth: 0.5,
                opacity: 0.25
              }),
              /* @__PURE__ */ jsx5("path", {
                d: "M 55 32 L 58 22 L 61 32",
                fill: "none",
                stroke: "#3ac5b5",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx5("path", {
                d: `M 55 ${BOT_Y5 + 3} L 58 ${BOT_Y5 + 13} L 61 ${BOT_Y5 + 3}`,
                fill: "none",
                stroke: "#e84450",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx5("text", {
                x: 25,
                y: TOP_Y5 + 12,
                fill: "#3ac5b5",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "AWAKENING"
              }),
              ["sunyata / emptiness", "anatta / no-self", "prajna / insight", "liberation"].map((w, i) => /* @__PURE__ */ jsx5("text", {
                x: 25,
                y: TOP_Y5 + 24 + i * 10,
                fill: "#3ac5b5",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w)),
              /* @__PURE__ */ jsx5("text", {
                x: 25,
                y: BOT_Y5 - 40,
                fill: "#e84450",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "CRAVING"
              }),
              ["acquisition", "commodification", "technique as product", "ego optimization"].map((w, i) => /* @__PURE__ */ jsx5("text", {
                x: 25,
                y: BOT_Y5 - 28 + i * 10,
                fill: "#e84450",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w))
            ]
          }),
          [75, 50, 25].map((score) => /* @__PURE__ */ jsxs5("g", {
            children: [
              /* @__PURE__ */ jsx5("line", {
                x1: LEFT_MARGIN5 - 5,
                y1: scoreToY5(score),
                x2: W5 - 20,
                y2: scoreToY5(score),
                stroke: COLORS5.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "4,12",
                opacity: 0.18
              }),
              /* @__PURE__ */ jsx5("text", {
                x: 63,
                y: scoreToY5(score) + 3,
                fill: COLORS5.textMuted,
                fontSize: "9",
                fontFamily: "'JetBrains Mono', monospace",
                opacity: 0.35,
                textAnchor: "end",
                children: score
              })
            ]
          }, score)),
          eraLabels5.map((era, i) => /* @__PURE__ */ jsxs5("g", {
            children: [
              /* @__PURE__ */ jsx5("line", {
                x1: COL_X5[i],
                y1: TOP_Y5 - 5,
                x2: COL_X5[i],
                y2: BOT_Y5 + 25,
                stroke: COLORS5.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "2,8",
                opacity: 0.2
              }),
              /* @__PURE__ */ jsx5("text", {
                x: era.x,
                y: BOT_Y5 + 45,
                fill: COLORS5.textMuted,
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                letterSpacing: "0.08em",
                children: era.label
              })
            ]
          }, i)),
          /* @__PURE__ */ jsx5(InvertedBracket5, {}),
          linkData.map((link, i) => /* @__PURE__ */ jsx5(FlowBand5, {
            link,
            gradientId: `fg-${i}`,
            dimmed: hovered ? !isLinkHL(link) : false,
            highlighted: isLinkHL(link)
          }, i)),
          nodes5.map((node) => /* @__PURE__ */ jsx5(NodeRect5, {
            node,
            onHover: setHovered,
            dimmed: hovered && !connectedIds.has(node.id),
            isHovered: hovered === node.id
          }, node.id))
        ]
      }),
      /* @__PURE__ */ jsx5("div", {
        style: {
          maxWidth: 750,
          marginTop: "8px",
          padding: "14px 20px",
          background: "rgba(255,255,255,0.025)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.05)"
        },
        children: /* @__PURE__ */ jsxs5("p", {
          style: {
            color: COLORS5.textDim,
            fontSize: "14px",
            lineHeight: 1.7,
            margin: 0,
            fontFamily: "'Crimson Pro', serif",
            fontWeight: 300
          },
          children: [
            /* @__PURE__ */ jsx5("strong", {
              style: { color: COLORS5.text, fontWeight: 600 },
              children: "The deepest irony:"
            }),
            " ",
            "Buddhism's core teaching is that ",
            /* @__PURE__ */ jsx5("em", {
              children: "craving causes suffering"
            }),
            ". The contemporary inversion uses Buddhist technique to ",
            /* @__PURE__ */ jsx5("em", {
              children: "optimize craving"
            }),
            " \u2014 meditate so you can want more effectively.",
            " ",
            /* @__PURE__ */ jsx5("span", {
              style: { color: "#3ac5b5" },
              children: "Nagarjuna"
            }),
            " at 95 and",
            " ",
            /* @__PURE__ */ jsx5("span", {
              style: { color: "#2ee8d0" },
              children: "Dzogchen"
            }),
            " at 92 are Buddhism's Eckhart \u2014 emptiness that dissolves even the concept of emptiness.",
            " ",
            /* @__PURE__ */ jsx5("span", {
              style: { color: "#cc5544" },
              children: "Nichiren"
            }),
            " at 12 is the fork \u2014 chant the sutra title for material results, exactly paralleling the prosperity gospel.",
            " ",
            /* @__PURE__ */ jsx5("span", {
              style: { color: "#993a3a" },
              children: "Buddhist nationalism"
            }),
            " at 3 weaponizes compassion for ethnic violence.",
            " ",
            "The ",
            /* @__PURE__ */ jsx5("span", {
              style: { color: "#e84450" },
              children: "bottom row"
            }),
            " \u2014 McMindfulness, meditation apps, Wisdom 2.0 \u2014 is renunciation repackaged as consumption. The tradition that began with a man leaving his palace to sit under a tree now sells subscriptions for $14.99/month."
          ]
        })
      })
    ]
  });
}

// content/pages/artifacts/metaphysical-choices-sankey/islamic-sankey.jsx
import { useState as useState6, useMemo as useMemo6 } from "https://esm.sh/react";
import { Fragment as Fragment6, jsx as jsx6, jsxs as jsxs6 } from "https://esm.sh/react/jsx-runtime";
var COLORS6 = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848"
};
var STREAM_COLORS6 = {
  sufiEarly: { start: "#3ac5b5", end: "#2a9a8a" },
  sufi: { start: "#3ac5b5", end: "#2aaa9a" },
  ibnArabi: { start: "#2ee8d0", end: "#2ac5b5" },
  ghazali: { start: "#8aaa6a", end: "#7a9a5a" },
  ashari: { start: "#b8924a", end: "#a07a3a" },
  mutazila: { start: "#9a8a6a", end: "#8a7a5a" },
  shia: { start: "#8B72BE", end: "#7a6aad" },
  ibnTaymiyyah: { start: "#d48a4e", end: "#c4703e" },
  wahhabi: { start: "#cc5544", end: "#aa4a3a" },
  salafi: { start: "#e84450", end: "#d4344a" },
  brotherhood: { start: "#993a3a", end: "#8a2a2a" },
  deobandi: { start: "#cc6644", end: "#b85a3e" },
  jihadism: { start: "#dd3a4a", end: "#cc2a3a" },
  irfan: { start: "#7a6aad", end: "#6a5a9d" },
  ottoman: { start: "#b8924a", end: "#a07a3a" },
  mullaSadra: { start: "#8B72BE", end: "#3ac5b5" },
  political: { start: "#aa5a4a", end: "#9a4a3a" },
  mainstream: { start: "#b8924a", end: "#9a7a4a" }
};
var W6 = 1700;
var H6 = 880;
var LEFT_MARGIN6 = 100;
var COL_X6 = [LEFT_MARGIN6 + 10, LEFT_MARGIN6 + 250, LEFT_MARGIN6 + 490, LEFT_MARGIN6 + 730, LEFT_MARGIN6 + 1e3, LEFT_MARGIN6 + 1270];
var NODE_W6 = 16;
var TOP_Y6 = 25;
var BOT_Y6 = 820;
function scoreToY6(score) {
  return TOP_Y6 + (BOT_Y6 - TOP_Y6) * (1 - score / 100);
}
function scoreToColor6(score) {
  if (score >= 70)
    return "#3ac5b5";
  if (score >= 50)
    return "#7aaa8a";
  if (score >= 35)
    return "#b8924a";
  if (score >= 20)
    return "#d48a4e";
  if (score >= 10)
    return "#cc6644";
  return "#e84450";
}
var nodesRaw6 = [
  {
    id: "earlyIslam",
    label: "Early Islam",
    sub: "Prophetic community \xB7 7th c.",
    col: 0,
    h: 240,
    color: "#c9a84c",
    score: 65,
    note: "Mixed \u2014 inner devotion + legal framework coexist from the start"
  },
  {
    id: "sufiEarly",
    label: "Early Sufism",
    sub: "Rabia, Hallaj, Junayd \xB7 8th\u201310th c.",
    col: 1,
    h: 75,
    color: "#3ac5b5",
    score: 85,
    glow: true,
    note: "Rabia: 'If I worship You for Your own sake\u2026' \u2014 sunder warumbe in Arabic"
  },
  {
    id: "shia",
    label: "Shia Islam",
    sub: "Esoteric, batin/zahir \xB7 7th c. \u2192",
    col: 1,
    h: 80,
    color: "#7a6aad",
    score: 65,
    note: "Hidden Imam, inner/outer meaning \u2014 preserves esoteric dimension"
  },
  {
    id: "ashari",
    label: "Ash'ari Theology",
    sub: "Mainstream Sunni orthodox",
    col: 1,
    h: 100,
    color: "#b8924a",
    score: 45,
    note: "Occasionalism \u2014 God directly causes every event; voluntarist seeds"
  },
  {
    id: "mutazila",
    label: "Mu'tazila",
    sub: "Rationalist theology \xB7 8th\u201310th c.",
    col: 1,
    h: 55,
    color: "#9a8a6a",
    score: 40,
    note: "Rational but not mystical \u2014 God understood through reason, not union"
  },
  {
    id: "ibnArabi",
    label: "Ibn Arabi",
    sub: "Wahdat al-Wujud \xB7 1165\u20131240",
    col: 2,
    h: 65,
    color: "#2ee8d0",
    score: 95,
    glow: true,
    note: "Unity of Being \u2014 'the soul's ground and God's ground are one ground'"
  },
  {
    id: "rumi",
    label: "Rumi / Persian Sufism",
    sub: "Fana, divine love \xB7 13th c.",
    col: 2,
    h: 55,
    color: "#3ac5b5",
    score: 92,
    glow: true,
    note: "Annihilation of self in God \u2014 love dissolves the lover/Beloved divide"
  },
  {
    id: "ghazali",
    label: "Al-Ghazali",
    sub: "Ihya Ulum al-Din \xB7 1058\u20131111",
    col: 2,
    h: 80,
    color: "#8aaa6a",
    score: 58,
    note: "Attacked philosophy, embraced Sufism \u2014 Islam's bridge figure"
  },
  {
    id: "ibnTaymiyyah",
    label: "Ibn Taymiyyah",
    sub: "Literalist revolt \xB7 1263\u20131328",
    col: 2,
    h: 100,
    color: "#d48a4e",
    score: 12,
    note: "THE FORK \u2014 attacked Ibn Arabi, insisted on literal Quran, God as sovereign will"
  },
  {
    id: "sufiOrders",
    label: "Sufi Orders",
    sub: "Naqshbandi, Qadiri, Chishti",
    col: 3,
    h: 50,
    color: "#3ac5b5",
    score: 80,
    glow: true,
    note: "Institutionalized mysticism \u2014 dhikr, murshid-murid, tariqa paths"
  },
  {
    id: "mullaSadra",
    label: "Mulla Sadra",
    sub: "Transcendent Theosophy \xB7 17th c.",
    col: 3,
    h: 45,
    color: "#8B72BE",
    score: 85,
    glow: true,
    note: "Shia mystical philosophy \u2014 being as self-intensifying act, not static"
  },
  {
    id: "ottoman",
    label: "Ottoman Islam",
    sub: "Empire theology \xB7 14th\u201320th c.",
    col: 3,
    h: 75,
    color: "#b8924a",
    score: 48,
    note: "Held both \u2014 patronized Sufi orders AND enforced Hanafi legal orthodoxy"
  },
  {
    id: "wahhabi",
    label: "Wahhabism",
    sub: "Ibn Abd al-Wahhab \xB7 1744 \u2192",
    col: 3,
    h: 60,
    color: "#cc5544",
    score: 8,
    note: "Islam's Reformation \u2014 smashed Sufi shrines, pure text, obedience"
  },
  {
    id: "modernSufi",
    label: "Living Sufi Tradition",
    sub: "Orders, teachers, diaspora",
    col: 4,
    h: 35,
    color: "#3ac5b5",
    score: 82,
    glow: true,
    note: "Thin but alive \u2014 Sufi orders survive in Turkey, Senegal, South Asia, diaspora"
  },
  {
    id: "irfan",
    label: "Iranian Irfan",
    sub: "Khomeini, Tabatabai \xB7 Shia mysticism",
    col: 4,
    h: 40,
    color: "#7a6aad",
    score: 75,
    note: "Mystical philosophy survived in Shia seminaries \u2014 genuine contemplative strand"
  },
  {
    id: "deobandi",
    label: "Deobandi",
    sub: "South Asian revivalism \xB7 ~100M",
    col: 4,
    h: 60,
    color: "#cc6644",
    score: 15,
    note: "Strict legal orthodoxy, anti-Sufi, puritanical \u2014 Islam's fundamentalism"
  },
  {
    id: "salafi",
    label: "Salafism",
    sub: "Return to ancestors \xB7 ~50M",
    col: 4,
    h: 65,
    color: "#e06050",
    score: 5,
    note: "Strip all innovation \u2014 legal literalism, radical anti-mysticism"
  },
  {
    id: "brotherhood",
    label: "Muslim Brotherhood",
    sub: "Political Islam \xB7 Qutb, Banna",
    col: 4,
    h: 60,
    color: "#993a3a",
    score: 3,
    note: "Hakimiyyah = Seven Mountains \u2014 God's sovereignty as political program"
  },
  {
    id: "tradIslam",
    label: "Traditional Mainstream",
    sub: "Practicing Sunni/Shia \xB7 ~1.2B",
    col: 5,
    h: 55,
    color: "#b8924a",
    score: 40,
    yOverride: 395,
    note: "Legal-devotional mix \u2014 prayer, fasting, hajj; rarely contemplative"
  },
  {
    id: "saudiWahhabi",
    label: "Saudi Wahhabism",
    sub: "State-sponsored \xB7 petrodollars",
    col: 5,
    h: 50,
    color: "#cc5544",
    score: 6,
    yOverride: 560,
    note: "Exported literalism globally via oil wealth \u2014 Islam's prosperity gospel"
  },
  {
    id: "politicalIslam",
    label: "Political Islamism",
    sub: "Erdogan, AKP, MB offshoots \xB7 ~80M",
    col: 5,
    h: 50,
    color: "#aa5a4a",
    score: 4,
    yOverride: 630,
    note: "Faith as political identity and civilizational program"
  },
  {
    id: "jihadism",
    label: "Apocalyptic Jihadism",
    sub: "ISIS, al-Qaeda \xB7 Dabiq prophecy",
    col: 5,
    h: 45,
    color: "#e84450",
    score: 1,
    yOverride: 700,
    note: "Obsessive end-times timeline + dominionism + spiritual warfare fused"
  },
  {
    id: "contemplatIslam",
    label: "Contemporary Sufism / Irfan",
    sub: "Orders, Irfan, perennialism \xB7 ~30M",
    col: 5,
    h: 40,
    color: "#3ac5b5",
    score: 80,
    glow: true,
    yOverride: 185,
    note: "Thin stream \u2014 Sufi orders, Iranian Irfan, Traditionalist school"
  }
];
var nodes6 = nodesRaw6.map((n) => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY6(n.score) - n.h / 2
}));
var nodeMap6 = {};
nodes6.forEach((n) => {
  nodeMap6[n.id] = n;
});
var links6 = [
  { from: "earlyIslam", to: "sufiEarly", value: 12, stream: "sufiEarly" },
  { from: "earlyIslam", to: "shia", value: 18, stream: "shia" },
  { from: "earlyIslam", to: "ashari", value: 40, stream: "ashari" },
  { from: "earlyIslam", to: "mutazila", value: 10, stream: "mutazila" },
  { from: "sufiEarly", to: "ibnArabi", value: 8, stream: "ibnArabi" },
  { from: "sufiEarly", to: "rumi", value: 6, stream: "sufi" },
  { from: "sufiEarly", to: "ghazali", value: 3, stream: "sufi" },
  { from: "shia", to: "ghazali", value: 3, stream: "shia" },
  { from: "shia", to: "mullaSadra", value: 10, stream: "mullaSadra" },
  { from: "ashari", to: "ghazali", value: 18, stream: "ghazali" },
  { from: "ashari", to: "ibnTaymiyyah", value: 22, stream: "ibnTaymiyyah" },
  { from: "mutazila", to: "ghazali", value: 5, stream: "mutazila" },
  { from: "ibnArabi", to: "sufiOrders", value: 7, stream: "sufi" },
  { from: "rumi", to: "sufiOrders", value: 5, stream: "sufi" },
  { from: "ghazali", to: "sufiOrders", value: 5, stream: "sufi" },
  { from: "ghazali", to: "ottoman", value: 14, stream: "ottoman" },
  { from: "ibnTaymiyyah", to: "wahhabi", value: 18, stream: "wahhabi" },
  { from: "ibnTaymiyyah", to: "ottoman", value: 4, stream: "ibnTaymiyyah" },
  { from: "ibnArabi", to: "mullaSadra", value: 3, stream: "ibnArabi" },
  { from: "sufiOrders", to: "modernSufi", value: 8, stream: "sufi" },
  { from: "sufiOrders", to: "irfan", value: 3, stream: "sufi" },
  { from: "mullaSadra", to: "irfan", value: 8, stream: "irfan" },
  { from: "ottoman", to: "deobandi", value: 5, stream: "deobandi" },
  { from: "ottoman", to: "brotherhood", value: 4, stream: "brotherhood" },
  { from: "wahhabi", to: "salafi", value: 12, stream: "salafi" },
  { from: "wahhabi", to: "deobandi", value: 5, stream: "wahhabi" },
  { from: "wahhabi", to: "brotherhood", value: 4, stream: "brotherhood" },
  { from: "modernSufi", to: "contemplatIslam", value: 6, stream: "sufi" },
  { from: "irfan", to: "contemplatIslam", value: 5, stream: "irfan" },
  { from: "salafi", to: "saudiWahhabi", value: 6, stream: "salafi" },
  { from: "salafi", to: "jihadism", value: 5, stream: "jihadism" },
  { from: "brotherhood", to: "politicalIslam", value: 6, stream: "political" },
  { from: "brotherhood", to: "jihadism", value: 3, stream: "jihadism" },
  { from: "deobandi", to: "tradIslam", value: 4, stream: "mainstream" },
  { from: "deobandi", to: "jihadism", value: 3, stream: "jihadism" },
  { from: "salafi", to: "politicalIslam", value: 3, stream: "political" },
  { from: "modernSufi", to: "tradIslam", value: 3, stream: "mainstream" }
];
function computeLinks6() {
  const outOffsets = {};
  const inOffsets = {};
  nodes6.forEach((n) => {
    outOffsets[n.id] = 0;
    inOffsets[n.id] = 0;
  });
  const outTotal = {};
  const inTotal = {};
  nodes6.forEach((n) => {
    outTotal[n.id] = 0;
    inTotal[n.id] = 0;
  });
  links6.forEach((l) => {
    outTotal[l.from] = (outTotal[l.from] || 0) + l.value;
    inTotal[l.to] = (inTotal[l.to] || 0) + l.value;
  });
  return links6.map((link) => {
    const fn = nodeMap6[link.from];
    const tn = nodeMap6[link.to];
    const pad = 4;
    const fAvail = fn.h - pad * 2;
    const fScale = fAvail / Math.max(outTotal[fn.id], 1);
    const thickness = Math.max(3, link.value * fScale);
    const fY = fn.y + pad + outOffsets[fn.id] * fScale + thickness / 2;
    outOffsets[fn.id] += link.value;
    const tAvail = tn.h - pad * 2;
    const tScale = tAvail / Math.max(inTotal[tn.id], 1);
    const tThick = Math.max(3, link.value * tScale);
    const tY = tn.y + pad + inOffsets[tn.id] * tScale + tThick / 2;
    inOffsets[tn.id] += link.value;
    const x1 = COL_X6[fn.col] + NODE_W6;
    const x2 = COL_X6[tn.col];
    return { ...link, x1, y1: fY, x2, y2: tY, thickness: Math.min(thickness, tThick) };
  });
}
function FlowBand6({ link, gradientId, dimmed, highlighted }) {
  const { x1, y1, x2, y2, thickness } = link;
  const halfT = thickness / 2;
  const cp = (x2 - x1) * 0.42;
  const d = `M ${x1} ${y1 - halfT} C ${x1 + cp} ${y1 - halfT}, ${x2 - cp} ${y2 - halfT}, ${x2} ${y2 - halfT} L ${x2} ${y2 + halfT} C ${x2 - cp} ${y2 + halfT}, ${x1 + cp} ${y1 + halfT}, ${x1} ${y1 + halfT} Z`;
  return /* @__PURE__ */ jsx6("path", {
    d,
    fill: `url(#${gradientId})`,
    opacity: dimmed ? 0.03 : highlighted ? 0.6 : 0.3,
    style: { transition: "opacity 0.4s ease" }
  });
}
function ScorePill6({ score, x, y }) {
  const color = scoreToColor6(score);
  const pillW = 30;
  const pillH = 12;
  return /* @__PURE__ */ jsxs6("g", {
    children: [
      /* @__PURE__ */ jsx6("rect", {
        x,
        y,
        width: pillW,
        height: pillH,
        rx: 6,
        fill: color,
        opacity: 0.15
      }),
      /* @__PURE__ */ jsx6("rect", {
        x: x + 1,
        y: y + 1,
        width: Math.max(2, (pillW - 2) * (score / 100)),
        height: pillH - 2,
        rx: 5,
        fill: color,
        opacity: 0.55
      }),
      /* @__PURE__ */ jsx6("text", {
        x: x + pillW + 4,
        y: y + 10,
        fill: color,
        fontSize: "10.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        children: score
      })
    ]
  });
}
function NodeRect6({ node, onHover, dimmed, isHovered }) {
  const x = COL_X6[node.col];
  const isRight = node.col >= 4;
  const isLeft = node.col <= 1;
  const labelX = isRight ? x + NODE_W6 + 10 : isLeft ? x + NODE_W6 + 10 : x - 8;
  const anchor = isRight ? "start" : isLeft ? "start" : "end";
  return /* @__PURE__ */ jsxs6("g", {
    onMouseEnter: () => onHover(node.id),
    onMouseLeave: () => onHover(null),
    style: { cursor: "pointer", opacity: dimmed ? 0.1 : 1, transition: "opacity 0.4s ease" },
    children: [
      node.glow && /* @__PURE__ */ jsxs6(Fragment6, {
        children: [
          /* @__PURE__ */ jsx6("rect", {
            x: x - 4,
            y: node.y - 4,
            width: NODE_W6 + 8,
            height: node.h + 8,
            rx: 4,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 1.5,
            opacity: 0.3
          }),
          /* @__PURE__ */ jsx6("rect", {
            x: x - 8,
            y: node.y - 8,
            width: NODE_W6 + 16,
            height: node.h + 16,
            rx: 6,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 0.5,
            opacity: 0.15
          })
        ]
      }),
      /* @__PURE__ */ jsx6("rect", {
        x,
        y: node.y,
        width: NODE_W6,
        height: node.h,
        rx: 3,
        fill: node.color,
        opacity: isHovered ? 1 : 0.9,
        stroke: isHovered ? "#fff" : "none",
        strokeWidth: 1.5
      }),
      /* @__PURE__ */ jsx6("text", {
        x: labelX,
        y: node.y + node.h / 2 - 12,
        fill: COLORS6.text,
        fontSize: "13",
        fontWeight: "700",
        fontFamily: "'Crimson Pro', Georgia, serif",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.label
      }),
      /* @__PURE__ */ jsx6("text", {
        x: labelX,
        y: node.y + node.h / 2 + 1,
        fill: COLORS6.textDim,
        fontSize: "10.5",
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontStyle: "italic",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.sub
      }),
      /* @__PURE__ */ jsx6(ScorePill6, {
        score: node.score,
        x: anchor === "end" ? labelX - 48 : labelX,
        y: node.y + node.h / 2 + 10
      }),
      isHovered && node.note && /* @__PURE__ */ jsxs6("g", {
        children: [
          /* @__PURE__ */ jsx6("rect", {
            x: x + (isRight ? -10 : -340),
            y: node.y - 38,
            width: 340,
            height: 30,
            rx: 4,
            fill: "#1a1a18ee",
            stroke: scoreToColor6(node.score),
            strokeWidth: 0.7
          }),
          /* @__PURE__ */ jsx6("text", {
            x: x + (isRight ? -10 : -340) + 8,
            y: node.y - 18,
            fill: COLORS6.textDim,
            fontSize: "14",
            fontFamily: "'Crimson Pro', serif",
            fontStyle: "italic",
            children: node.note
          })
        ]
      })
    ]
  });
}
function InvertedBracket6() {
  const x = COL_X6[5] + NODE_W6 + 185;
  const y1 = 555;
  const y2 = 750;
  const mid = (y1 + y2) / 2;
  return /* @__PURE__ */ jsxs6("g", {
    opacity: 0.3,
    children: [
      /* @__PURE__ */ jsx6("path", {
        d: `M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx6("path", {
        d: `M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx6("text", {
        x: x + 28,
        y: mid - 6,
        fill: "#e84450",
        fontSize: "9.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        letterSpacing: "0.06em",
        children: "ALL SCORE \u2264 6"
      }),
      /* @__PURE__ */ jsx6("text", {
        x: x + 28,
        y: mid + 6,
        fill: COLORS6.textMuted,
        fontSize: "9.5",
        fontFamily: "'Crimson Pro', serif",
        fontStyle: "italic",
        children: "fully inverted"
      })
    ]
  });
}
var eraLabels6 = [
  { x: COL_X6[0] + 7, label: "ORIGINS" },
  { x: COL_X6[1] + 7, label: "CLASSICAL" },
  { x: COL_X6[2] + 7, label: "MEDIEVAL FORK" },
  { x: COL_X6[3] + 7, label: "PRE-MODERN" },
  { x: COL_X6[4] + 7, label: "MODERN" },
  { x: COL_X6[5] + 7, label: "CONTEMPORARY" }
];
function IslamicSankey() {
  const [hovered, setHovered] = useState6(null);
  const linkData = useMemo6(() => computeLinks6(), []);
  const connectedIds = useMemo6(() => {
    if (!hovered)
      return /* @__PURE__ */ new Set();
    const ids = /* @__PURE__ */ new Set([hovered]);
    const visitedFwd = /* @__PURE__ */ new Set();
    const visitedBack = /* @__PURE__ */ new Set();
    const fwdQ = [hovered];
    while (fwdQ.length) {
      const cur = fwdQ.pop();
      if (visitedFwd.has(cur))
        continue;
      visitedFwd.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.from === cur) {
          ids.add(l.to);
          fwdQ.push(l.to);
        }
      });
    }
    const bwdQ = [hovered];
    while (bwdQ.length) {
      const cur = bwdQ.pop();
      if (visitedBack.has(cur))
        continue;
      visitedBack.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.to === cur) {
          ids.add(l.from);
          bwdQ.push(l.from);
        }
      });
    }
    return ids;
  }, [hovered, linkData]);
  const isLinkHL = (link) => hovered && connectedIds.has(link.from) && connectedIds.has(link.to);
  return /* @__PURE__ */ jsxs6("div", {
    style: {
      background: `radial-gradient(ellipse at 20% 15%, #1a1815 0%, ${COLORS6.bg} 70%)`,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 16px 20px",
      fontFamily: "'Crimson Pro', Georgia, serif"
    },
    children: [
      /* @__PURE__ */ jsx6("link", {
        href: "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400&family=JetBrains+Mono:wght@300;400;600&display=swap",
        rel: "stylesheet"
      }),
      /* @__PURE__ */ jsx6("h1", {
        style: {
          color: COLORS6.text,
          fontSize: "30px",
          fontWeight: 300,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: "2px",
          textAlign: "center"
        },
        children: "The Parallel Inversion: Islam"
      }),
      /* @__PURE__ */ jsxs6("p", {
        style: {
          color: COLORS6.textDim,
          fontSize: "16px",
          fontWeight: 300,
          fontStyle: "italic",
          marginBottom: "12px",
          textAlign: "center",
          maxWidth: 700,
          lineHeight: 1.5
        },
        children: [
          "From Ibn Arabi's ",
          /* @__PURE__ */ jsx6("em", {
            children: "Wahdat al-Wujud"
          }),
          " to apocalyptic jihadism \u2014 the same metaphysical fork, the same cascade into instrumentalized religion. Scored against the mystical pole. Hover for diagnostic notes."
        ]
      }),
      /* @__PURE__ */ jsx6("div", {
        style: { display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" },
        children: [
          { color: "#3ac5b5", label: "High alignment (70\u2013100)" },
          { color: "#7aaa8a", label: "Moderate (50\u201369)" },
          { color: "#b8924a", label: "Mixed (35\u201349)" },
          { color: "#d48a4e", label: "Low (20\u201334)" },
          { color: "#cc6644", label: "Very low (10\u201319)" },
          { color: "#e84450", label: "Inverted (0\u20139)" }
        ].map((item, i) => /* @__PURE__ */ jsxs6("div", {
          style: { display: "flex", alignItems: "center", gap: "5px" },
          children: [
            /* @__PURE__ */ jsx6("div", {
              style: {
                width: 14,
                height: 5,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${item.color}cc, ${item.color}55)`
              }
            }),
            /* @__PURE__ */ jsx6("span", {
              style: { color: COLORS6.textDim },
              children: item.label
            })
          ]
        }, i))
      }),
      /* @__PURE__ */ jsxs6("svg", {
        viewBox: `0 -10 ${W6} ${H6 + 80}`,
        width: "100%",
        style: { maxWidth: W6 + 20, overflow: "visible" },
        children: [
          /* @__PURE__ */ jsxs6("defs", {
            children: [
              /* @__PURE__ */ jsxs6("linearGradient", {
                id: "bgVertGrad",
                x1: "0",
                y1: "0",
                x2: "0",
                y2: "1",
                children: [
                  /* @__PURE__ */ jsx6("stop", {
                    offset: "0%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.05"
                  }),
                  /* @__PURE__ */ jsx6("stop", {
                    offset: "30%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx6("stop", {
                    offset: "50%",
                    stopColor: "#b8924a",
                    stopOpacity: "0.01"
                  }),
                  /* @__PURE__ */ jsx6("stop", {
                    offset: "70%",
                    stopColor: "#e84450",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx6("stop", {
                    offset: "100%",
                    stopColor: "#e84450",
                    stopOpacity: "0.07"
                  })
                ]
              }),
              linkData.map((link, i) => {
                const sc = STREAM_COLORS6[link.stream] || { start: "#888", end: "#888" };
                return /* @__PURE__ */ jsxs6("linearGradient", {
                  id: `fg-${i}`,
                  x1: "0",
                  y1: "0",
                  x2: "1",
                  y2: "0",
                  children: [
                    /* @__PURE__ */ jsx6("stop", {
                      offset: "0%",
                      stopColor: sc.start,
                      stopOpacity: "0.8"
                    }),
                    /* @__PURE__ */ jsx6("stop", {
                      offset: "50%",
                      stopColor: sc.start,
                      stopOpacity: "0.4"
                    }),
                    /* @__PURE__ */ jsx6("stop", {
                      offset: "100%",
                      stopColor: sc.end,
                      stopOpacity: "0.8"
                    })
                  ]
                }, `g${i}`);
              })
            ]
          }),
          /* @__PURE__ */ jsx6("rect", {
            x: LEFT_MARGIN6 - 10,
            y: TOP_Y6 - 15,
            width: W6 - LEFT_MARGIN6 + 10,
            height: BOT_Y6 - TOP_Y6 + 60,
            fill: "url(#bgVertGrad)",
            rx: 8
          }),
          /* @__PURE__ */ jsxs6("g", {
            children: [
              /* @__PURE__ */ jsx6("line", {
                x1: 58,
                y1: TOP_Y6 + 5,
                x2: 58,
                y2: BOT_Y6 + 10,
                stroke: COLORS6.textMuted,
                strokeWidth: 0.5,
                opacity: 0.25
              }),
              /* @__PURE__ */ jsx6("path", {
                d: "M 55 32 L 58 22 L 61 32",
                fill: "none",
                stroke: "#3ac5b5",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx6("path", {
                d: `M 55 ${BOT_Y6 + 3} L 58 ${BOT_Y6 + 13} L 61 ${BOT_Y6 + 3}`,
                fill: "none",
                stroke: "#e84450",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx6("text", {
                x: 25,
                y: TOP_Y6 + 12,
                fill: "#3ac5b5",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "MYSTICAL"
              }),
              ["fana / union", "wahdat al-wujud", "interiority", "love beyond reason"].map((w, i) => /* @__PURE__ */ jsx6("text", {
                x: 25,
                y: TOP_Y6 + 24 + i * 10,
                fill: "#3ac5b5",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w)),
              /* @__PURE__ */ jsx6("text", {
                x: 25,
                y: BOT_Y6 - 40,
                fill: "#e84450",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "INVERTED"
              }),
              ["exteriority", "literalism", "political conquest", "apocalyptic violence"].map((w, i) => /* @__PURE__ */ jsx6("text", {
                x: 25,
                y: BOT_Y6 - 28 + i * 10,
                fill: "#e84450",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w))
            ]
          }),
          [75, 50, 25].map((score) => /* @__PURE__ */ jsxs6("g", {
            children: [
              /* @__PURE__ */ jsx6("line", {
                x1: LEFT_MARGIN6 - 5,
                y1: scoreToY6(score),
                x2: W6 - 20,
                y2: scoreToY6(score),
                stroke: COLORS6.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "4,12",
                opacity: 0.18
              }),
              /* @__PURE__ */ jsx6("text", {
                x: 63,
                y: scoreToY6(score) + 3,
                fill: COLORS6.textMuted,
                fontSize: "9",
                fontFamily: "'JetBrains Mono', monospace",
                opacity: 0.35,
                textAnchor: "end",
                children: score
              })
            ]
          }, score)),
          eraLabels6.map((era, i) => /* @__PURE__ */ jsxs6("g", {
            children: [
              /* @__PURE__ */ jsx6("line", {
                x1: COL_X6[i],
                y1: TOP_Y6 - 5,
                x2: COL_X6[i],
                y2: BOT_Y6 + 25,
                stroke: COLORS6.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "2,8",
                opacity: 0.2
              }),
              /* @__PURE__ */ jsx6("text", {
                x: era.x,
                y: BOT_Y6 + 45,
                fill: COLORS6.textMuted,
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                letterSpacing: "0.08em",
                children: era.label
              })
            ]
          }, i)),
          /* @__PURE__ */ jsx6(InvertedBracket6, {}),
          linkData.map((link, i) => /* @__PURE__ */ jsx6(FlowBand6, {
            link,
            gradientId: `fg-${i}`,
            dimmed: hovered ? !isLinkHL(link) : false,
            highlighted: isLinkHL(link)
          }, i)),
          nodes6.map((node) => /* @__PURE__ */ jsx6(NodeRect6, {
            node,
            onHover: setHovered,
            dimmed: hovered && !connectedIds.has(node.id),
            isHovered: hovered === node.id
          }, node.id))
        ]
      }),
      /* @__PURE__ */ jsx6("div", {
        style: {
          maxWidth: 750,
          marginTop: "8px",
          padding: "14px 20px",
          background: "rgba(255,255,255,0.025)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.05)"
        },
        children: /* @__PURE__ */ jsxs6("p", {
          style: {
            color: COLORS6.textDim,
            fontSize: "14px",
            lineHeight: 1.7,
            margin: 0,
            fontFamily: "'Crimson Pro', serif",
            fontWeight: 300
          },
          children: [
            /* @__PURE__ */ jsx6("strong", {
              style: { color: COLORS6.text, fontWeight: 600 },
              children: "The parallel structure:"
            }),
            " ",
            /* @__PURE__ */ jsx6("span", {
              style: { color: "#2ee8d0" },
              children: "Ibn Arabi"
            }),
            " (1165\u20131240) and",
            " ",
            /* @__PURE__ */ jsx6("span", {
              style: { color: "#d48a4e" },
              children: "Ibn Taymiyyah"
            }),
            " (1263\u20131328) are almost exact contemporaries of Eckhart and Ockham \u2014 and play identical roles. The fork from participatory metaphysics (wahdat al-wujud) to divine voluntarism produces the same cascade: literalism \u2192 puritanical reform \u2192 political instrumentalization \u2192 apocalyptic violence.",
            " ",
            /* @__PURE__ */ jsx6("span", {
              style: { color: "#8aaa6a" },
              children: "Al-Ghazali"
            }),
            " at 58 plays a role analogous to Catholicism \u2014 holding both streams. ",
            /* @__PURE__ */ jsx6("span", {
              style: { color: "#7a6aad" },
              children: "Shia Islam"
            }),
            " preserved more mystical DNA through Irfan, paralleling Eastern Orthodoxy's preservation of theosis. The thin ",
            /* @__PURE__ */ jsx6("span", {
              style: { color: "#3ac5b5" },
              children: "teal stream"
            }),
            " survives in Sufi orders, Iranian seminaries, and diaspora communities \u2014 but is vastly outnumbered."
          ]
        })
      })
    ]
  });
}

// content/pages/artifacts/metaphysical-choices-sankey/economics-sankey.jsx
import { useState as useState7, useMemo as useMemo7 } from "https://esm.sh/react";
import { Fragment as Fragment7, jsx as jsx7, jsxs as jsxs7 } from "https://esm.sh/react/jsx-runtime";
var COLORS7 = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848"
};
var STREAM_COLORS7 = {
  ancient: { start: "#c9a84c", end: "#b8924a" },
  oikonomia: { start: "#3ac5b5", end: "#2a9a8a" },
  scholastic: { start: "#8B72BE", end: "#7a6aad" },
  mercantile: { start: "#d48a4e", end: "#c4703e" },
  smith: { start: "#8aaa6a", end: "#7a9a5a" },
  physiocrat: { start: "#7a9aaa", end: "#6a8a9a" },
  classical: { start: "#b8924a", end: "#a07a3a" },
  marxist: { start: "#cc6644", end: "#b85a3e" },
  marginalist: { start: "#cc5544", end: "#aa4a3a" },
  institutional: { start: "#8aaa6a", end: "#3ac5b5" },
  keynesian: { start: "#b8924a", end: "#8aaa6a" },
  austrian: { start: "#d48a4e", end: "#cc6644" },
  neoclassical: { start: "#e06050", end: "#d45a4a" },
  chicago: { start: "#cc5544", end: "#e84450" },
  finance: { start: "#e84450", end: "#d4344a" },
  behavioral: { start: "#8aaa6a", end: "#7a9a5a" },
  ecological: { start: "#3ac5b5", end: "#2ee8d0" },
  commons: { start: "#2ee8d0", end: "#3ac5b5" },
  degrowth: { start: "#3ac5b5", end: "#8B72BE" },
  crypto: { start: "#dd3a4a", end: "#cc2a3a" },
  platform: { start: "#993a3a", end: "#8a2a2a" },
  welfare: { start: "#8aaa6a", end: "#b8924a" },
  development: { start: "#aa5a4a", end: "#9a4a3a" }
};
var W7 = 1700;
var H7 = 880;
var LEFT_MARGIN7 = 100;
var COL_X7 = [LEFT_MARGIN7 + 10, LEFT_MARGIN7 + 250, LEFT_MARGIN7 + 490, LEFT_MARGIN7 + 730, LEFT_MARGIN7 + 1e3, LEFT_MARGIN7 + 1270];
var NODE_W7 = 16;
var TOP_Y7 = 25;
var BOT_Y7 = 820;
function scoreToY7(score) {
  return TOP_Y7 + (BOT_Y7 - TOP_Y7) * (1 - score / 100);
}
function scoreToColor7(score) {
  if (score >= 70)
    return "#3ac5b5";
  if (score >= 50)
    return "#7aaa8a";
  if (score >= 35)
    return "#b8924a";
  if (score >= 20)
    return "#d48a4e";
  if (score >= 10)
    return "#cc6644";
  return "#e84450";
}
var nodesRaw7 = [
  {
    id: "ancient",
    label: "Ancient Oikonomia",
    sub: "Aristotle, Xenophon \xB7 household / polis",
    col: 0,
    h: 240,
    color: "#c9a84c",
    score: 80,
    note: "Economy as stewardship of the household for the good life \u2014 embedded in ethics"
  },
  {
    id: "scholastic",
    label: "Scholastic Economics",
    sub: "Aquinas, Oresme \xB7 just price, usury ban",
    col: 1,
    h: 75,
    color: "#8B72BE",
    score: 65,
    note: "Economic activity subordinated to moral law \u2014 the price should be just, not merely market"
  },
  {
    id: "islamicEcon",
    label: "Islamic Economics",
    sub: "Ibn Khaldun, riba prohibition",
    col: 1,
    h: 60,
    color: "#7a6aad",
    score: 60,
    note: "Asabiyyah (social cohesion) as economic foundation \u2014 wealth serves community bonds"
  },
  {
    id: "commons",
    label: "Commons / Guilds",
    sub: "Shared land, craft mastery \xB7 medieval",
    col: 1,
    h: 65,
    color: "#3ac5b5",
    score: 72,
    glow: true,
    note: "Economic life embedded in community \u2014 production as participation, not extraction"
  },
  {
    id: "mercantile",
    label: "Mercantilism",
    sub: "State wealth accumulation \xB7 16th c.",
    col: 1,
    h: 70,
    color: "#d48a4e",
    score: 20,
    note: "THE FORK \u2014 economy redefined as national power; wealth as zero-sum conquest"
  },
  {
    id: "smith",
    label: "Adam Smith",
    sub: "Wealth of Nations \xB7 1776",
    col: 2,
    h: 70,
    color: "#8aaa6a",
    score: 55,
    note: "Genuinely both \u2014 moral philosopher first; invisible hand within moral sentiments"
  },
  {
    id: "physiocrat",
    label: "Physiocrats",
    sub: "Quesnay \xB7 land as true wealth \xB7 1750s",
    col: 2,
    h: 45,
    color: "#7a9aaa",
    score: 50,
    note: "Nature as source of value \u2014 still participatory, but beginning to model & abstract"
  },
  {
    id: "ricardo",
    label: "Ricardo / Classical",
    sub: "Comparative advantage, iron law of wages",
    col: 2,
    h: 70,
    color: "#b8924a",
    score: 30,
    note: "Ethics recedes \u2014 laws of economics as impersonal mechanism, like Newtonian physics"
  },
  {
    id: "marx",
    label: "Marx",
    sub: "Capital \xB7 1867",
    col: 2,
    h: 65,
    color: "#cc6644",
    score: 35,
    note: "Diagnosed alienation (loss of participation) but prescribed another instrumentalism"
  },
  {
    id: "marginalist",
    label: "Marginalist Revolution",
    sub: "Jevons, Menger, Walras \xB7 1870s",
    col: 3,
    h: 60,
    color: "#cc5544",
    score: 12,
    note: "Value = subjective utility; economics becomes calculus; the human becomes a function"
  },
  {
    id: "institutional",
    label: "Institutional Economics",
    sub: "Veblen, Commons, Polanyi",
    col: 3,
    h: 50,
    color: "#8aaa6a",
    score: 58,
    note: "Economy is embedded in society, not the other way around \u2014 recovered participation"
  },
  {
    id: "keynesian",
    label: "Keynesian",
    sub: "General Theory \xB7 1936",
    col: 3,
    h: 55,
    color: "#b8924a",
    score: 40,
    note: "Government manages aggregate demand \u2014 technocratic but acknowledges human irrationality"
  },
  {
    id: "austrian",
    label: "Austrian School",
    sub: "Mises, Hayek \xB7 spontaneous order",
    col: 3,
    h: 50,
    color: "#b8924a",
    score: 38,
    note: "Distributed knowledge, anti-planning \u2014 genuinely anti-instrumentalist epistemology"
  },
  {
    id: "welfare",
    label: "Welfare State",
    sub: "Beveridge, New Deal, social democracy",
    col: 3,
    h: 50,
    color: "#8aaa6a",
    score: 45,
    note: "Economy serves human needs \u2014 partial recovery of oikonomia through redistribution"
  },
  {
    id: "chicago",
    label: "Chicago School",
    sub: "Friedman, Becker, Stigler",
    col: 4,
    h: 55,
    color: "#cc5544",
    score: 8,
    note: "Everything is a market \u2014 marriage, crime, children all modeled as utility optimization"
  },
  {
    id: "neoclassical",
    label: "Neoclassical Synthesis",
    sub: "DSGE models, rational expectations",
    col: 4,
    h: 55,
    color: "#e06050",
    score: 10,
    note: "Elegant math, fictional humans \u2014 representative agents maximizing in perfect markets"
  },
  {
    id: "ecological",
    label: "Ecological Economics",
    sub: "Daly, Georgescu-Roegen \xB7 steady-state",
    col: 4,
    h: 40,
    color: "#3ac5b5",
    score: 72,
    glow: true,
    note: "Economy as subsystem of biosphere \u2014 nature has intrinsic value, not just resource value"
  },
  {
    id: "behavioral",
    label: "Behavioral Economics",
    sub: "Kahneman, Thaler \xB7 nudge theory",
    col: 4,
    h: 40,
    color: "#8aaa6a",
    score: 30,
    note: "Humans aren't rational \u2014 but the fix is to manipulate their irrationality more cleverly"
  },
  {
    id: "financialization",
    label: "Financialization",
    sub: "Derivatives, securitization \xB7 1980s \u2192",
    col: 4,
    h: 55,
    color: "#e84450",
    score: 3,
    note: "Money making money \u2014 value abstracted from all human good; chrematistike triumphant"
  },
  {
    id: "commonsRevival",
    label: "Commons Revival",
    sub: "Ostrom \xB7 Nobel 2009",
    col: 4,
    h: 35,
    color: "#2ee8d0",
    score: 70,
    glow: true,
    note: "Communities CAN manage shared resources \u2014 neither state nor market needed"
  },
  {
    id: "degrowth",
    label: "Degrowth / Doughnut",
    sub: "Raworth, Hickel, Latouche \xB7 ~2M",
    col: 5,
    h: 38,
    color: "#b8924a",
    score: 35,
    yOverride: 370,
    note: "Correct diagnosis, naive politics \u2014 vulnerable to capture by the power it critiques"
  },
  {
    id: "localFirst",
    label: "Local / Solidarity Economy",
    sub: "Cooperatives, CSAs, mutual aid",
    col: 5,
    h: 35,
    color: "#2ee8d0",
    score: 72,
    glow: true,
    yOverride: 190,
    note: "Economic life re-embedded in community \u2014 participation over extraction"
  },
  {
    id: "stakeholder",
    label: "Stakeholder Capitalism",
    sub: "Davos rhetoric, ESG, B-corps",
    col: 5,
    h: 40,
    color: "#b8924a",
    score: 20,
    yOverride: 400,
    note: "Acknowledges the problem, instrumentalizes the solution \u2014 greenwashing risk"
  },
  {
    id: "algoTrading",
    label: "Algorithmic Trading",
    sub: "HFT, quant funds \xB7 microsecond profits",
    col: 5,
    h: 50,
    color: "#e84450",
    score: 1,
    yOverride: 530,
    note: "Machines trading with machines \u2014 humans fully removed from economic activity"
  },
  {
    id: "platformCapital",
    label: "Platform Capitalism",
    sub: "Uber, Airbnb, gig economy",
    col: 5,
    h: 48,
    color: "#993a3a",
    score: 3,
    yOverride: 600,
    note: "Extract value from human activity without employing humans \u2014 digital enclosure"
  },
  {
    id: "cryptoDefi",
    label: "Crypto / DeFi",
    sub: "Trustless finance \xB7 speculation",
    col: 5,
    h: 45,
    color: "#dd3a4a",
    score: 4,
    yOverride: 668,
    note: "Decentralized but not re-embedded \u2014 speculation without community"
  },
  {
    id: "debtMachine",
    label: "Sovereign Debt / MMT-as-weapon",
    sub: "Infinite growth imperative",
    col: 5,
    h: 45,
    color: "#aa5a4a",
    score: 2,
    yOverride: 733,
    note: "Entire nations as debt-servicing entities \u2014 economy consumes the polity"
  }
];
var nodes7 = nodesRaw7.map((n) => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY7(n.score) - n.h / 2
}));
var nodeMap7 = {};
nodes7.forEach((n) => {
  nodeMap7[n.id] = n;
});
var links7 = [
  { from: "ancient", to: "scholastic", value: 15, stream: "scholastic" },
  { from: "ancient", to: "islamicEcon", value: 10, stream: "scholastic" },
  { from: "ancient", to: "commons", value: 15, stream: "commons" },
  { from: "ancient", to: "mercantile", value: 18, stream: "mercantile" },
  { from: "scholastic", to: "smith", value: 6, stream: "smith" },
  { from: "scholastic", to: "physiocrat", value: 4, stream: "oikonomia" },
  { from: "scholastic", to: "marx", value: 3, stream: "scholastic" },
  { from: "islamicEcon", to: "smith", value: 3, stream: "smith" },
  { from: "commons", to: "smith", value: 3, stream: "commons" },
  { from: "commons", to: "marx", value: 5, stream: "commons" },
  { from: "mercantile", to: "ricardo", value: 10, stream: "classical" },
  { from: "mercantile", to: "smith", value: 6, stream: "mercantile" },
  { from: "smith", to: "marginalist", value: 4, stream: "marginalist" },
  { from: "smith", to: "institutional", value: 4, stream: "institutional" },
  { from: "smith", to: "keynesian", value: 3, stream: "keynesian" },
  { from: "smith", to: "austrian", value: 3, stream: "austrian" },
  { from: "physiocrat", to: "institutional", value: 3, stream: "institutional" },
  { from: "ricardo", to: "marginalist", value: 8, stream: "marginalist" },
  { from: "ricardo", to: "marx", value: 6, stream: "marxist" },
  { from: "ricardo", to: "keynesian", value: 4, stream: "keynesian" },
  { from: "marx", to: "institutional", value: 5, stream: "institutional" },
  { from: "marx", to: "welfare", value: 4, stream: "welfare" },
  { from: "marx", to: "keynesian", value: 3, stream: "keynesian" },
  { from: "marginalist", to: "neoclassical", value: 8, stream: "neoclassical" },
  { from: "marginalist", to: "chicago", value: 7, stream: "chicago" },
  { from: "marginalist", to: "financialization", value: 4, stream: "finance" },
  { from: "institutional", to: "ecological", value: 5, stream: "ecological" },
  { from: "institutional", to: "behavioral", value: 3, stream: "behavioral" },
  { from: "institutional", to: "commonsRevival", value: 4, stream: "commons" },
  { from: "keynesian", to: "neoclassical", value: 4, stream: "neoclassical" },
  { from: "keynesian", to: "behavioral", value: 3, stream: "behavioral" },
  { from: "keynesian", to: "welfare", value: 3, stream: "welfare" },
  { from: "austrian", to: "chicago", value: 5, stream: "chicago" },
  { from: "austrian", to: "financialization", value: 3, stream: "finance" },
  { from: "welfare", to: "behavioral", value: 2, stream: "welfare" },
  { from: "welfare", to: "ecological", value: 2, stream: "ecological" },
  { from: "ecological", to: "degrowth", value: 5, stream: "degrowth" },
  { from: "ecological", to: "localFirst", value: 4, stream: "commons" },
  { from: "commonsRevival", to: "localFirst", value: 4, stream: "commons" },
  { from: "commonsRevival", to: "degrowth", value: 3, stream: "degrowth" },
  { from: "behavioral", to: "stakeholder", value: 3, stream: "behavioral" },
  { from: "chicago", to: "algoTrading", value: 5, stream: "finance" },
  { from: "chicago", to: "platformCapital", value: 4, stream: "platform" },
  { from: "chicago", to: "cryptoDefi", value: 3, stream: "crypto" },
  { from: "neoclassical", to: "algoTrading", value: 5, stream: "finance" },
  { from: "neoclassical", to: "stakeholder", value: 3, stream: "neoclassical" },
  { from: "neoclassical", to: "debtMachine", value: 4, stream: "finance" },
  { from: "financialization", to: "algoTrading", value: 6, stream: "finance" },
  { from: "financialization", to: "cryptoDefi", value: 4, stream: "crypto" },
  { from: "financialization", to: "platformCapital", value: 4, stream: "platform" },
  { from: "financialization", to: "debtMachine", value: 4, stream: "finance" }
];
function computeLinks7() {
  const outOffsets = {};
  const inOffsets = {};
  nodes7.forEach((n) => {
    outOffsets[n.id] = 0;
    inOffsets[n.id] = 0;
  });
  const outTotal = {};
  const inTotal = {};
  nodes7.forEach((n) => {
    outTotal[n.id] = 0;
    inTotal[n.id] = 0;
  });
  links7.forEach((l) => {
    outTotal[l.from] = (outTotal[l.from] || 0) + l.value;
    inTotal[l.to] = (inTotal[l.to] || 0) + l.value;
  });
  return links7.map((link) => {
    const fn = nodeMap7[link.from];
    const tn = nodeMap7[link.to];
    const pad = 4;
    const fAvail = fn.h - pad * 2;
    const fScale = fAvail / Math.max(outTotal[fn.id], 1);
    const thickness = Math.max(3, link.value * fScale);
    const fY = fn.y + pad + outOffsets[fn.id] * fScale + thickness / 2;
    outOffsets[fn.id] += link.value;
    const tAvail = tn.h - pad * 2;
    const tScale = tAvail / Math.max(inTotal[tn.id], 1);
    const tThick = Math.max(3, link.value * tScale);
    const tY = tn.y + pad + inOffsets[tn.id] * tScale + tThick / 2;
    inOffsets[tn.id] += link.value;
    const x1 = COL_X7[fn.col] + NODE_W7;
    const x2 = COL_X7[tn.col];
    return { ...link, x1, y1: fY, x2, y2: tY, thickness: Math.min(thickness, tThick) };
  });
}
function FlowBand7({ link, gradientId, dimmed, highlighted }) {
  const { x1, y1, x2, y2, thickness } = link;
  const halfT = thickness / 2;
  const cp = (x2 - x1) * 0.42;
  const d = `M ${x1} ${y1 - halfT} C ${x1 + cp} ${y1 - halfT}, ${x2 - cp} ${y2 - halfT}, ${x2} ${y2 - halfT} L ${x2} ${y2 + halfT} C ${x2 - cp} ${y2 + halfT}, ${x1 + cp} ${y1 + halfT}, ${x1} ${y1 + halfT} Z`;
  return /* @__PURE__ */ jsx7("path", {
    d,
    fill: `url(#${gradientId})`,
    opacity: dimmed ? 0.03 : highlighted ? 0.6 : 0.3,
    style: { transition: "opacity 0.4s ease" }
  });
}
function ScorePill7({ score, x, y }) {
  const color = scoreToColor7(score);
  const pillW = 30;
  const pillH = 12;
  return /* @__PURE__ */ jsxs7("g", {
    children: [
      /* @__PURE__ */ jsx7("rect", {
        x,
        y,
        width: pillW,
        height: pillH,
        rx: 6,
        fill: color,
        opacity: 0.15
      }),
      /* @__PURE__ */ jsx7("rect", {
        x: x + 1,
        y: y + 1,
        width: Math.max(2, (pillW - 2) * (score / 100)),
        height: pillH - 2,
        rx: 5,
        fill: color,
        opacity: 0.55
      }),
      /* @__PURE__ */ jsx7("text", {
        x: x + pillW + 4,
        y: y + 10,
        fill: color,
        fontSize: "10.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        children: score
      })
    ]
  });
}
function NodeRect7({ node, onHover, dimmed, isHovered }) {
  const x = COL_X7[node.col];
  const isRight = node.col >= 4;
  const isLeft = node.col <= 1;
  const labelX = isRight ? x + NODE_W7 + 10 : isLeft ? x + NODE_W7 + 10 : x - 8;
  const anchor = isRight ? "start" : isLeft ? "start" : "end";
  return /* @__PURE__ */ jsxs7("g", {
    onMouseEnter: () => onHover(node.id),
    onMouseLeave: () => onHover(null),
    style: { cursor: "pointer", opacity: dimmed ? 0.1 : 1, transition: "opacity 0.4s ease" },
    children: [
      node.glow && /* @__PURE__ */ jsxs7(Fragment7, {
        children: [
          /* @__PURE__ */ jsx7("rect", {
            x: x - 4,
            y: node.y - 4,
            width: NODE_W7 + 8,
            height: node.h + 8,
            rx: 4,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 1.5,
            opacity: 0.3
          }),
          /* @__PURE__ */ jsx7("rect", {
            x: x - 8,
            y: node.y - 8,
            width: NODE_W7 + 16,
            height: node.h + 16,
            rx: 6,
            fill: "none",
            stroke: "#3ac5b5",
            strokeWidth: 0.5,
            opacity: 0.15
          })
        ]
      }),
      /* @__PURE__ */ jsx7("rect", {
        x,
        y: node.y,
        width: NODE_W7,
        height: node.h,
        rx: 3,
        fill: node.color,
        opacity: isHovered ? 1 : 0.9,
        stroke: isHovered ? "#fff" : "none",
        strokeWidth: 1.5
      }),
      /* @__PURE__ */ jsx7("text", {
        x: labelX,
        y: node.y + node.h / 2 - 12,
        fill: COLORS7.text,
        fontSize: "13",
        fontWeight: "700",
        fontFamily: "'Crimson Pro', Georgia, serif",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.label
      }),
      /* @__PURE__ */ jsx7("text", {
        x: labelX,
        y: node.y + node.h / 2 + 1,
        fill: COLORS7.textDim,
        fontSize: "10.5",
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontStyle: "italic",
        textAnchor: anchor,
        dominantBaseline: "middle",
        children: node.sub
      }),
      /* @__PURE__ */ jsx7(ScorePill7, {
        score: node.score,
        x: anchor === "end" ? labelX - 48 : labelX,
        y: node.y + node.h / 2 + 10
      }),
      isHovered && node.note && /* @__PURE__ */ jsxs7("g", {
        children: [
          /* @__PURE__ */ jsx7("rect", {
            x: x + (isRight ? -10 : -360),
            y: node.y - 38,
            width: 360,
            height: 30,
            rx: 4,
            fill: "#1a1a18ee",
            stroke: scoreToColor7(node.score),
            strokeWidth: 0.7
          }),
          /* @__PURE__ */ jsx7("text", {
            x: x + (isRight ? -10 : -360) + 8,
            y: node.y - 18,
            fill: COLORS7.textDim,
            fontSize: "14",
            fontFamily: "'Crimson Pro', serif",
            fontStyle: "italic",
            children: node.note
          })
        ]
      })
    ]
  });
}
function InvertedBracket7() {
  const x = COL_X7[5] + NODE_W7 + 200;
  const y1 = 525;
  const y2 = 783;
  const mid = (y1 + y2) / 2;
  return /* @__PURE__ */ jsxs7("g", {
    opacity: 0.3,
    children: [
      /* @__PURE__ */ jsx7("path", {
        d: `M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx7("path", {
        d: `M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`,
        fill: "none",
        stroke: "#e84450",
        strokeWidth: 0.8
      }),
      /* @__PURE__ */ jsx7("text", {
        x: x + 28,
        y: mid - 6,
        fill: "#e84450",
        fontSize: "9.5",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        letterSpacing: "0.06em",
        children: "ALL SCORE \u2264 4"
      }),
      /* @__PURE__ */ jsx7("text", {
        x: x + 28,
        y: mid + 6,
        fill: COLORS7.textMuted,
        fontSize: "9.5",
        fontFamily: "'Crimson Pro', serif",
        fontStyle: "italic",
        children: "pure chrematistike"
      })
    ]
  });
}
var eraLabels7 = [
  { x: COL_X7[0] + 7, label: "ANCIENT" },
  { x: COL_X7[1] + 7, label: "MEDIEVAL" },
  { x: COL_X7[2] + 7, label: "CLASSICAL" },
  { x: COL_X7[3] + 7, label: "LATE 19TH C." },
  { x: COL_X7[4] + 7, label: "LATE 20TH C." },
  { x: COL_X7[5] + 7, label: "CONTEMPORARY" }
];
function EconomicsSankey() {
  const [hovered, setHovered] = useState7(null);
  const linkData = useMemo7(() => computeLinks7(), []);
  const connectedIds = useMemo7(() => {
    if (!hovered)
      return /* @__PURE__ */ new Set();
    const ids = /* @__PURE__ */ new Set([hovered]);
    const visitedFwd = /* @__PURE__ */ new Set();
    const visitedBack = /* @__PURE__ */ new Set();
    const fwdQ = [hovered];
    while (fwdQ.length) {
      const cur = fwdQ.pop();
      if (visitedFwd.has(cur))
        continue;
      visitedFwd.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.from === cur) {
          ids.add(l.to);
          fwdQ.push(l.to);
        }
      });
    }
    const bwdQ = [hovered];
    while (bwdQ.length) {
      const cur = bwdQ.pop();
      if (visitedBack.has(cur))
        continue;
      visitedBack.add(cur);
      ids.add(cur);
      linkData.forEach((l) => {
        if (l.to === cur) {
          ids.add(l.from);
          bwdQ.push(l.from);
        }
      });
    }
    return ids;
  }, [hovered, linkData]);
  const isLinkHL = (link) => hovered && connectedIds.has(link.from) && connectedIds.has(link.to);
  return /* @__PURE__ */ jsxs7("div", {
    style: {
      background: `radial-gradient(ellipse at 20% 15%, #1a1815 0%, ${COLORS7.bg} 70%)`,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 16px 20px",
      fontFamily: "'Crimson Pro', Georgia, serif"
    },
    children: [
      /* @__PURE__ */ jsx7("link", {
        href: "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400&family=JetBrains+Mono:wght@300;400;600&display=swap",
        rel: "stylesheet"
      }),
      /* @__PURE__ */ jsx7("h1", {
        style: {
          color: COLORS7.text,
          fontSize: "30px",
          fontWeight: 300,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: "2px",
          textAlign: "center"
        },
        children: "The Triumph of Chrematistike"
      }),
      /* @__PURE__ */ jsxs7("p", {
        style: {
          color: COLORS7.textDim,
          fontSize: "16px",
          fontWeight: 300,
          fontStyle: "italic",
          marginBottom: "12px",
          textAlign: "center",
          maxWidth: 700,
          lineHeight: 1.5
        },
        children: [
          "Aristotle distinguished ",
          /* @__PURE__ */ jsx7("em", {
            children: "oikonomia"
          }),
          " (household management for flourishing) from",
          " ",
          /* @__PURE__ */ jsx7("em", {
            children: "chrematistike"
          }),
          " (money-making as its own end). Every node on this chart is a position in that ancient argument. Hover for diagnostic notes."
        ]
      }),
      /* @__PURE__ */ jsx7("div", {
        style: { display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" },
        children: [
          { color: "#3ac5b5", label: "Embedded / participatory (70\u2013100)" },
          { color: "#7aaa8a", label: "Moderate (50\u201369)" },
          { color: "#b8924a", label: "Mixed (35\u201349)" },
          { color: "#d48a4e", label: "Thinned (20\u201334)" },
          { color: "#cc6644", label: "Disembedded (10\u201319)" },
          { color: "#e84450", label: "Pure extraction (0\u20139)" }
        ].map((item, i) => /* @__PURE__ */ jsxs7("div", {
          style: { display: "flex", alignItems: "center", gap: "5px" },
          children: [
            /* @__PURE__ */ jsx7("div", {
              style: {
                width: 14,
                height: 5,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${item.color}cc, ${item.color}55)`
              }
            }),
            /* @__PURE__ */ jsx7("span", {
              style: { color: COLORS7.textDim },
              children: item.label
            })
          ]
        }, i))
      }),
      /* @__PURE__ */ jsxs7("svg", {
        viewBox: `0 -10 ${W7} ${H7 + 80}`,
        width: "100%",
        style: { maxWidth: W7 + 20, overflow: "visible" },
        children: [
          /* @__PURE__ */ jsxs7("defs", {
            children: [
              /* @__PURE__ */ jsxs7("linearGradient", {
                id: "bgVertGrad",
                x1: "0",
                y1: "0",
                x2: "0",
                y2: "1",
                children: [
                  /* @__PURE__ */ jsx7("stop", {
                    offset: "0%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.05"
                  }),
                  /* @__PURE__ */ jsx7("stop", {
                    offset: "30%",
                    stopColor: "#3ac5b5",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx7("stop", {
                    offset: "50%",
                    stopColor: "#b8924a",
                    stopOpacity: "0.01"
                  }),
                  /* @__PURE__ */ jsx7("stop", {
                    offset: "70%",
                    stopColor: "#e84450",
                    stopOpacity: "0.02"
                  }),
                  /* @__PURE__ */ jsx7("stop", {
                    offset: "100%",
                    stopColor: "#e84450",
                    stopOpacity: "0.07"
                  })
                ]
              }),
              linkData.map((link, i) => {
                const sc = STREAM_COLORS7[link.stream] || { start: "#888", end: "#888" };
                return /* @__PURE__ */ jsxs7("linearGradient", {
                  id: `fg-${i}`,
                  x1: "0",
                  y1: "0",
                  x2: "1",
                  y2: "0",
                  children: [
                    /* @__PURE__ */ jsx7("stop", {
                      offset: "0%",
                      stopColor: sc.start,
                      stopOpacity: "0.8"
                    }),
                    /* @__PURE__ */ jsx7("stop", {
                      offset: "50%",
                      stopColor: sc.start,
                      stopOpacity: "0.4"
                    }),
                    /* @__PURE__ */ jsx7("stop", {
                      offset: "100%",
                      stopColor: sc.end,
                      stopOpacity: "0.8"
                    })
                  ]
                }, `g${i}`);
              })
            ]
          }),
          /* @__PURE__ */ jsx7("rect", {
            x: LEFT_MARGIN7 - 10,
            y: TOP_Y7 - 15,
            width: W7 - LEFT_MARGIN7 + 10,
            height: BOT_Y7 - TOP_Y7 + 60,
            fill: "url(#bgVertGrad)",
            rx: 8
          }),
          /* @__PURE__ */ jsxs7("g", {
            children: [
              /* @__PURE__ */ jsx7("line", {
                x1: 58,
                y1: TOP_Y7 + 5,
                x2: 58,
                y2: BOT_Y7 + 10,
                stroke: COLORS7.textMuted,
                strokeWidth: 0.5,
                opacity: 0.25
              }),
              /* @__PURE__ */ jsx7("path", {
                d: "M 55 32 L 58 22 L 61 32",
                fill: "none",
                stroke: "#3ac5b5",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx7("path", {
                d: `M 55 ${BOT_Y7 + 3} L 58 ${BOT_Y7 + 13} L 61 ${BOT_Y7 + 3}`,
                fill: "none",
                stroke: "#e84450",
                strokeWidth: 0.8,
                opacity: 0.5
              }),
              /* @__PURE__ */ jsx7("text", {
                x: 25,
                y: TOP_Y7 + 12,
                fill: "#3ac5b5",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "OIKONOMIA"
              }),
              ["human flourishing", "embedded in community", "sufficiency", "common good"].map((w, i) => /* @__PURE__ */ jsx7("text", {
                x: 25,
                y: TOP_Y7 + 24 + i * 10,
                fill: "#3ac5b5",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w)),
              /* @__PURE__ */ jsx7("text", {
                x: 25,
                y: BOT_Y7 - 40,
                fill: "#e84450",
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                textAnchor: "middle",
                letterSpacing: "0.05em",
                opacity: 0.65,
                children: "CHREMATISTIKE"
              }),
              ["money for money's sake", "disembedded from life", "infinite accumulation", "humans as inputs"].map((w, i) => /* @__PURE__ */ jsx7("text", {
                x: 25,
                y: BOT_Y7 - 28 + i * 10,
                fill: "#e84450",
                fontSize: "9",
                fontFamily: "'Crimson Pro', serif",
                fontStyle: "italic",
                textAnchor: "middle",
                opacity: 0.45,
                children: w
              }, w))
            ]
          }),
          [75, 50, 25].map((score) => /* @__PURE__ */ jsxs7("g", {
            children: [
              /* @__PURE__ */ jsx7("line", {
                x1: LEFT_MARGIN7 - 5,
                y1: scoreToY7(score),
                x2: W7 - 20,
                y2: scoreToY7(score),
                stroke: COLORS7.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "4,12",
                opacity: 0.18
              }),
              /* @__PURE__ */ jsx7("text", {
                x: 63,
                y: scoreToY7(score) + 3,
                fill: COLORS7.textMuted,
                fontSize: "9",
                fontFamily: "'JetBrains Mono', monospace",
                opacity: 0.35,
                textAnchor: "end",
                children: score
              })
            ]
          }, score)),
          eraLabels7.map((era, i) => /* @__PURE__ */ jsxs7("g", {
            children: [
              /* @__PURE__ */ jsx7("line", {
                x1: COL_X7[i],
                y1: TOP_Y7 - 5,
                x2: COL_X7[i],
                y2: BOT_Y7 + 25,
                stroke: COLORS7.textMuted,
                strokeWidth: 0.3,
                strokeDasharray: "2,8",
                opacity: 0.2
              }),
              /* @__PURE__ */ jsx7("text", {
                x: era.x,
                y: BOT_Y7 + 45,
                fill: COLORS7.textMuted,
                fontSize: "10",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "600",
                letterSpacing: "0.08em",
                children: era.label
              })
            ]
          }, i)),
          /* @__PURE__ */ jsx7(InvertedBracket7, {}),
          linkData.map((link, i) => /* @__PURE__ */ jsx7(FlowBand7, {
            link,
            gradientId: `fg-${i}`,
            dimmed: hovered ? !isLinkHL(link) : false,
            highlighted: isLinkHL(link)
          }, i)),
          nodes7.map((node) => /* @__PURE__ */ jsx7(NodeRect7, {
            node,
            onHover: setHovered,
            dimmed: hovered && !connectedIds.has(node.id),
            isHovered: hovered === node.id
          }, node.id))
        ]
      }),
      /* @__PURE__ */ jsx7("div", {
        style: {
          maxWidth: 750,
          marginTop: "8px",
          padding: "14px 20px",
          background: "rgba(255,255,255,0.025)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.05)"
        },
        children: /* @__PURE__ */ jsxs7("p", {
          style: {
            color: COLORS7.textDim,
            fontSize: "14px",
            lineHeight: 1.7,
            margin: 0,
            fontFamily: "'Crimson Pro', serif",
            fontWeight: 300
          },
          children: [
            /* @__PURE__ */ jsx7("strong", {
              style: { color: COLORS7.text, fontWeight: 600 },
              children: "Aristotle named it 2,400 years ago:"
            }),
            " ",
            /* @__PURE__ */ jsx7("em", {
              children: "chrematistike"
            }),
            ' \u2014 money-making as its own end \u2014 is "unnatural" because it has no inherent limit. ',
            /* @__PURE__ */ jsx7("em", {
              children: "Oikonomia"
            }),
            " aims at sufficiency for the good life; chrematistike aims at infinite accumulation.",
            " ",
            /* @__PURE__ */ jsx7("span", {
              style: { color: "#8aaa6a" },
              children: "Adam Smith"
            }),
            " at 55 is the bridge \u2014 moral philosopher who also unleashed the market; ",
            /* @__PURE__ */ jsx7("em", {
              children: "Theory of Moral Sentiments"
            }),
            " and",
            " ",
            /* @__PURE__ */ jsx7("em", {
              children: "Wealth of Nations"
            }),
            " are the two halves of his Catholicism.",
            " ",
            "The ",
            /* @__PURE__ */ jsx7("span", {
              style: { color: "#cc5544" },
              children: "Marginalist Revolution"
            }),
            " at 12 is the nominalist fork \u2014 value becomes subjective utility, economics becomes calculus, the human becomes a maximizing function.",
            " ",
            "The ",
            /* @__PURE__ */ jsx7("span", {
              style: { color: "#b8924a" },
              children: "Austrian School"
            }),
            " at 38 preserves genuine anti-instrumentalist insight \u2014 distributed knowledge, anti-planning \u2014 but still treats the human as a maximizer.",
            " ",
            /* @__PURE__ */ jsx7("span", {
              style: { color: "#b8924a" },
              children: "Degrowth"
            }),
            " at 35 correctly diagnoses infinite growth on a finite planet but has no viable theory of transition and is vulnerable to capture by power.",
            " ",
            /* @__PURE__ */ jsx7("span", {
              style: { color: "#2ee8d0" },
              children: "Ostrom"
            }),
            " and the commons revival proved communities can manage shared resources without either state or market \u2014 the thin teal stream. ",
            /* @__PURE__ */ jsx7("span", {
              style: { color: "#e84450" },
              children: "Algorithmic trading"
            }),
            " at 1: machines trading with machines, humans fully removed. Aristotle's nightmare."
          ]
        })
      })
    ]
  });
}

// content/pages/artifacts/metaphysical-choices-sankey.jsx
import { jsx as jsx8, jsxs as jsxs8 } from "https://esm.sh/react/jsx-runtime";
var TABS = [
  { label: "Science", component: ScienceSankey },
  { label: "Education", component: EducationSankey },
  { label: "Theology", component: TheologicalSankey },
  { label: "Psychology", component: PsychologySankey },
  { label: "Buddhism", component: BuddhismSankey },
  { label: "Islam", component: IslamicSankey },
  { label: "Economics", component: EconomicsSankey }
];
function MetaphysicalChoices() {
  const [activeTab, setActiveTab] = useState8(0);
  const [zoom, setZoom] = useState8(1.4);
  const ActiveComponent = TABS[activeTab].component;
  return /* @__PURE__ */ jsxs8("div", {
    style: { background: "#0f0f0e", minHeight: "100vh" },
    children: [
      /* @__PURE__ */ jsxs8("div", {
        style: {
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#1a1a18",
          borderBottom: "1px solid #2a2a28",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          fontFamily: "'Crimson Pro', Georgia, serif"
        },
        children: [
          TABS.map((tab, i) => /* @__PURE__ */ jsx8("button", {
            onClick: () => setActiveTab(i),
            style: {
              background: i === activeTab ? "#2a2a28" : "transparent",
              color: i === activeTab ? "#c9a84c" : "#9a9888",
              border: "none",
              borderBottom: i === activeTab ? "2px solid #c9a84c" : "2px solid transparent",
              padding: "12px 18px",
              fontSize: "15px",
              fontFamily: "inherit",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.2s, background 0.2s"
            },
            onMouseEnter: (e) => {
              if (i !== activeTab) {
                e.currentTarget.style.color = "#e8e4da";
                e.currentTarget.style.background = "#222220";
              }
            },
            onMouseLeave: (e) => {
              if (i !== activeTab) {
                e.currentTarget.style.color = "#9a9888";
                e.currentTarget.style.background = "transparent";
              }
            },
            children: tab.label
          }, tab.label)),
          /* @__PURE__ */ jsxs8("div", {
            style: { marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", padding: "6px 0", flexShrink: 0 },
            children: [
              /* @__PURE__ */ jsx8("button", {
                onClick: () => setZoom((z) => Math.max(0.8, +(z - 0.1).toFixed(1))),
                style: {
                  background: "#2a2a28",
                  color: "#9a9888",
                  border: "1px solid #3a3a38",
                  borderRadius: 4,
                  width: 28,
                  height: 28,
                  fontSize: "16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "monospace"
                },
                children: "-"
              }),
              /* @__PURE__ */ jsxs8("span", {
                style: { color: "#9a9888", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", minWidth: 40, textAlign: "center" },
                children: [
                  Math.round(zoom * 100),
                  "%"
                ]
              }),
              /* @__PURE__ */ jsx8("button", {
                onClick: () => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1))),
                style: {
                  background: "#2a2a28",
                  color: "#9a9888",
                  border: "1px solid #3a3a38",
                  borderRadius: 4,
                  width: 28,
                  height: 28,
                  fontSize: "16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "monospace"
                },
                children: "+"
              }),
              zoom !== 1.4 && /* @__PURE__ */ jsx8("button", {
                onClick: () => setZoom(1.4),
                style: {
                  background: "#2a2a28",
                  color: "#9a9888",
                  border: "1px solid #3a3a38",
                  borderRadius: 4,
                  height: 28,
                  padding: "0 8px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace"
                },
                children: "Reset"
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsx8("div", {
        style: { overflow: "auto", position: "relative" },
        children: /* @__PURE__ */ jsx8("div", {
          style: {
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            width: `${100 / zoom}%`,
            marginLeft: "auto",
            marginRight: "auto"
          },
          children: /* @__PURE__ */ jsx8(ActiveComponent, {})
        })
      })
    ]
  });
}
export {
  MetaphysicalChoices as default
};
