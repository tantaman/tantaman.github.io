import { useState, useMemo } from "react";

const COLORS = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848",
};

const STREAM_COLORS = {
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
  stem: { start: "#aa5a4a", end: "#9a4a3a" },
};

const W = 1340;
const H = 880;
const LEFT_MARGIN = 80;
const COL_X = [LEFT_MARGIN + 10, LEFT_MARGIN + 200, LEFT_MARGIN + 400, LEFT_MARGIN + 600, LEFT_MARGIN + 830, LEFT_MARGIN + 1050];
const NODE_W = 14;
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
  { id: "ancient", label: "Ancient Paideia", sub: "Plato's Academy, Aristotle's Lyceum", col: 0, h: 240, color: "#c9a84c", score: 85,
    note: "Education as formation of the whole soul — truth, beauty, goodness" },

  // Col 1 — Medieval / Renaissance
  { id: "monastic", label: "Monastic Education", sub: "Lectio divina, trivium, quadrivium", col: 1, h: 70, color: "#8B72BE", score: 75, glow: true,
    note: "Learning as spiritual practice — reading as encounter, not information" },
  { id: "medieval", label: "Medieval University", sub: "Paris, Bologna, Oxford · 12th c.", col: 1, h: 80, color: "#b8924a", score: 55,
    note: "Mixed — genuine inquiry + credentialing clerics; disputatio as formation" },
  { id: "humanistRen", label: "Renaissance Humanism", sub: "Erasmus, Vittorino, studia humanitatis", col: 1, h: 70, color: "#3ac5b5", score: 80, glow: true,
    note: "Recovery of classical paideia — the educated person as fully human" },
  { id: "catechism", label: "Catechetical / Confessional", sub: "Luther's catechism, Jesuit Ratio", col: 1, h: 70, color: "#d48a4e", score: 30,
    note: "Education as doctrinal transmission — correct propositions into young minds" },

  // Col 2 — Enlightenment Fork
  { id: "bildung", label: "Bildung", sub: "Humboldt, Schiller, Goethe · 1800s", col: 2, h: 60, color: "#2ee8d0", score: 90, glow: true,
    note: "Self-cultivation through encounter with culture — the whole person unfolds" },
  { id: "prussian", label: "Prussian Model", sub: "State-run, compulsory · 1763 →", col: 2, h: 80, color: "#d48a4e", score: 15,
    note: "THE FORK — education as state manufacture of obedient, literate citizens" },
  { id: "liberalArts", label: "Liberal Arts Tradition", sub: "Newman, Arnold · cultivation of mind", col: 2, h: 60, color: "#8aaa6a", score: 65,
    note: "Knowledge as its own end — the gentleman's education, broad and deep" },
  { id: "rousseau", label: "Rousseau / Natural Education", sub: "Émile · 1762", col: 2, h: 50, color: "#8aaa6a", score: 60,
    note: "The child has innate development — don't pour in content, let it unfold" },

  // Col 3 — 19th–Early 20th Century
  { id: "montessori", label: "Montessori", sub: "Prepared environment · 1907 →", col: 3, h: 45, color: "#3ac5b5", score: 78, glow: true,
    note: "Follow the child — self-directed encounter with materials, inner formation" },
  { id: "waldorf", label: "Waldorf / Steiner", sub: "Imagination, rhythm, will · 1919 →", col: 3, h: 40, color: "#8B72BE", score: 75, glow: true,
    note: "Head, heart, hands — education addresses the whole human being" },
  { id: "dewey", label: "Dewey / Progressive", sub: "Learning by doing · 1890s →", col: 3, h: 50, color: "#8aaa6a", score: 55,
    note: "Ambiguous — genuine experience-based learning but instrumentalized toward democracy" },
  { id: "factorySchool", label: "Factory Model School", sub: "Bells, rows, grades, age-sorting", col: 3, h: 70, color: "#cc5544", score: 8,
    note: "The Prussian model industrialized — school as assembly line for workers" },
  { id: "greatBooks", label: "Great Books", sub: "Hutchins, Adler, St. John's · 1930s", col: 3, h: 45, color: "#7a9aaa", score: 68,
    note: "Encounter with primary texts — the seminar as Socratic dialogue" },
  { id: "landGrant", label: "Land-Grant / Practical", sub: "Morrill Act · 1862", col: 3, h: 50, color: "#b8924a", score: 30,
    note: "Education for agricultural and mechanical arts — useful but narrow" },

  // Col 4 — Late 20th Century
  { id: "classicalRenewal", label: "Classical Schools", sub: "Dorothy Sayers, trivium revival", col: 4, h: 35, color: "#3ac5b5", score: 72, glow: true,
    note: "Recovery of grammar-logic-rhetoric — formation over information" },
  { id: "unschooling", label: "Unschooling / Free Schools", sub: "Holt, Illich, Sudbury", col: 4, h: 35, color: "#2ee8d0", score: 70, glow: true,
    note: "Radical trust in intrinsic motivation — deschooling society" },
  { id: "standardizedTesting", label: "Standardized Testing", sub: "SAT, No Child Left Behind · NCLB", col: 4, h: 60, color: "#e06050", score: 6,
    note: "If you can't measure it, it doesn't count — the test becomes the telos" },
  { id: "credential", label: "Credentialism", sub: "College as prerequisite · degree inflation", col: 4, h: 55, color: "#993a3a", score: 5,
    note: "The diploma as ticket — content irrelevant, only the credential matters" },
  { id: "stemPush", label: "STEM Ideology", sub: "'Learn to code' as sole value", col: 4, h: 50, color: "#aa5a4a", score: 10,
    note: "Only instrumental knowledge counts — humanities as luxury or waste" },
  { id: "libArtsModern", label: "Liberal Arts Colleges", sub: "Small, residential · ~200 schools", col: 4, h: 40, color: "#8aaa6a", score: 55,
    note: "Surviving reservoir — shrinking enrollments, existential financial pressure" },

  // Col 5 — Contemporary (spaced)
  { id: "contemplativeEd", label: "Contemplative Education", sub: "Waldorf, classical, forest schools · ~2M", col: 5, h: 40, color: "#3ac5b5", score: 75, glow: true,
    yOverride: 195, note: "Thin stream — whole-child formation, inner life, beauty as pedagogy" },
  { id: "homeschoolClassical", label: "Classical Homeschool", sub: "Charlotte Mason, Well-Trained Mind", col: 5, h: 35, color: "#8aaa6a", score: 65,
    yOverride: 260, note: "Parent-led recovery of liberal arts — living books, narration, wonder" },
  { id: "seminar", label: "Great Books / Seminar", sub: "St. John's, Gutenberg, Catherine Project", col: 5, h: 35, color: "#7a9aaa", score: 70, glow: true,
    yOverride: 320, note: "Primary text encounter — small, fragile, irreplaceable" },
  { id: "mooc", label: "MOOCs / EdTech", sub: "Coursera, Khan Academy · content delivery", col: 5, h: 50, color: "#e84450", score: 5,
    yOverride: 510, note: "Education as content pipeline — watch videos, pass quizzes, get certificate" },
  { id: "bootcamp", label: "Coding Bootcamps", sub: "12 weeks to job-ready · $15B market", col: 5, h: 45, color: "#dd3a4a", score: 3,
    yOverride: 580, note: "Pure skill extraction — the human as code-producing unit" },
  { id: "corporateTraining", label: "Corporate Training", sub: "Upskilling, compliance, LMS", col: 5, h: 45, color: "#993a3a", score: 2,
    yOverride: 645, note: "Learning in service of employer — you are human capital to be developed" },
  { id: "aiTutor", label: "AI Tutoring / Personalized", sub: "Adaptive algorithms · Khanmigo", col: 5, h: 45, color: "#cc5544", score: 8,
    yOverride: 440, note: "Optimization of content delivery — efficient but disembodied" },
  { id: "microCredential", label: "Micro-credentials / Badges", sub: "Stackable certificates · LinkedIn", col: 5, h: 40, color: "#e84450", score: 2,
    yOverride: 720, note: "Education atomized into resume tokens — the credential without the formation" },
];

const nodes = nodesRaw.map(n => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY(n.score) - n.h / 2,
}));
const nodeMap = {};
nodes.forEach(n => { nodeMap[n.id] = n; });

const links = [
  // Ancient → Medieval
  { from: "ancient", to: "monastic", value: 12, stream: "monastic" },
  { from: "ancient", to: "medieval", value: 18, stream: "ancient" },
  { from: "ancient", to: "humanistRen", value: 15, stream: "paideia" },
  { from: "ancient", to: "catechism", value: 10, stream: "catechism" },

  // Medieval → Enlightenment
  { from: "monastic", to: "bildung", value: 5, stream: "bildung" },
  { from: "monastic", to: "liberalArts", value: 5, stream: "liberal" },
  { from: "humanistRen", to: "bildung", value: 10, stream: "bildung" },
  { from: "humanistRen", to: "liberalArts", value: 5, stream: "liberal" },
  { from: "humanistRen", to: "rousseau", value: 4, stream: "progressive" },
  { from: "medieval", to: "liberalArts", value: 6, stream: "liberal" },
  { from: "medieval", to: "prussian", value: 8, stream: "prussian" },
  { from: "catechism", to: "prussian", value: 8, stream: "prussian" },
  { from: "catechism", to: "liberalArts", value: 2, stream: "catechism" },

  // Enlightenment → 19th–20th
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

  // 19th–20th → Late 20th
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

  // Late 20th → Contemporary
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
  { from: "stemPush", to: "aiTutor", value: 3, stream: "stem" },
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
      <text x={x + pillW + 4} y={y + 10} fill={color} fontSize="8.5"
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
      <text x={labelX} y={node.y + node.h / 2 - 12} fill={COLORS.text} fontSize="10.5" fontWeight="700"
        fontFamily="'Crimson Pro', Georgia, serif" textAnchor={anchor} dominantBaseline="middle">
        {node.label}
      </text>
      <text x={labelX} y={node.y + node.h / 2 + 1} fill={COLORS.textDim} fontSize="8"
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
            fill={COLORS.textDim} fontSize="8.5"
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
  const y1 = 505;
  const y2 = 765;
  const mid = (y1 + y2) / 2;
  return (
    <g opacity={0.3}>
      <path d={`M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`}
        fill="none" stroke="#e84450" strokeWidth={0.8} />
      <path d={`M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`}
        fill="none" stroke="#e84450" strokeWidth={0.8} />
      <text x={x + 28} y={mid - 6} fill="#e84450" fontSize="7.5"
        fontFamily="'JetBrains Mono', monospace" fontWeight="600" letterSpacing="0.06em">
        ALL SCORE ≤ 8
      </text>
      <text x={x + 28} y={mid + 6} fill={COLORS.textMuted} fontSize="7.5"
        fontFamily="'Crimson Pro', serif" fontStyle="italic">
        formation eliminated
      </text>
    </g>
  );
}

const eraLabels = [
  { x: COL_X[0] + 7, label: "ANCIENT" },
  { x: COL_X[1] + 7, label: "MEDIEVAL" },
  { x: COL_X[2] + 7, label: "ENLIGHTENMENT" },
  { x: COL_X[3] + 7, label: "19TH–EARLY 20TH" },
  { x: COL_X[4] + 7, label: "LATE 20TH C." },
  { x: COL_X[5] + 7, label: "CONTEMPORARY" },
];

export default function EducationSankey() {
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

      <h1 style={{ color: COLORS.text, fontSize: "24px", fontWeight: 300,
        letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "2px", textAlign: "center" }}>
        The Flattening of Formation
      </h1>
      <p style={{ color: COLORS.textDim, fontSize: "12px", fontWeight: 300,
        fontStyle: "italic", marginBottom: "12px", textAlign: "center", maxWidth: 700, lineHeight: 1.5 }}>
        From <em>paideia</em> to micro-credentials — how education moved from forming whole
        persons to producing human capital. Hover for diagnostic notes.
      </p>

      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "9.5px", flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { color: "#3ac5b5", label: "Formative (70–100)" },
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
          <text x={25} y={TOP_Y + 12} fill="#3ac5b5" fontSize="8"
            fontFamily="'JetBrains Mono', monospace" fontWeight="600"
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>FORMATION</text>
          {["whole person", "encounter with truth", "inner transformation", "beauty & goodness"].map((w, i) => (
            <text key={w} x={25} y={TOP_Y + 24 + i * 10} fill="#3ac5b5" fontSize="7"
              fontFamily="'Crimson Pro', serif" fontStyle="italic"
              textAnchor="middle" opacity={0.45}>{w}</text>
          ))}
          <text x={25} y={BOT_Y - 40} fill="#e84450" fontSize="8"
            fontFamily="'JetBrains Mono', monospace" fontWeight="600"
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>EXTRACTION</text>
          {["human capital", "content delivery", "credential production", "skill as commodity"].map((w, i) => (
            <text key={w} x={25} y={BOT_Y - 28 + i * 10} fill="#e84450" fontSize="7"
              fontFamily="'Crimson Pro', serif" fontStyle="italic"
              textAnchor="middle" opacity={0.45}>{w}</text>
          ))}
        </g>

        {[75, 50, 25].map(score => (
          <g key={score}>
            <line x1={LEFT_MARGIN - 5} y1={scoreToY(score)} x2={W - 20} y2={scoreToY(score)}
              stroke={COLORS.textMuted} strokeWidth={0.3} strokeDasharray="4,12" opacity={0.18} />
            <text x={63} y={scoreToY(score) + 3} fill={COLORS.textMuted} fontSize="7"
              fontFamily="'JetBrains Mono', monospace" opacity={0.35} textAnchor="end">{score}</text>
          </g>
        ))}

        {eraLabels.map((era, i) => (
          <g key={i}>
            <line x1={COL_X[i]} y1={TOP_Y - 5} x2={COL_X[i]} y2={BOT_Y + 25}
              stroke={COLORS.textMuted} strokeWidth={0.3} strokeDasharray="2,8" opacity={0.2} />
            <text x={era.x} y={BOT_Y + 45} fill={COLORS.textMuted} fontSize="7.5"
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
        <p style={{ color: COLORS.textDim, fontSize: "11px", lineHeight: 1.7,
          margin: 0, fontFamily: "'Crimson Pro', serif", fontWeight: 300 }}>
          <strong style={{ color: COLORS.text, fontWeight: 600 }}>From souls to skills:</strong>{" "}
          <span style={{ color: "#2ee8d0" }}>Bildung</span> at 90 is the Eckhart of education — self-cultivation
          as encounter with culture, the person unfolding into wholeness.{" "}
          <span style={{ color: "#d48a4e" }}>The Prussian model</span> at 15 is the fork — compulsory state
          schooling designed to produce obedient citizens and factory workers.{" "}
          <span style={{ color: "#8aaa6a" }}>Dewey</span> at 55 is this diagram's Catholicism — genuinely
          tried to hold both formation and function, with mixed results.{" "}
          The contemporary teal stream — <span style={{ color: "#3ac5b5" }}>classical schools</span>,{" "}
          <span style={{ color: "#7a9aaa" }}>Great Books seminars</span>,{" "}
          Charlotte Mason homeschoolers — is the contemplative remnant: small, underfunded,
          and irreplaceable. The <span style={{ color: "#e84450" }}>red zone</span> is education
          with the education removed — credential production, content delivery,
          and human capital development.
        </p>
      </div>
    </div>
  );
}
