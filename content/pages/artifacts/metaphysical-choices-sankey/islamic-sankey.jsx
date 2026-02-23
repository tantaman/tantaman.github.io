import { useState, useMemo } from "react";

const COLORS = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848",
};

const STREAM_COLORS = {
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
  mainstream: { start: "#b8924a", end: "#9a7a4a" },
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
  { id: "earlyIslam", label: "Early Islam", sub: "Prophetic community · 7th c.", col: 0, h: 240, color: "#c9a84c", score: 65,
    note: "Mixed — inner devotion + legal framework coexist from the start" },

  // Col 1 — Classical
  { id: "sufiEarly", label: "Early Sufism", sub: "Rabia, Hallaj, Junayd · 8th–10th c.", col: 1, h: 75, color: "#3ac5b5", score: 85, glow: true,
    note: "Rabia: 'If I worship You for Your own sake…' — sunder warumbe in Arabic" },
  { id: "shia", label: "Shia Islam", sub: "Esoteric, batin/zahir · 7th c. →", col: 1, h: 80, color: "#7a6aad", score: 65,
    note: "Hidden Imam, inner/outer meaning — preserves esoteric dimension" },
  { id: "ashari", label: "Ash'ari Theology", sub: "Mainstream Sunni orthodox", col: 1, h: 100, color: "#b8924a", score: 45,
    note: "Occasionalism — God directly causes every event; voluntarist seeds" },
  { id: "mutazila", label: "Mu'tazila", sub: "Rationalist theology · 8th–10th c.", col: 1, h: 55, color: "#9a8a6a", score: 40,
    note: "Rational but not mystical — God understood through reason, not union" },

  // Col 2 — Medieval Fork
  { id: "ibnArabi", label: "Ibn Arabi", sub: "Wahdat al-Wujud · 1165–1240", col: 2, h: 65, color: "#2ee8d0", score: 95, glow: true,
    note: "Unity of Being — 'the soul's ground and God's ground are one ground'" },
  { id: "rumi", label: "Rumi / Persian Sufism", sub: "Fana, divine love · 13th c.", col: 2, h: 55, color: "#3ac5b5", score: 92, glow: true,
    note: "Annihilation of self in God — love dissolves the lover/Beloved divide" },
  { id: "ghazali", label: "Al-Ghazali", sub: "Ihya Ulum al-Din · 1058–1111", col: 2, h: 80, color: "#8aaa6a", score: 58,
    note: "Attacked philosophy, embraced Sufism — Islam's bridge figure" },
  { id: "ibnTaymiyyah", label: "Ibn Taymiyyah", sub: "Literalist revolt · 1263–1328", col: 2, h: 100, color: "#d48a4e", score: 12,
    note: "THE FORK — attacked Ibn Arabi, insisted on literal Quran, God as sovereign will" },

  // Col 3 — Pre-Modern
  { id: "sufiOrders", label: "Sufi Orders", sub: "Naqshbandi, Qadiri, Chishti", col: 3, h: 50, color: "#3ac5b5", score: 80, glow: true,
    note: "Institutionalized mysticism — dhikr, murshid-murid, tariqa paths" },
  { id: "mullaSadra", label: "Mulla Sadra", sub: "Transcendent Theosophy · 17th c.", col: 3, h: 45, color: "#8B72BE", score: 85, glow: true,
    note: "Shia mystical philosophy — being as self-intensifying act, not static" },
  { id: "ottoman", label: "Ottoman Islam", sub: "Empire theology · 14th–20th c.", col: 3, h: 75, color: "#b8924a", score: 48,
    note: "Held both — patronized Sufi orders AND enforced Hanafi legal orthodoxy" },
  { id: "wahhabi", label: "Wahhabism", sub: "Ibn Abd al-Wahhab · 1744 →", col: 3, h: 60, color: "#cc5544", score: 8,
    note: "Islam's Reformation — smashed Sufi shrines, pure text, obedience" },

  // Col 4 — Modern
  { id: "modernSufi", label: "Living Sufi Tradition", sub: "Orders, teachers, diaspora", col: 4, h: 35, color: "#3ac5b5", score: 82, glow: true,
    note: "Thin but alive — Sufi orders survive in Turkey, Senegal, South Asia, diaspora" },
  { id: "irfan", label: "Iranian Irfan", sub: "Khomeini, Tabatabai · Shia mysticism", col: 4, h: 40, color: "#7a6aad", score: 75,
    note: "Mystical philosophy survived in Shia seminaries — genuine contemplative strand" },
  { id: "deobandi", label: "Deobandi", sub: "South Asian revivalism · ~100M", col: 4, h: 60, color: "#cc6644", score: 15,
    note: "Strict legal orthodoxy, anti-Sufi, puritanical — Islam's fundamentalism" },
  { id: "salafi", label: "Salafism", sub: "Return to ancestors · ~50M", col: 4, h: 65, color: "#e06050", score: 5,
    note: "Strip all innovation — legal literalism, radical anti-mysticism" },
  { id: "brotherhood", label: "Muslim Brotherhood", sub: "Political Islam · Qutb, Banna", col: 4, h: 60, color: "#993a3a", score: 3,
    note: "Hakimiyyah = Seven Mountains — God's sovereignty as political program" },

  // Col 5 — Contemporary (spaced with yOverride)
  { id: "tradIslam", label: "Traditional Mainstream", sub: "Practicing Sunni/Shia · ~1.2B", col: 5, h: 55, color: "#b8924a", score: 40,
    yOverride: 395, note: "Legal-devotional mix — prayer, fasting, hajj; rarely contemplative" },
  { id: "saudiWahhabi", label: "Saudi Wahhabism", sub: "State-sponsored · petrodollars", col: 5, h: 50, color: "#cc5544", score: 6,
    yOverride: 560, note: "Exported literalism globally via oil wealth — Islam's prosperity gospel" },
  { id: "politicalIslam", label: "Political Islamism", sub: "Erdogan, AKP, MB offshoots · ~80M", col: 5, h: 50, color: "#aa5a4a", score: 4,
    yOverride: 630, note: "Faith as political identity and civilizational program" },
  { id: "jihadism", label: "Apocalyptic Jihadism", sub: "ISIS, al-Qaeda · Dabiq prophecy", col: 5, h: 45, color: "#e84450", score: 1,
    yOverride: 700, note: "Obsessive end-times timeline + dominionism + spiritual warfare fused" },
  { id: "contemplatIslam", label: "Contemporary Sufism / Irfan", sub: "Orders, Irfan, perennialism · ~30M", col: 5, h: 40, color: "#3ac5b5", score: 80, glow: true,
    yOverride: 185, note: "Thin stream — Sufi orders, Iranian Irfan, Traditionalist school" },
];

const nodes = nodesRaw.map(n => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY(n.score) - n.h / 2,
}));
const nodeMap = {};
nodes.forEach(n => { nodeMap[n.id] = n; });

const links = [
  // From Early Islam
  { from: "earlyIslam", to: "sufiEarly", value: 12, stream: "sufiEarly" },
  { from: "earlyIslam", to: "shia", value: 18, stream: "shia" },
  { from: "earlyIslam", to: "ashari", value: 40, stream: "ashari" },
  { from: "earlyIslam", to: "mutazila", value: 10, stream: "mutazila" },

  // Classical → Medieval
  { from: "sufiEarly", to: "ibnArabi", value: 8, stream: "ibnArabi" },
  { from: "sufiEarly", to: "rumi", value: 6, stream: "sufi" },
  { from: "sufiEarly", to: "ghazali", value: 3, stream: "sufi" },
  { from: "shia", to: "ghazali", value: 3, stream: "shia" },
  { from: "shia", to: "mullaSadra", value: 10, stream: "mullaSadra" },
  { from: "ashari", to: "ghazali", value: 18, stream: "ghazali" },
  { from: "ashari", to: "ibnTaymiyyah", value: 22, stream: "ibnTaymiyyah" },
  { from: "mutazila", to: "ghazali", value: 5, stream: "mutazila" },

  // Medieval → Pre-Modern
  { from: "ibnArabi", to: "sufiOrders", value: 7, stream: "sufi" },
  { from: "rumi", to: "sufiOrders", value: 5, stream: "sufi" },
  { from: "ghazali", to: "sufiOrders", value: 5, stream: "sufi" },
  { from: "ghazali", to: "ottoman", value: 14, stream: "ottoman" },
  { from: "ibnTaymiyyah", to: "wahhabi", value: 18, stream: "wahhabi" },
  { from: "ibnTaymiyyah", to: "ottoman", value: 4, stream: "ibnTaymiyyah" },
  { from: "ibnArabi", to: "mullaSadra", value: 3, stream: "ibnArabi" },

  // Pre-Modern → Modern
  { from: "sufiOrders", to: "modernSufi", value: 8, stream: "sufi" },
  { from: "sufiOrders", to: "irfan", value: 3, stream: "sufi" },
  { from: "mullaSadra", to: "irfan", value: 8, stream: "irfan" },
  { from: "ottoman", to: "deobandi", value: 5, stream: "deobandi" },
  { from: "ottoman", to: "brotherhood", value: 4, stream: "brotherhood" },
  { from: "wahhabi", to: "salafi", value: 12, stream: "salafi" },
  { from: "wahhabi", to: "deobandi", value: 5, stream: "wahhabi" },
  { from: "wahhabi", to: "brotherhood", value: 4, stream: "brotherhood" },

  // Modern → Contemporary
  { from: "modernSufi", to: "contemplatIslam", value: 6, stream: "sufi" },
  { from: "irfan", to: "contemplatIslam", value: 5, stream: "irfan" },
  { from: "salafi", to: "saudiWahhabi", value: 6, stream: "salafi" },
  { from: "salafi", to: "jihadism", value: 5, stream: "jihadism" },
  { from: "brotherhood", to: "politicalIslam", value: 6, stream: "political" },
  { from: "brotherhood", to: "jihadism", value: 3, stream: "jihadism" },
  { from: "deobandi", to: "tradIslam", value: 4, stream: "mainstream" },
  { from: "deobandi", to: "jihadism", value: 3, stream: "jihadism" },
  { from: "salafi", to: "politicalIslam", value: 3, stream: "political" },
  { from: "modernSufi", to: "tradIslam", value: 3, stream: "mainstream" },
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
          <rect x={x + (isRight ? -10 : -340)} y={node.y - 38}
            width={340} height={30} rx={4}
            fill="#1a1a18ee" stroke={scoreToColor(node.score)} strokeWidth={0.7} />
          <text x={x + (isRight ? -10 : -340) + 8} y={node.y - 18}
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
  const x = COL_X[5] + NODE_W + 185;
  const y1 = 555;
  const y2 = 750;
  const mid = (y1 + y2) / 2;
  return (
    <g opacity={0.3}>
      <path d={`M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`}
        fill="none" stroke="#e84450" strokeWidth={0.8} />
      <path d={`M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`}
        fill="none" stroke="#e84450" strokeWidth={0.8} />
      <text x={x + 28} y={mid - 6} fill="#e84450" fontSize="9.5"
        fontFamily="'JetBrains Mono', monospace" fontWeight="600" letterSpacing="0.06em">
        ALL SCORE ≤ 6
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
  { x: COL_X[1] + 7, label: "CLASSICAL" },
  { x: COL_X[2] + 7, label: "MEDIEVAL FORK" },
  { x: COL_X[3] + 7, label: "PRE-MODERN" },
  { x: COL_X[4] + 7, label: "MODERN" },
  { x: COL_X[5] + 7, label: "CONTEMPORARY" },
];

export default function IslamicSankey() {
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
        The Parallel Inversion: Islam
      </h1>
      <p style={{ color: COLORS.textDim, fontSize: "16px", fontWeight: 300,
        fontStyle: "italic", marginBottom: "12px", textAlign: "center", maxWidth: 700, lineHeight: 1.5 }}>
        From Ibn Arabi's <em>Wahdat al-Wujud</em> to apocalyptic jihadism — the same metaphysical fork,
        the same cascade into instrumentalized religion. Scored against the mystical pole.
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
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>MYSTICAL</text>
          {["fana / union", "wahdat al-wujud", "interiority", "love beyond reason"].map((w, i) => (
            <text key={w} x={25} y={TOP_Y + 24 + i * 10} fill="#3ac5b5" fontSize="9"
              fontFamily="'Crimson Pro', serif" fontStyle="italic"
              textAnchor="middle" opacity={0.45}>{w}</text>
          ))}
          <text x={25} y={BOT_Y - 40} fill="#e84450" fontSize="10"
            fontFamily="'JetBrains Mono', monospace" fontWeight="600"
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>INVERTED</text>
          {["exteriority", "literalism", "political conquest", "apocalyptic violence"].map((w, i) => (
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
        maxWidth: 750, marginTop: "8px", padding: "14px 20px",
        background: "rgba(255,255,255,0.025)", borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.05)",
      }}>
        <p style={{ color: COLORS.textDim, fontSize: "14px", lineHeight: 1.7,
          margin: 0, fontFamily: "'Crimson Pro', serif", fontWeight: 300 }}>
          <strong style={{ color: COLORS.text, fontWeight: 600 }}>The parallel structure:</strong>{" "}
          <span style={{ color: "#2ee8d0" }}>Ibn Arabi</span> (1165–1240) and{" "}
          <span style={{ color: "#d48a4e" }}>Ibn Taymiyyah</span> (1263–1328) are almost exact
          contemporaries of Eckhart and Ockham — and play identical roles. The fork from participatory
          metaphysics (wahdat al-wujud) to divine voluntarism produces the same cascade: literalism →
          puritanical reform → political instrumentalization → apocalyptic violence.{" "}
          <span style={{ color: "#8aaa6a" }}>Al-Ghazali</span> at 58 plays a role analogous to
          Catholicism — holding both streams. <span style={{ color: "#7a6aad" }}>Shia Islam</span> preserved
          more mystical DNA through Irfan, paralleling Eastern Orthodoxy's preservation of theosis.
          The thin <span style={{ color: "#3ac5b5" }}>teal stream</span> survives in Sufi orders,
          Iranian seminaries, and diaspora communities — but is vastly outnumbered.
        </p>
      </div>
    </div>
  );
}
