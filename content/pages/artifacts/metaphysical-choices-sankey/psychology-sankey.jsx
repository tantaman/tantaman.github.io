import { useState, useMemo } from "react";

const COLORS = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848",
};

const STREAM_COLORS = {
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
  attachment: { start: "#8aaa6a", end: "#3ac5b5" },
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
  { id: "ancient", label: "Ancient Psychology", sub: "Plato, Aristotle, Stoics · soul as whole", col: 0, h: 240, color: "#c9a84c", score: 70,
    note: "'Know thyself' — psyche as unfathomable depth, not mechanism" },

  // Col 1 — Early Modern
  { id: "romantic", label: "Romantic Interiority", sub: "Schelling, Goethe, Coleridge", col: 1, h: 70, color: "#3ac5b5", score: 80, glow: true,
    note: "The unconscious as living depth — nature creating through us" },
  { id: "mesmerism", label: "Mesmerism / Magnetism", sub: "Trance, hypnosis · 18th–19th c.", col: 1, h: 55, color: "#8aaa6a", score: 50,
    note: "Early encounter with the unconscious — ambiguous, pre-scientific" },
  { id: "empiricist", label: "British Empiricism", sub: "Locke, Hume · mind as blank slate", col: 1, h: 85, color: "#d48a4e", score: 25,
    note: "THE FORK — mind as passive receiver of sense data, no depth" },
  { id: "physiology", label: "Experimental Physiology", sub: "Fechner, Wundt, Helmholtz", col: 1, h: 75, color: "#b8924a", score: 30,
    note: "Psyche becomes measurable — reaction times, thresholds, stimuli" },

  // Col 2 — The Great Founders
  { id: "freud", label: "Freud / Psychoanalysis", sub: "The Unconscious · 1895–1939", col: 2, h: 80, color: "#8B72BE", score: 65,
    note: "Depth recovered — but reduced to drives, instincts, hydraulic model" },
  { id: "jung", label: "Jung / Analytical", sub: "Archetypes, individuation · 1912 →", col: 2, h: 60, color: "#2ee8d0", score: 88, glow: true,
    note: "The psyche as unfathomable — archetypes, shadow, Self beyond ego" },
  { id: "behaviorism", label: "Behaviorism", sub: "Watson, Skinner · 1913 →", col: 2, h: 95, color: "#d48a4e", score: 8,
    note: "THE INVERSION — no inner life exists, only stimulus → response" },
  { id: "gestalt", label: "Gestalt Psychology", sub: "Wertheimer, Köhler · wholes", col: 2, h: 45, color: "#8aaa6a", score: 55,
    note: "The whole is more than parts — resists reductionism, preserves form" },

  // Col 3 — Mid 20th Century
  { id: "existential", label: "Existential Psychology", sub: "Frankl, May, Binswanger", col: 3, h: 50, color: "#7a9aaa", score: 78, glow: true,
    note: "Meaning, freedom, death, groundlessness — depth without dogma" },
  { id: "humanistic", label: "Humanistic", sub: "Maslow, Rogers · 1960s", col: 3, h: 55, color: "#8aaa6a", score: 55,
    note: "Self-actualization — recovered interiority, but thinned to 'growth'" },
  { id: "objectRelations", label: "Object Relations", sub: "Winnicott, Klein, Bion", col: 3, h: 50, color: "#8B72BE", score: 68,
    note: "Intersubjective depth — the psyche formed in relationship, not isolation" },
  { id: "cogRev", label: "Cognitive Revolution", sub: "Chomsky, Neisser · 1960s", col: 3, h: 65, color: "#cc6644", score: 18,
    note: "Mind as information processor — depth replaced by computation" },
  { id: "industrialOrg", label: "Industrial / Org Psych", sub: "Taylorism meets psychology", col: 3, h: 50, color: "#993a3a", score: 8,
    note: "How to extract maximum productivity from human units" },

  // Col 4 — Late 20th Century
  { id: "jungianContemp", label: "Contemporary Jungian", sub: "Hillman, Romanyshyn · ~2M", col: 4, h: 35, color: "#3ac5b5", score: 85, glow: true,
    note: "Archetypal psychology — soul-making, image, depth as irreducible" },
  { id: "somatic", label: "Somatic / Body", sub: "Levine, van der Kolk, Porges", col: 4, h: 40, color: "#3ac5b5", score: 70, glow: true,
    note: "The body keeps the score — depth recovered through flesh, not cognition" },
  { id: "relational", label: "Relational Psychoanalysis", sub: "Mitchell, Benjamin · intersubjective", col: 4, h: 40, color: "#8B72BE", score: 72, glow: true,
    note: "Analyst and patient co-create meaning — participatory knowing" },
  { id: "cbt", label: "CBT", sub: "Beck, Ellis · ~dominant", col: 4, h: 65, color: "#cc5544", score: 20,
    note: "Swap bad propositions for good ones — forensic, propositional, effective" },
  { id: "positivePsych", label: "Positive Psychology", sub: "Seligman · 1998 →", col: 4, h: 55, color: "#e06050", score: 12,
    note: "Happiness as measurable output — optimism techniques, gratitude lists" },
  { id: "neuroreductionism", label: "Neuroreductionism", sub: "Brain scans as explanation", col: 4, h: 55, color: "#d48a4e", score: 10,
    note: "You ARE your brain — consciousness as epiphenomenon, medicate it" },

  // Col 5 — Contemporary (spaced with yOverride)
  { id: "contemplativePsych", label: "Contemplative / Depth", sub: "IFS depth, psychedelic therapy · ~5M", col: 5, h: 40, color: "#3ac5b5", score: 78, glow: true,
    yOverride: 195, note: "Psychedelics + depth tradition recovery — participatory encounter" },
  { id: "attachModern", label: "Attachment / Polyvagal", sub: "Relational neuroscience", col: 5, h: 40, color: "#8aaa6a", score: 55,
    yOverride: 310, note: "Bridge — uses neuroscience but respects relational depth" },
  { id: "appBasedCBT", label: "App-Based Therapy", sub: "BetterHelp, Woebot, Calm", col: 5, h: 50, color: "#cc5544", score: 8,
    yOverride: 530, note: "Therapy as subscription product — scale over depth" },
  { id: "selfHelp", label: "Self-Help Industrial", sub: "Huberman, Atomic Habits · ~$15B", col: 5, h: 55, color: "#e84450", score: 4,
    yOverride: 600, note: "Optimize your dopamine — psychology as productivity technique" },
  { id: "biohack", label: "Biohacking / Optimization", sub: "Quantified self, nootropics", col: 5, h: 45, color: "#dd3a4a", score: 2,
    yOverride: 675, note: "The human as machine to be tuned — total exteriorization" },
  { id: "corporateWellness", label: "Corporate Wellness", sub: "Resilience training, EAPs", col: 5, h: 45, color: "#993a3a", score: 3,
    yOverride: 740, note: "Manage your stress so you can produce more — psychology in service of capital" },
];

const nodes = nodesRaw.map(n => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY(n.score) - n.h / 2,
}));
const nodeMap = {};
nodes.forEach(n => { nodeMap[n.id] = n; });

const links = [
  // Ancient → Early Modern
  { from: "ancient", to: "romantic", value: 15, stream: "depth" },
  { from: "ancient", to: "mesmerism", value: 8, stream: "ancient" },
  { from: "ancient", to: "empiricist", value: 25, stream: "behavioral" },
  { from: "ancient", to: "physiology", value: 18, stream: "mainPsych" },

  // Early Modern → Founders
  { from: "romantic", to: "jung", value: 8, stream: "jung" },
  { from: "romantic", to: "freud", value: 5, stream: "depth" },
  { from: "mesmerism", to: "freud", value: 5, stream: "freud" },
  { from: "empiricist", to: "behaviorism", value: 20, stream: "behavioral" },
  { from: "empiricist", to: "freud", value: 3, stream: "freud" },
  { from: "physiology", to: "behaviorism", value: 8, stream: "behavioral" },
  { from: "physiology", to: "gestalt", value: 6, stream: "humanistic" },
  { from: "physiology", to: "freud", value: 5, stream: "freud" },

  // Founders → Mid Century
  { from: "freud", to: "objectRelations", value: 10, stream: "psychoanalytic" },
  { from: "freud", to: "existential", value: 4, stream: "existential" },
  { from: "freud", to: "humanistic", value: 4, stream: "humanistic" },
  { from: "jung", to: "existential", value: 4, stream: "jung" },
  { from: "jung", to: "humanistic", value: 3, stream: "jung" },
  { from: "jung", to: "jungianContemp", value: 6, stream: "jung" },
  { from: "gestalt", to: "humanistic", value: 4, stream: "humanistic" },
  { from: "behaviorism", to: "cogRev", value: 20, stream: "cognitive" },
  { from: "behaviorism", to: "industrialOrg", value: 10, stream: "industrial" },

  // Mid Century → Late 20th
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

  // Late 20th → Contemporary
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
  { from: "neuroreductionism", to: "selfHelp", value: 3, stream: "selfHelp" },
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
          <rect x={x + (isRight ? -10 : -350)} y={node.y - 38}
            width={350} height={30} rx={4}
            fill="#1a1a18ee" stroke={scoreToColor(node.score)} strokeWidth={0.7} />
          <text x={x + (isRight ? -10 : -350) + 8} y={node.y - 18}
            fill={COLORS.textDim} fontSize="14"
            fontFamily="'Crimson Pro', serif" fontStyle="italic">
            {node.note}
          </text>
        </g>
      )}
    </g>
  );
}

function InvertedBracket() {
  const x = COL_X[5] + NODE_W + 195;
  const y1 = 525;
  const y2 = 790;
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
  { x: COL_X[1] + 7, label: "EARLY MODERN" },
  { x: COL_X[2] + 7, label: "FOUNDERS" },
  { x: COL_X[3] + 7, label: "MID 20TH C." },
  { x: COL_X[4] + 7, label: "LATE 20TH C." },
  { x: COL_X[5] + 7, label: "CONTEMPORARY" },
];

export default function PsychologySankey() {
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
        The Genealogy of Depth
      </h1>
      <p style={{ color: COLORS.textDim, fontSize: "16px", fontWeight: 300,
        fontStyle: "italic", marginBottom: "12px", textAlign: "center", maxWidth: 700, lineHeight: 1.5 }}>
        From "know thyself" to "optimize your dopamine" — how psychology lost and sometimes
        recovered the participatory depths of the psyche. Hover for diagnostic notes.
      </p>

      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { color: "#3ac5b5", label: "Depth / participatory (70–100)" },
          { color: "#7aaa8a", label: "Moderate (50–69)" },
          { color: "#b8924a", label: "Mixed (35–49)" },
          { color: "#d48a4e", label: "Thinned (20–34)" },
          { color: "#cc6644", label: "Instrumental (10–19)" },
          { color: "#e84450", label: "Fully externalized (0–9)" },
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
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>DEPTH</text>
          {["unfathomable psyche", "participatory knowing", "soul as whole", "transformation"].map((w, i) => (
            <text key={w} x={25} y={TOP_Y + 24 + i * 10} fill="#3ac5b5" fontSize="9"
              fontFamily="'Crimson Pro', serif" fontStyle="italic"
              textAnchor="middle" opacity={0.45}>{w}</text>
          ))}
          <text x={25} y={BOT_Y - 40} fill="#e84450" fontSize="10"
            fontFamily="'JetBrains Mono', monospace" fontWeight="600"
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>SURFACE</text>
          {["mechanism", "optimization", "productivity", "technique"].map((w, i) => (
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
          <strong style={{ color: COLORS.text, fontWeight: 600 }}>The same shape:</strong>{" "}
          <span style={{ color: "#2ee8d0" }}>Jung</span> at 88 plays Eckhart's role — the psyche as
          unfathomable depth, individuation as participatory transformation.{" "}
          <span style={{ color: "#d48a4e" }}>Behaviorism</span> at 8 is the nominalist fork — there IS no inner
          life, only stimulus and response.{" "}
          <span style={{ color: "#8B72BE" }}>Freud</span> at 65 parallels Catholicism — recovered depth but
          reduced it to mechanism (drives, hydraulics).{" "}
          <span style={{ color: "#cc5544" }}>CBT</span> at 20 is the Westminster Confession of psychology —
          swap bad propositions for correct ones. The bottom row is the prosperity gospel of the mind:
          optimize, hack, subscribe, produce.
          The thin <span style={{ color: "#3ac5b5" }}>teal stream</span> — somatic work, psychedelic therapy,
          depth analysis — persists but is dwarfed by the $15B self-help industry.
        </p>
      </div>
    </div>
  );
}
