import { useState, useMemo } from "react";

const COLORS = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848",
};

const STREAM_COLORS = {
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
  wordOfFaith: { start: "#dd3a4a", end: "#cc2a3a" },
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

// For the last column, we space nodes evenly within the inverted zone
// rather than stacking them all at score 2-5
const nodesRaw = [
  { id: "early", label: "Early Church", sub: "1st–4th c.", col: 0, h: 220, color: "#c9a84c", score: 60,
    note: "Mixed — Desert Fathers & institutional hierarchy coexist" },
  { id: "orthodox", label: "Eastern Orthodox", sub: "220M", col: 1, h: 75, color: "#7a6aad", score: 75,
    note: "Theosis, apophatic theology, hesychasm — strong participatory DNA" },
  { id: "western", label: "Western Church", sub: "5th–13th c.", col: 1, h: 200, color: "#b8924a", score: 55,
    note: "Aquinas's participation + growing institutional legalism" },
  { id: "mystical", label: "Mystical / Participatory", sub: "Eckhart, Rhineland Mystics", col: 2, h: 65, color: "#3ac5b5", score: 95, glow: true,
    note: "The source — Gelassenheit, sunder warumbe, ground of being" },
  { id: "nominalist", label: "Nominalist / Voluntarist", sub: "Ockham, Scotus — 14th c.", col: 2, h: 105, color: "#d48a4e", score: 12,
    note: "THE FORK — God as supreme will, not ground of being" },
  { id: "cathContinue", label: "Catholic Church", sub: "1.4B", col: 2, h: 170, color: "#b8924a", score: 55,
    note: "Theology ~70% participatory, practice ~40% — holds both" },
  { id: "contemplative", label: "Contemplative Tradition", sub: "John of Cross, Teresa, Cloud", col: 3, h: 45, color: "#3ac5b5", score: 90, glow: true,
    note: "Preserves the interior, apophatic, detached tradition" },
  { id: "reformation", label: "Reformation", sub: "1517 →", col: 3, h: 70, color: "#cc6644", score: 18,
    note: "Sola scriptura + forensic justification = voluntarist framework" },
  { id: "reformed", label: "Reformed / Calvinist", sub: "75M", col: 3, h: 55, color: "#b85a3e", score: 12,
    note: "TULIP, divine sovereignty as will, double predestination" },
  { id: "pietist", label: "Pietist / Methodist", sub: "80M", col: 3, h: 50, color: "#c48a5e", score: 30,
    note: "Some interiority (heart religion) but experiential, not apophatic" },
  { id: "mainline", label: "Mainline Protestant", sub: "80M", col: 3, h: 50, color: "#8aaa6a", score: 35,
    note: "Some recovered contemplative elements; less transactional" },
  { id: "modContemp", label: "Modern Contemplatives", sub: "Merton, Keating, Rohr · ~10M", col: 4, h: 32, color: "#3ac5b5", score: 88, glow: true,
    note: "Active recovery of Eckhartian interiority & participation" },
  { id: "amEvang", label: "American Evangelicalism", sub: "Great Awakenings → incl. McLean Bible", col: 4, h: 68, color: "#d48a4e", score: 14,
    note: "Propositional faith, forensic atonement, decisionism" },
  { id: "pentecostal", label: "Pentecostalism", sub: "300M", col: 4, h: 75, color: "#e06050", score: 10,
    note: "Experiential but exteriorized — power, signs, spiritual combat" },
  { id: "fundamentalism", label: "Fundamentalism", sub: "~100M", col: 4, h: 65, color: "#cc5544", score: 6,
    note: "Epistemological certainty replaces unknowing; inerrancy" },

  // Last column: use yOverride to space evenly in the inverted zone
  { id: "prosperity", label: "Prosperity Gospel", sub: "Osteen, Copeland · ~300M", col: 5, h: 65, color: "#e84450", score: 2,
    yOverride: 470, note: "Acquisition vs. poverty — most direct inversion of Gelassenheit" },
  { id: "wordOfFaith", label: "Word of Faith", sub: "name it, claim it · ~150M", col: 5, h: 55, color: "#dd3a4a", score: 3,
    yOverride: 555, note: "Spoken words as causal magic — technique replaces contemplation" },
  { id: "dispensationalism", label: "Dispensationalism", sub: "Darby → Scofield · ~50M", col: 5, h: 48, color: "#cc6654", score: 5,
    yOverride: 630, note: "Obsessive timeline replaces Eckhart's eternal now" },
  { id: "nationalism", label: "Christian Nationalism", sub: "dominion + identity · ~35M", col: 5, h: 48, color: "#993a3a", score: 3,
    yOverride: 698, note: "Exteriorizes faith into political conquest" },
  { id: "dominion", label: "Dominion / 7 Mountains", sub: "cultural conquest · ~15M", col: 5, h: 42, color: "#aa5a4a", score: 2,
    yOverride: 766, note: "Power over vs. participation in — institutional capture" },
];

const nodes = nodesRaw.map(n => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY(n.score) - n.h / 2,
}));
const nodeMap = {};
nodes.forEach(n => { nodeMap[n.id] = n; });

const links = [
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
  { from: "amEvang", to: "nationalism", value: 2, stream: "nationalism" },
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
          <rect x={x + (isRight ? -10 : -330)} y={node.y - 38}
            width={330} height={30} rx={4}
            fill="#1a1a18ee" stroke={scoreToColor(node.score)} strokeWidth={0.7} />
          <text x={x + (isRight ? -10 : -330) + 8} y={node.y - 18}
            fill={COLORS.textDim} fontSize="14"
            fontFamily="'Crimson Pro', serif" fontStyle="italic">
            {node.note}
          </text>
        </g>
      )}
    </g>
  );
}

// Bracket for the inverted zone in last column
function InvertedBracket() {
  const x = COL_X[5] + NODE_W + 185;
  const y1 = 465;
  const y2 = 812;
  const mid = (y1 + y2) / 2;
  return (
    <g opacity={0.3}>
      <path d={`M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`}
        fill="none" stroke="#e84450" strokeWidth={0.8} />
      <path d={`M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`}
        fill="none" stroke="#e84450" strokeWidth={0.8} />
      <text x={x + 28} y={mid - 6} fill="#e84450" fontSize="9.5"
        fontFamily="'JetBrains Mono', monospace" fontWeight="600" letterSpacing="0.06em">
        ALL SCORE ≤ 5
      </text>
      <text x={x + 28} y={mid + 6} fill={COLORS.textMuted} fontSize="9.5"
        fontFamily="'Crimson Pro', serif" fontStyle="italic">
        fully inverted
      </text>
    </g>
  );
}

const eraLabels = [
  { x: COL_X[0] + 7, label: "ORIGINS" },
  { x: COL_X[1] + 7, label: "SCHISM" },
  { x: COL_X[2] + 7, label: "MEDIEVAL FORK" },
  { x: COL_X[3] + 7, label: "REFORMATION" },
  { x: COL_X[4] + 7, label: "AMERICAN" },
  { x: COL_X[5] + 7, label: "CONTEMPORARY" },
];

export default function TheologicalSankey() {
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
        The Genealogy of Inversion
      </h1>
      <p style={{ color: COLORS.textDim, fontSize: "16px", fontWeight: 300,
        fontStyle: "italic", marginBottom: "12px", textAlign: "center", maxWidth: 680, lineHeight: 1.5 }}>
        Vertical position = alignment with Eckhart's participatory metaphysics.
        Each node shows an <strong style={{ color: COLORS.text, fontWeight: 600 }}>alignment score</strong> (0–100).
        Hover for diagnostic notes.
      </p>

      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { color: "#3ac5b5", label: "High alignment (70–100)" },
          { color: "#7aaa8a", label: "Moderate (50–69)" },
          { color: "#b8924a", label: "Mixed (35–49)" },
          { color: "#d48a4e", label: "Low (20–34)" },
          { color: "#cc6644", label: "Very low (10–19)" },
          { color: "#e84450", label: "Inverted (0–9)" },
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
              textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>ECKHARTIAN</text>
            {["interiority", "detachment", "participation", "apophasis"].map((w, i) => (
              <text key={w} x={25} y={TOP_Y + 24 + i * 10} fill="#3ac5b5" fontSize="9"
                fontFamily="'Crimson Pro', serif" fontStyle="italic"
                textAnchor="middle" opacity={0.45}>{w}</text>
            ))}
            <text x={25} y={BOT_Y - 40} fill="#e84450" fontSize="10"
              fontFamily="'JetBrains Mono', monospace" fontWeight="600"
              textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>INVERTED</text>
            {["exteriority", "acquisition", "contract", "certainty"].map((w, i) => (
              <text key={w} x={25} y={BOT_Y - 28 + i * 10} fill="#e84450" fontSize="9"
                fontFamily="'Crimson Pro', serif" fontStyle="italic"
                textAnchor="middle" opacity={0.45}>{w}</text>
            ))}
          </g>

          {/* Score reference lines */}
          {[75, 50, 25].map(score => (
            <g key={score}>
              <line x1={LEFT_MARGIN - 5} y1={scoreToY(score)} x2={W - 20} y2={scoreToY(score)}
                stroke={COLORS.textMuted} strokeWidth={0.3} strokeDasharray="4,12" opacity={0.18} />
              <text x={63} y={scoreToY(score) + 3} fill={COLORS.textMuted} fontSize="9"
                fontFamily="'JetBrains Mono', monospace" opacity={0.35} textAnchor="end">{score}</text>
            </g>
          ))}

          {/* Era columns */}
          {eraLabels.map((era, i) => (
            <g key={i}>
              <line x1={COL_X[i]} y1={TOP_Y - 5} x2={COL_X[i]} y2={BOT_Y + 25}
                stroke={COLORS.textMuted} strokeWidth={0.3} strokeDasharray="2,8" opacity={0.2} />
              <text x={era.x} y={BOT_Y + 45} fill={COLORS.textMuted} fontSize="10"
                fontFamily="'JetBrains Mono', monospace" fontWeight="600" letterSpacing="0.08em">
                {era.label}</text>
            </g>
          ))}

          {/* Inverted zone bracket */}
          <InvertedBracket />

          {/* Flows */}
          {linkData.map((link, i) => (
            <FlowBand key={i} link={link} gradientId={`fg-${i}`}
              dimmed={hovered ? !isLinkHL(link) : false} highlighted={isLinkHL(link)} />
          ))}

          {/* Nodes */}
          {nodes.map(node => (
            <NodeRect key={node.id} node={node} onHover={setHovered}
              dimmed={hovered && !connectedIds.has(node.id)} isHovered={hovered === node.id} />
          ))}
        </svg>

      <div style={{
        maxWidth: 750, marginTop: "10px", padding: "14px 20px",
        background: "rgba(255,255,255,0.025)", borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.05)",
      }}>
        <p style={{ color: COLORS.textDim, fontSize: "14px", lineHeight: 1.7,
          margin: 0, fontFamily: "'Crimson Pro', serif", fontWeight: 300 }}>
          <strong style={{ color: COLORS.text, fontWeight: 600 }}>How to read this:</strong>{" "}
          Higher = closer to Eckhart (interiority, detachment, participation, apophatic unknowing).
          Lower = the inversion (exteriority, acquisition, contractual God, propositional certainty).{" "}
          The five movements in the bottom-right are spaced for readability but all score ≤ 5 —
          they are each a distinct flavor of the same fundamental inversion.{" "}
          <span style={{ color: "#b8924a" }}>Catholicism</span> at 55 genuinely holds both streams.{" "}
          <span style={{ color: "#7a6aad" }}>Eastern Orthodoxy</span> at 75 retains more
          participatory DNA. Churches like McLean Bible sit in American Evangelicalism (~14).
        </p>
      </div>
    </div>
  );
}
