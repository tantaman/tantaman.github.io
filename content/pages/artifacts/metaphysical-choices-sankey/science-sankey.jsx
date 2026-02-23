import { useState, useMemo } from "react";

const COLORS = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848",
};

const STREAM_COLORS = {
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
  reductionist: { start: "#e06050", end: "#d45a4a" },
};

const W = 1700;
const H = 880;
const LEFT_MARGIN = 100;
const COL_X = [LEFT_MARGIN + 10, LEFT_MARGIN + 250, LEFT_MARGIN + 490, LEFT_MARGIN + 730, LEFT_MARGIN + 1000, LEFT_MARGIN + 1270];
const NODE_W = 16;
const TOP_Y = 25;
const BOT_Y = 820;

function scoreToY(score) {
  return TOP_Y + (BOT_Y - TOP_Y) * (1 - score / 100);
}

function scoreToColor(score) {
  if (score >= 70) return "#3ac5b5";
  if (score >= 50) return "#7aaa8a";
  if (score >= 35) return "#b8924a";
  if (score >= 20) return "#d48a4e";
  if (score >= 10) return "#cc6644";
  return "#e84450";
}

const nodesRaw = [
  // Col 0 — Origins
  { id: "ancient", label: "Ancient Natural Philosophy", sub: "Thales → Aristotle · thaumazein", col: 0, h: 240, color: "#c9a84c", score: 75,
    note: "Science begins in wonder — knowing as participation in the intelligibility of the cosmos" },

  // Col 1 — Medieval / Early Fork
  { id: "platonic", label: "Neoplatonic Science", sub: "Plotinus, Proclus · cosmos as emanation", col: 1, h: 65, color: "#3ac5b5", score: 85, glow: true,
    note: "Nature as theophany — studying the world IS knowing the divine mind" },
  { id: "islamicScience", label: "Islamic Golden Age", sub: "Al-Khwarizmi, Ibn Sina, Alhazen", col: 1, h: 75, color: "#8B72BE", score: 60,
    note: "Preserved and extended Greek participatory science within monotheism" },
  { id: "medievalNatPhil", label: "Medieval Natural Philosophy", sub: "Grosseteste, Roger Bacon, Aquinas", col: 1, h: 80, color: "#b8924a", score: 55,
    note: "Nature as Book of God — investigation as a form of devotion" },
  { id: "nominalistSci", label: "Nominalist Turn", sub: "Ockham's razor · 14th c.", col: 1, h: 75, color: "#d48a4e", score: 22,
    note: "Universals don't exist — only particular measurable things are real" },

  // Col 2 — Scientific Revolution
  { id: "kepler", label: "Kepler / Copernicus", sub: "Cosmic harmony · 16th–17th c.", col: 2, h: 55, color: "#8aaa6a", score: 65,
    note: "Still participatory — Kepler sought God's geometrical mind in the heavens" },
  { id: "bacon", label: "Francis Bacon", sub: "'Knowledge is power' · 1620", col: 2, h: 70, color: "#d48a4e", score: 15,
    note: "THE FORK — science redefined as control over nature, not participation in it" },
  { id: "descartes", label: "Descartes", sub: "Res cogitans / res extensa · 1637", col: 2, h: 75, color: "#cc6644", score: 12,
    note: "Mind-body split — nature becomes dead matter, mind becomes spectator" },
  { id: "newton", label: "Newton", sub: "Principia · 1687", col: 2, h: 80, color: "#b8924a", score: 40,
    note: "Genuinely both — occult alchemist AND mechanist; the tension is the man" },

  // Col 3 — 18th–19th Century
  { id: "romanticSci", label: "Romantic Science", sub: "Goethe, Humboldt, Schelling", col: 3, h: 50, color: "#3ac5b5", score: 80, glow: true,
    note: "Nature as living whole — the scientist participates in what she studies" },
  { id: "mechanistPhysics", label: "Mechanist Physics", sub: "Laplace, determinism · 18th c.", col: 3, h: 65, color: "#cc5544", score: 10,
    note: "'I have no need of that hypothesis' — the cosmos as clockwork, God expelled" },
  { id: "darwin", label: "Darwin / Evolutionary", sub: "Origin of Species · 1859", col: 3, h: 55, color: "#b8924a", score: 45,
    note: "Ambiguous — nature has depth and creativity, but no telos; disenchanting" },
  { id: "positivism", label: "Positivism", sub: "Comte, Mach · only measurables exist", col: 3, h: 55, color: "#d48a4e", score: 8,
    note: "The methodological bracket becomes dogma — if you can't measure it, it isn't real" },
  { id: "industrialSci", label: "Industrial Science", sub: "Applied R&D · 19th c. →", col: 3, h: 55, color: "#993a3a", score: 6,
    note: "Science in service of production — the factory consumes natural philosophy" },

  // Col 4 — 20th Century
  { id: "quantum", label: "Quantum / Relativity", sub: "Bohr, Heisenberg, Einstein", col: 4, h: 45, color: "#8B72BE", score: 68, glow: true,
    note: "The observer re-enters — mechanism breaks down at the fundamental level" },
  { id: "pureMath", label: "Pure Mathematics", sub: "Gödel, Grothendieck, Ramanujan", col: 4, h: 35, color: "#3ac5b5", score: 85, glow: true,
    note: "Knowing for its own sake — participation in abstract structure, sunder warumbe" },
  { id: "ecology", label: "Ecology / Systems", sub: "Carson, Lovelock, Bateson", col: 4, h: 45, color: "#8aaa6a", score: 65, glow: true,
    note: "Nature as web of relations — the knower is inside the system, not above it" },
  { id: "bigScience", label: "Big Science", sub: "Manhattan Project, CERN, NASA", col: 4, h: 60, color: "#cc5544", score: 15,
    note: "State-funded megaprojects — science as national power, not wonder" },
  { id: "reductionism", label: "Molecular Reductionism", sub: "DNA, neuroscience · genes as code", col: 4, h: 60, color: "#e06050", score: 10,
    note: "Life is 'just' chemistry — the organism disappears into components" },
  { id: "militaryIndustrial", label: "Military-Industrial R&D", sub: "DARPA, defense contracts", col: 4, h: 50, color: "#e84450", score: 3,
    note: "Science as weapons development — knowledge for domination" },

  // Col 5 — Contemporary (spaced)
  { id: "complexitySci", label: "Complexity / Emergence", sub: "Santa Fe, Kauffman, Prigogine", col: 5, h: 40, color: "#2ee8d0", score: 72, glow: true,
    yOverride: 215, note: "Wholes irreducible to parts — participation and novelty re-enter science" },
  { id: "contemplativeSci", label: "Contemplative Science", sub: "Varela, McGilchrist, enactivism", col: 5, h: 35, color: "#3ac5b5", score: 80, glow: true,
    yOverride: 160, note: "The knower participates in the known — first-person science, embodied cognition" },
  { id: "deepEcology", label: "Deep Ecology", sub: "Naess, Abram · ~3M practitioners", col: 5, h: 35, color: "#8aaa6a", score: 75, glow: true,
    yOverride: 270, note: "Nature has intrinsic value — science as encounter, not extraction" },
  { id: "pharmaTech", label: "Pharma / Biotech", sub: "Drug pipelines, patents · $1.5T", col: 5, h: 50, color: "#aa5a4a", score: 6,
    yOverride: 530, note: "Science as IP pipeline — discover, patent, monetize, repeat" },
  { id: "moveFast", label: "'Move Fast & Break Things'", sub: "Silicon Valley R&D · disruption", col: 5, h: 50, color: "#e84450", score: 3,
    yOverride: 600, note: "Science as competitive advantage — ship it before you understand it" },
  { id: "surveillance", label: "Surveillance Science", sub: "Behavioral prediction, ad-tech", col: 5, h: 45, color: "#dd3a4a", score: 2,
    yOverride: 670, note: "Knowledge of humans as instrument of manipulation — Bacon's endgame" },
  { id: "weaponsAI", label: "Autonomous Weapons / AI Race", sub: "Killer drones, arms race logic", col: 5, h: 45, color: "#993a3a", score: 1,
    yOverride: 735, note: "Knowledge for annihilation — the ultimate inversion of thaumazein" },
  { id: "replicationCrisis", label: "Replication Crisis", sub: "P-hacking, publish-or-perish", col: 5, h: 40, color: "#cc5544", score: 8,
    yOverride: 460, note: "Science eating itself — incentive structure corrupts the method" },
];

const nodes = nodesRaw.map(n => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY(n.score) - n.h / 2,
}));
const nodeMap = {};
nodes.forEach(n => { nodeMap[n.id] = n; });

const links = [
  // Ancient → Early
  { from: "ancient", to: "platonic", value: 15, stream: "platonic" },
  { from: "ancient", to: "islamicScience", value: 12, stream: "islamic" },
  { from: "ancient", to: "medievalNatPhil", value: 18, stream: "medieval" },
  { from: "ancient", to: "nominalistSci", value: 14, stream: "bacon" },

  // Early → Revolution
  { from: "platonic", to: "kepler", value: 10, stream: "platonic" },
  { from: "platonic", to: "newton", value: 3, stream: "platonic" },
  { from: "islamicScience", to: "kepler", value: 4, stream: "islamic" },
  { from: "islamicScience", to: "bacon", value: 4, stream: "islamic" },
  { from: "medievalNatPhil", to: "kepler", value: 5, stream: "medieval" },
  { from: "medievalNatPhil", to: "bacon", value: 6, stream: "bacon" },
  { from: "medievalNatPhil", to: "newton", value: 5, stream: "medieval" },
  { from: "nominalistSci", to: "bacon", value: 8, stream: "bacon" },
  { from: "nominalistSci", to: "descartes", value: 10, stream: "descartes" },

  // Revolution → 18th–19th
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

  // 18th–19th → 20th
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

  // 20th → Contemporary
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
  { from: "militaryIndustrial", to: "moveFast", value: 3, stream: "military" },
];

function computeLinks() {
  const outOffsets = {};
  const inOffsets = {};
  nodes.forEach(n => { outOffsets[n.id] = 0; inOffsets[n.id] = 0; });
  const outTotal = {};
  const inTotal = {};
  nodes.forEach(n => { outTotal[n.id] = 0; inTotal[n.id] = 0; });
  links.forEach(l => {
    outTotal[l.from] = (outTotal[l.from] || 0) + l.value;
    inTotal[l.to] = (inTotal[l.to] || 0) + l.value;
  });
  return links.map(link => {
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
  return <path d={d} fill={`url(#${gradientId})`}
    opacity={dimmed ? 0.03 : highlighted ? 0.6 : 0.3}
    style={{ transition: "opacity 0.4s ease" }} />;
}

function ScorePill({ score, x, y }) {
  const color = scoreToColor(score);
  const pillW = 30;
  const pillH = 12;
  return (
    <g>
      <rect x={x} y={y} width={pillW} height={pillH} rx={6} fill={color} opacity={0.15} />
      <rect x={x + 1} y={y + 1} width={Math.max(2, (pillW - 2) * (score / 100))} height={pillH - 2} rx={5} fill={color} opacity={0.55} />
      <text x={x + pillW + 4} y={y + 10} fill={color} fontSize="10.5"
        fontFamily="'JetBrains Mono', monospace" fontWeight="600">{score}</text>
    </g>
  );
}

function NodeRect({ node, onHover, dimmed, isHovered }) {
  const x = COL_X[node.col];
  const isRight = node.col >= 4;
  const isLeft = node.col <= 1;
  const labelX = isRight ? x + NODE_W + 10 : (isLeft ? x + NODE_W + 10 : x - 8);
  const anchor = isRight ? "start" : (isLeft ? "start" : "end");

  return (
    <g onMouseEnter={() => onHover(node.id)} onMouseLeave={() => onHover(null)}
      style={{ cursor: "pointer", opacity: dimmed ? 0.1 : 1, transition: "opacity 0.4s ease" }}>
      {node.glow && (
        <>
          <rect x={x - 4} y={node.y - 4} width={NODE_W + 8} height={node.h + 8}
            rx={4} fill="none" stroke="#3ac5b5" strokeWidth={1.5} opacity={0.3} />
          <rect x={x - 8} y={node.y - 8} width={NODE_W + 16} height={node.h + 16}
            rx={6} fill="none" stroke="#3ac5b5" strokeWidth={0.5} opacity={0.15} />
        </>
      )}
      <rect x={x} y={node.y} width={NODE_W} height={node.h} rx={3}
        fill={node.color} opacity={isHovered ? 1 : 0.9}
        stroke={isHovered ? "#fff" : "none"} strokeWidth={1.5} />
      <text x={labelX} y={node.y + node.h / 2 - 12} fill={COLORS.text} fontSize="13" fontWeight="700"
        fontFamily="'Crimson Pro', Georgia, serif" textAnchor={anchor} dominantBaseline="middle">
        {node.label}
      </text>
      <text x={labelX} y={node.y + node.h / 2 + 1} fill={COLORS.textDim} fontSize="10.5"
        fontFamily="'Crimson Pro', Georgia, serif" fontStyle="italic"
        textAnchor={anchor} dominantBaseline="middle">
        {node.sub}
      </text>
      <ScorePill score={node.score}
        x={anchor === "end" ? labelX - 48 : labelX}
        y={node.y + node.h / 2 + 10} />
      {isHovered && node.note && (
        <g>
          <rect x={x + (isRight ? -10 : -320)} y={node.y - 32}
            width={320} height={24} rx={4}
            fill="#1a1a18ee" stroke={scoreToColor(node.score)} strokeWidth={0.7} />
          <text x={x + (isRight ? -10 : -320) + 8} y={node.y - 16}
            fill={COLORS.textDim} fontSize="11"
            fontFamily="'Crimson Pro', serif" fontStyle="italic">
            {node.note}
          </text>
        </g>
      )}
    </g>
  );
}

function InvertedBracket() {
  const x = COL_X[5] + NODE_W + 200;
  const y1 = 525;
  const y2 = 785;
  const mid = (y1 + y2) / 2;
  return (
    <g opacity={0.3}>
      <path d={`M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`}
        fill="none" stroke="#e84450" strokeWidth={0.8} />
      <path d={`M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`}
        fill="none" stroke="#e84450" strokeWidth={0.8} />
      <text x={x + 28} y={mid - 6} fill="#e84450" fontSize="9.5"
        fontFamily="'JetBrains Mono', monospace" fontWeight="600" letterSpacing="0.06em">
        ALL SCORE ≤ 8
      </text>
      <text x={x + 28} y={mid + 6} fill={COLORS.textMuted} fontSize="9.5"
        fontFamily="'Crimson Pro', serif" fontStyle="italic">
        fully instrumentalized
      </text>
    </g>
  );
}

const eraLabels = [
  { x: COL_X[0] + 7, label: "ANCIENT" },
  { x: COL_X[1] + 7, label: "MEDIEVAL" },
  { x: COL_X[2] + 7, label: "REVOLUTION" },
  { x: COL_X[3] + 7, label: "18TH–19TH C." },
  { x: COL_X[4] + 7, label: "20TH C." },
  { x: COL_X[5] + 7, label: "CONTEMPORARY" },
];

export default function ScienceSankey() {
  const [hovered, setHovered] = useState(null);
  const linkData = useMemo(() => computeLinks(), []);

  const connectedIds = useMemo(() => {
    if (!hovered) return new Set();
    const ids = new Set([hovered]);
    const visitedFwd = new Set();
    const visitedBack = new Set();
    const fwdQ = [hovered];
    while (fwdQ.length) {
      const cur = fwdQ.pop();
      if (visitedFwd.has(cur)) continue;
      visitedFwd.add(cur);
      ids.add(cur);
      linkData.forEach(l => { if (l.from === cur) { ids.add(l.to); fwdQ.push(l.to); } });
    }
    const bwdQ = [hovered];
    while (bwdQ.length) {
      const cur = bwdQ.pop();
      if (visitedBack.has(cur)) continue;
      visitedBack.add(cur);
      ids.add(cur);
      linkData.forEach(l => { if (l.to === cur) { ids.add(l.from); bwdQ.push(l.from); } });
    }
    return ids;
  }, [hovered, linkData]);

  const isLinkHL = (link) => hovered && connectedIds.has(link.from) && connectedIds.has(link.to);

  return (
    <div style={{
      background: `radial-gradient(ellipse at 20% 15%, #1a1815 0%, ${COLORS.bg} 70%)`,
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
      padding: "24px 16px 20px", fontFamily: "'Crimson Pro', Georgia, serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400&family=JetBrains+Mono:wght@300;400;600&display=swap" rel="stylesheet" />

      <h1 style={{ color: COLORS.text, fontSize: "30px", fontWeight: 300,
        letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "2px", textAlign: "center" }}>
        The Disenchantment of Wonder
      </h1>
      <p style={{ color: COLORS.textDim, fontSize: "16px", fontWeight: 300,
        fontStyle: "italic", marginBottom: "12px", textAlign: "center", maxWidth: 700, lineHeight: 1.5 }}>
        From <em>thaumazein</em> to "move fast and break things" — how science lost participation
        and became instrumentation. The methodological bracket that ate the world. Hover for notes.
      </p>

      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { color: "#3ac5b5", label: "Participatory (70–100)" },
          { color: "#7aaa8a", label: "Moderate (50–69)" },
          { color: "#b8924a", label: "Mixed (35–49)" },
          { color: "#d48a4e", label: "Thinned (20–34)" },
          { color: "#cc6644", label: "Instrumental (10–19)" },
          { color: "#e84450", label: "Fully extractive (0–9)" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: 14, height: 5, borderRadius: 3,
              background: `linear-gradient(90deg, ${item.color}cc, ${item.color}55)` }} />
            <span style={{ color: COLORS.textDim }}>{item.label}</span>
          </div>
        ))}
      </div>

      <svg viewBox={`0 -10 ${W} ${H + 80}`} width="100%"
        style={{ maxWidth: W + 20, overflow: "visible" }}>
        <defs>
          <linearGradient id="bgVertGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3ac5b5" stopOpacity="0.05" />
            <stop offset="30%" stopColor="#3ac5b5" stopOpacity="0.02" />
            <stop offset="50%" stopColor="#b8924a" stopOpacity="0.01" />
            <stop offset="70%" stopColor="#e84450" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#e84450" stopOpacity="0.07" />
          </linearGradient>
          {linkData.map((link, i) => {
            const sc = STREAM_COLORS[link.stream] || { start: "#888", end: "#888" };
            return (
              <linearGradient key={`g${i}`} id={`fg-${i}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={sc.start} stopOpacity="0.8" />
                <stop offset="50%" stopColor={sc.start} stopOpacity="0.4" />
                <stop offset="100%" stopColor={sc.end} stopOpacity="0.8" />
              </linearGradient>
            );
          })}
        </defs>

        <rect x={LEFT_MARGIN - 10} y={TOP_Y - 15} width={W - LEFT_MARGIN + 10}
          height={BOT_Y - TOP_Y + 60} fill="url(#bgVertGrad)" rx={8} />

        {/* Y axis */}
        <g>
          <line x1={58} y1={TOP_Y + 5} x2={58} y2={BOT_Y + 10}
            stroke={COLORS.textMuted} strokeWidth={0.5} opacity={0.25} />
          <path d="M 55 32 L 58 22 L 61 32" fill="none" stroke="#3ac5b5" strokeWidth={0.8} opacity={0.5} />
          <path d={`M 55 ${BOT_Y + 3} L 58 ${BOT_Y + 13} L 61 ${BOT_Y + 3}`}
            fill="none" stroke="#e84450" strokeWidth={0.8} opacity={0.5} />
          <text x={25} y={TOP_Y + 12} fill="#3ac5b5" fontSize="10"
            fontFamily="'JetBrains Mono', monospace" fontWeight="600"
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>WONDER</text>
          {["thaumazein", "participation", "knowing as being", "intrinsic value"].map((w, i) => (
            <text key={w} x={25} y={TOP_Y + 24 + i * 10} fill="#3ac5b5" fontSize="9"
              fontFamily="'Crimson Pro', serif" fontStyle="italic"
              textAnchor="middle" opacity={0.45}>{w}</text>
          ))}
          <text x={25} y={BOT_Y - 40} fill="#e84450" fontSize="10"
            fontFamily="'JetBrains Mono', monospace" fontWeight="600"
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>CONTROL</text>
          {["extraction", "domination", "knowledge as power", "instrumental value"].map((w, i) => (
            <text key={w} x={25} y={BOT_Y - 28 + i * 10} fill="#e84450" fontSize="9"
              fontFamily="'Crimson Pro', serif" fontStyle="italic"
              textAnchor="middle" opacity={0.45}>{w}</text>
          ))}
        </g>

        {[75, 50, 25].map(score => (
          <g key={score}>
            <line x1={LEFT_MARGIN - 5} y1={scoreToY(score)} x2={W - 20} y2={scoreToY(score)}
              stroke={COLORS.textMuted} strokeWidth={0.3} strokeDasharray="4,12" opacity={0.18} />
            <text x={63} y={scoreToY(score) + 3} fill={COLORS.textMuted} fontSize="9"
              fontFamily="'JetBrains Mono', monospace" opacity={0.35} textAnchor="end">{score}</text>
          </g>
        ))}

        {eraLabels.map((era, i) => (
          <g key={i}>
            <line x1={COL_X[i]} y1={TOP_Y - 5} x2={COL_X[i]} y2={BOT_Y + 25}
              stroke={COLORS.textMuted} strokeWidth={0.3} strokeDasharray="2,8" opacity={0.2} />
            <text x={era.x} y={BOT_Y + 45} fill={COLORS.textMuted} fontSize="10"
              fontFamily="'JetBrains Mono', monospace" fontWeight="600" letterSpacing="0.08em">
              {era.label}</text>
          </g>
        ))}

        <InvertedBracket />

        {linkData.map((link, i) => (
          <FlowBand key={i} link={link} gradientId={`fg-${i}`}
            dimmed={hovered ? !isLinkHL(link) : false} highlighted={isLinkHL(link)} />
        ))}

        {nodes.map(node => (
          <NodeRect key={node.id} node={node} onHover={setHovered}
            dimmed={hovered && !connectedIds.has(node.id)} isHovered={hovered === node.id} />
        ))}
      </svg>

      <div style={{
        maxWidth: 750, marginTop: "8px", padding: "14px 20px",
        background: "rgba(255,255,255,0.025)", borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.05)",
      }}>
        <p style={{ color: COLORS.textDim, fontSize: "14px", lineHeight: 1.7,
          margin: 0, fontFamily: "'Crimson Pro', serif", fontWeight: 300 }}>
          <strong style={{ color: COLORS.text, fontWeight: 600 }}>The methodological bracket that ate the world:</strong>{" "}
          <span style={{ color: "#d48a4e" }}>Bacon</span> and{" "}
          <span style={{ color: "#cc6644" }}>Descartes</span> made a practical choice — study only what you
          can measure and manipulate. This produced genuine knowledge. But the bracket hardened into dogma:
          if you can't measure it, it doesn't exist.{" "}
          <span style={{ color: "#b8924a" }}>Newton</span> at 40 genuinely held both — alchemist and mechanist —
          paralleling Catholicism. <span style={{ color: "#8B72BE" }}>Quantum mechanics</span> at 68 broke the
          mechanist framework from within: the observer re-entered. The thin{" "}
          <span style={{ color: "#3ac5b5" }}>teal stream</span> — complexity science, deep ecology,
          enactivism — represents science recovering participation. The{" "}
          <span style={{ color: "#e84450" }}>red zone</span> is Bacon's vision fully realized: knowledge
          as domination, nature as resource, the human as object.
        </p>
      </div>
    </div>
  );
}
