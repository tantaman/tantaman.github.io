import { useState, useMemo } from "react";

const COLORS = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848",
};

const STREAM_COLORS = {
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
  app: { start: "#aa5a4a", end: "#9a4a3a" },
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
  { id: "buddha", label: "The Buddha's Teaching", sub: "Siddhartha Gautama · ~5th c. BCE", col: 0, h: 240, color: "#c9a84c", score: 92,
    note: "Direct awakening — dukkha, anatta, sunyata; you are already what you seek" },

  // Col 1 — Early Schools
  { id: "theravada", label: "Theravada", sub: "Pali Canon · 'Way of the Elders'", col: 1, h: 85, color: "#b8924a", score: 60,
    note: "Preserved early teachings but systematized them — monasticism + canon" },
  { id: "abhidharma", label: "Abhidharma", sub: "Scholastic cataloging · 3rd c. BCE →", col: 1, h: 65, color: "#d48a4e", score: 28,
    note: "The Westminster Confession impulse — catalog all phenomena, classify all states" },
  { id: "mahayana", label: "Early Mahayana", sub: "Bodhisattva ideal · 1st c. BCE →", col: 1, h: 90, color: "#8B72BE", score: 75,
    note: "Compassion + emptiness; liberation for all beings, not just monks" },

  // Col 2 — Classical Flowering
  { id: "nagarjuna", label: "Nagarjuna / Madhyamaka", sub: "Emptiness of emptiness · 2nd c.", col: 2, h: 60, color: "#3ac5b5", score: 95, glow: true,
    note: "THE PEAK — sunyata dissolves all categories including 'sunyata'; Eckhart's twin" },
  { id: "yogacara", label: "Yogacara", sub: "Mind-only · Vasubandhu, Asanga", col: 2, h: 50, color: "#7a9aaa", score: 70, glow: true,
    note: "Consciousness as ground — deep interiority, eight-consciousness model" },
  { id: "pureLand", label: "Pure Land", sub: "Amitabha saves · other-power", col: 2, h: 65, color: "#d48a4e", score: 25,
    note: "Externalized liberation — faith in another Buddha who saves you from outside" },
  { id: "chan", label: "Chan Buddhism", sub: "Bodhidharma → Chinese Zen · 6th c.", col: 2, h: 60, color: "#2ee8d0", score: 90, glow: true,
    note: "Direct pointing at mind — 'not dependent on words and letters'" },
  { id: "tantra", label: "Vajrayana / Tantra", sub: "Esoteric Buddhism · 7th c. →", col: 2, h: 55, color: "#8B72BE", score: 72,
    note: "Transformation through ritual, mantra, visualization — powerful but ambiguous" },

  // Col 3 — Regional Institutionalization
  { id: "zenJapan", label: "Japanese Zen", sub: "Dogen, Rinzai, Soto · 12th c. →", col: 3, h: 50, color: "#2ee8d0", score: 85, glow: true,
    note: "Shikantaza — just sitting; practice-realization unity; sunder warumbe" },
  { id: "tibetan", label: "Tibetan Buddhism", sub: "Dalai Lama, Kagyu, Nyingma, Gelug", col: 3, h: 55, color: "#8B72BE", score: 65,
    note: "Preserved vast teachings — but also theocratic power, institutional hierarchy" },
  { id: "dzogchen", label: "Dzogchen / Mahamudra", sub: "Great Perfection · Nyingma, Kagyu", col: 3, h: 40, color: "#3ac5b5", score: 92, glow: true,
    note: "Already awake — natural state needs no modification; pure Gelassenheit" },
  { id: "theravadaSE", label: "Southeast Asian Theravada", sub: "Sri Lanka, Thailand, Myanmar", col: 3, h: 60, color: "#b8924a", score: 48,
    note: "Mixed — forest monks at 80+ but state Buddhism at 25; holds both" },
  { id: "nichiren", label: "Nichiren", sub: "Chant for benefits · 13th c. Japan", col: 3, h: 50, color: "#cc5544", score: 12,
    note: "THE FORK — chant the Lotus Sutra title for worldly results; transactional" },
  { id: "pureLandEA", label: "East Asian Pure Land", sub: "Honen, Shinran · nembutsu", col: 3, h: 50, color: "#d48a4e", score: 22,
    note: "Radical other-power — but Shinran deepened it into genuine humility" },

  // Col 4 — Modern
  { id: "zenWest", label: "Western Zen", sub: "Suzuki, Shunryu Suzuki, Thich Nhat Hanh", col: 4, h: 40, color: "#3ac5b5", score: 80, glow: true,
    note: "Genuine transmission — sitting practice, teacher-student, koan; thin but alive" },
  { id: "vipassana", label: "Vipassana Revival", sub: "Mahasi, Goenka, IMS · insight meditation", col: 4, h: 45, color: "#8aaa6a", score: 55,
    note: "Recovered practice from scholasticism — but risks technique-ification" },
  { id: "engagedBuddhism", label: "Engaged Buddhism", sub: "Thich Nhat Hanh, Macy, Loy", col: 4, h: 40, color: "#8aaa6a", score: 62,
    note: "Awakening applied to social suffering — contemplation + action" },
  { id: "tibetanWest", label: "Tibetan in West", sub: "Trungpa, FPMT, Shambhala", col: 4, h: 40, color: "#8B72BE", score: 60,
    note: "Rich teachings transmitted but institutional scandals reveal power problems" },
  { id: "secularBuddhism", label: "Secular Buddhism", sub: "Batchelor, naturalized dharma", col: 4, h: 45, color: "#cc6644", score: 30,
    note: "Strips metaphysics, keeps ethics and meditation — useful but thinned" },
  { id: "sgi", label: "SGI / Soka Gakkai", sub: "Nichiren lay movement · 12M members", col: 4, h: 50, color: "#e06050", score: 8,
    note: "Chant nam-myoho-renge-kyo for car, job, partner — prosperity gospel of Buddhism" },
  { id: "buddhistNationalism", label: "Buddhist Nationalism", sub: "Myanmar 969, Sri Lanka BBS", col: 4, h: 45, color: "#993a3a", score: 3,
    note: "Buddhist identity as ethnic weapon — the compassion tradition weaponized" },

  // Col 5 — Contemporary (spaced)
  { id: "livingPractice", label: "Living Practice", sub: "Zen, Dzogchen, forest monks · ~15M", col: 5, h: 40, color: "#3ac5b5", score: 82, glow: true,
    yOverride: 165, note: "Genuine awakening traditions — teacher-student, intensive retreat, koan" },
  { id: "dharmaTeachers", label: "Independent Dharma", sub: "Post-lineage teachers, podcasts", col: 5, h: 35, color: "#8aaa6a", score: 55,
    yOverride: 310, note: "Bridge — sincere practice but untethered from institutional depth" },
  { id: "mcmindfulness", label: "McMindfulness", sub: "Corporate MBSR · Google, SAP", col: 5, h: 55, color: "#e84450", score: 3,
    yOverride: 510, note: "Awakening repurposed as productivity tool — meditate to optimize output" },
  { id: "wellnessApps", label: "Meditation Apps", sub: "Headspace, Calm, Ten Percent · $5B", col: 5, h: 50, color: "#dd3a4a", score: 4,
    yOverride: 585, note: "Sunyata as subscription — 'reduce anxiety in 10 minutes a day'" },
  { id: "retreatIndustry", label: "Retreat Tourism", sub: "Bali, Sedona, ayahuasca circuit", col: 5, h: 45, color: "#aa5a4a", score: 5,
    yOverride: 655, note: "Spiritual experiences as luxury consumption — enlightenment vacations" },
  { id: "buddhistCapital", label: "Mindful Capitalism", sub: "'Conscious leadership', Wisdom 2.0", col: 5, h: 45, color: "#993a3a", score: 2,
    yOverride: 720, note: "Dharma in service of capital — the ultimate inversion of renunciation" },
];

const nodes = nodesRaw.map(n => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY(n.score) - n.h / 2,
}));
const nodeMap = {};
nodes.forEach(n => { nodeMap[n.id] = n; });

const links = [
  // Buddha → Early Schools
  { from: "buddha", to: "theravada", value: 20, stream: "theravada" },
  { from: "buddha", to: "abhidharma", value: 12, stream: "abhidharma" },
  { from: "buddha", to: "mahayana", value: 25, stream: "mahayana" },

  // Early → Classical
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

  // Classical → Regional
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

  // Regional → Modern
  { from: "zenJapan", to: "zenWest", value: 8, stream: "zen" },
  { from: "dzogchen", to: "tibetanWest", value: 4, stream: "dzogchen" },
  { from: "dzogchen", to: "zenWest", value: 2, stream: "dzogchen" },
  { from: "tibetan", to: "tibetanWest", value: 6, stream: "tibetan" },
  { from: "theravadaSE", to: "vipassana", value: 8, stream: "vipassana" },
  { from: "theravadaSE", to: "buddhistNationalism", value: 5, stream: "nationalist" },
  { from: "theravadaSE", to: "secularBuddhism", value: 3, stream: "secular" },
  { from: "nichiren", to: "sgi", value: 8, stream: "sgi" },
  { from: "pureLandEA", to: "secularBuddhism", value: 3, stream: "secular" },

  // Modern → Contemporary
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
  { from: "sgi", to: "retreatIndustry", value: 2, stream: "wellness" },
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
          <rect x={x + (isRight ? -10 : -360)} y={node.y - 38}
            width={360} height={30} rx={4}
            fill="#1a1a18ee" stroke={scoreToColor(node.score)} strokeWidth={0.7} />
          <text x={x + (isRight ? -10 : -360) + 8} y={node.y - 18}
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
  const y1 = 505;
  const y2 = 770;
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
        awakening commodified
      </text>
    </g>
  );
}

const eraLabels = [
  { x: COL_X[0] + 7, label: "ORIGINS" },
  { x: COL_X[1] + 7, label: "EARLY SCHOOLS" },
  { x: COL_X[2] + 7, label: "CLASSICAL" },
  { x: COL_X[3] + 7, label: "REGIONAL" },
  { x: COL_X[4] + 7, label: "MODERN" },
  { x: COL_X[5] + 7, label: "CONTEMPORARY" },
];

export default function BuddhismSankey() {
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
        The Commodification of Awakening
      </h1>
      <p style={{ color: COLORS.textDim, fontSize: "16px", fontWeight: 300,
        fontStyle: "italic", marginBottom: "12px", textAlign: "center", maxWidth: 700, lineHeight: 1.5 }}>
        From the Buddha's direct insight to corporate mindfulness — how a tradition of
        radical renunciation became a productivity tool. Hover for diagnostic notes.
      </p>

      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { color: "#3ac5b5", label: "Awakened / participatory (70–100)" },
          { color: "#7aaa8a", label: "Moderate (50–69)" },
          { color: "#b8924a", label: "Mixed (35–49)" },
          { color: "#d48a4e", label: "Thinned (20–34)" },
          { color: "#cc6644", label: "Instrumental (10–19)" },
          { color: "#e84450", label: "Fully inverted (0–9)" },
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
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>AWAKENING</text>
          {["sunyata / emptiness", "anatta / no-self", "prajna / insight", "liberation"].map((w, i) => (
            <text key={w} x={25} y={TOP_Y + 24 + i * 10} fill="#3ac5b5" fontSize="9"
              fontFamily="'Crimson Pro', serif" fontStyle="italic"
              textAnchor="middle" opacity={0.45}>{w}</text>
          ))}
          <text x={25} y={BOT_Y - 40} fill="#e84450" fontSize="10"
            fontFamily="'JetBrains Mono', monospace" fontWeight="600"
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>CRAVING</text>
          {["acquisition", "commodification", "technique as product", "ego optimization"].map((w, i) => (
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
          <strong style={{ color: COLORS.text, fontWeight: 600 }}>The deepest irony:</strong>{" "}
          Buddhism's core teaching is that <em>craving causes suffering</em>. The contemporary
          inversion uses Buddhist technique to <em>optimize craving</em> — meditate so you can
          want more effectively.{" "}
          <span style={{ color: "#3ac5b5" }}>Nagarjuna</span> at 95 and{" "}
          <span style={{ color: "#2ee8d0" }}>Dzogchen</span> at 92 are Buddhism's Eckhart —
          emptiness that dissolves even the concept of emptiness.{" "}
          <span style={{ color: "#cc5544" }}>Nichiren</span> at 12 is the fork — chant the sutra
          title for material results, exactly paralleling the prosperity gospel.{" "}
          <span style={{ color: "#993a3a" }}>Buddhist nationalism</span> at 3 weaponizes
          compassion for ethnic violence.{" "}
          The <span style={{ color: "#e84450" }}>bottom row</span> — McMindfulness,
          meditation apps, Wisdom 2.0 — is renunciation repackaged as consumption. The
          tradition that began with a man leaving his palace to sit under a tree now sells
          subscriptions for $14.99/month.
        </p>
      </div>
    </div>
  );
}
