import { useState, useMemo } from "react";

const COLORS = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848",
};

const STREAM_COLORS = {
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
  development: { start: "#aa5a4a", end: "#9a4a3a" },
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
  { id: "ancient", label: "Ancient Oikonomia", sub: "Aristotle, Xenophon · household / polis", col: 0, h: 240, color: "#c9a84c", score: 80,
    note: "Economy as stewardship of the household for the good life — embedded in ethics" },

  // Col 1 — Medieval / Early Modern
  { id: "scholastic", label: "Scholastic Economics", sub: "Aquinas, Oresme · just price, usury ban", col: 1, h: 75, color: "#8B72BE", score: 65,
    note: "Economic activity subordinated to moral law — the price should be just, not merely market" },
  { id: "islamicEcon", label: "Islamic Economics", sub: "Ibn Khaldun, riba prohibition", col: 1, h: 60, color: "#7a6aad", score: 60,
    note: "Asabiyyah (social cohesion) as economic foundation — wealth serves community bonds" },
  { id: "commons", label: "Commons / Guilds", sub: "Shared land, craft mastery · medieval", col: 1, h: 65, color: "#3ac5b5", score: 72, glow: true,
    note: "Economic life embedded in community — production as participation, not extraction" },
  { id: "mercantile", label: "Mercantilism", sub: "State wealth accumulation · 16th c.", col: 1, h: 70, color: "#d48a4e", score: 20,
    note: "THE FORK — economy redefined as national power; wealth as zero-sum conquest" },

  // Col 2 — Classical
  { id: "smith", label: "Adam Smith", sub: "Wealth of Nations · 1776", col: 2, h: 70, color: "#8aaa6a", score: 55,
    note: "Genuinely both — moral philosopher first; invisible hand within moral sentiments" },
  { id: "physiocrat", label: "Physiocrats", sub: "Quesnay · land as true wealth · 1750s", col: 2, h: 45, color: "#7a9aaa", score: 50,
    note: "Nature as source of value — still participatory, but beginning to model & abstract" },
  { id: "ricardo", label: "Ricardo / Classical", sub: "Comparative advantage, iron law of wages", col: 2, h: 70, color: "#b8924a", score: 30,
    note: "Ethics recedes — laws of economics as impersonal mechanism, like Newtonian physics" },
  { id: "marx", label: "Marx", sub: "Capital · 1867", col: 2, h: 65, color: "#cc6644", score: 35,
    note: "Diagnosed alienation (loss of participation) but prescribed another instrumentalism" },

  // Col 3 — Late 19th–Mid 20th
  { id: "marginalist", label: "Marginalist Revolution", sub: "Jevons, Menger, Walras · 1870s", col: 3, h: 60, color: "#cc5544", score: 12,
    note: "Value = subjective utility; economics becomes calculus; the human becomes a function" },
  { id: "institutional", label: "Institutional Economics", sub: "Veblen, Commons, Polanyi", col: 3, h: 50, color: "#8aaa6a", score: 58,
    note: "Economy is embedded in society, not the other way around — recovered participation" },
  { id: "keynesian", label: "Keynesian", sub: "General Theory · 1936", col: 3, h: 55, color: "#b8924a", score: 40,
    note: "Government manages aggregate demand — technocratic but acknowledges human irrationality" },
  { id: "austrian", label: "Austrian School", sub: "Mises, Hayek · spontaneous order", col: 3, h: 50, color: "#b8924a", score: 38,
    note: "Distributed knowledge, anti-planning — genuinely anti-instrumentalist epistemology" },
  { id: "welfare", label: "Welfare State", sub: "Beveridge, New Deal, social democracy", col: 3, h: 50, color: "#8aaa6a", score: 45,
    note: "Economy serves human needs — partial recovery of oikonomia through redistribution" },

  // Col 4 — Late 20th Century
  { id: "chicago", label: "Chicago School", sub: "Friedman, Becker, Stigler", col: 4, h: 55, color: "#cc5544", score: 8,
    note: "Everything is a market — marriage, crime, children all modeled as utility optimization" },
  { id: "neoclassical", label: "Neoclassical Synthesis", sub: "DSGE models, rational expectations", col: 4, h: 55, color: "#e06050", score: 10,
    note: "Elegant math, fictional humans — representative agents maximizing in perfect markets" },
  { id: "ecological", label: "Ecological Economics", sub: "Daly, Georgescu-Roegen · steady-state", col: 4, h: 40, color: "#3ac5b5", score: 72, glow: true,
    note: "Economy as subsystem of biosphere — nature has intrinsic value, not just resource value" },
  { id: "behavioral", label: "Behavioral Economics", sub: "Kahneman, Thaler · nudge theory", col: 4, h: 40, color: "#8aaa6a", score: 30,
    note: "Humans aren't rational — but the fix is to manipulate their irrationality more cleverly" },
  { id: "financialization", label: "Financialization", sub: "Derivatives, securitization · 1980s →", col: 4, h: 55, color: "#e84450", score: 3,
    note: "Money making money — value abstracted from all human good; chrematistike triumphant" },
  { id: "commonsRevival", label: "Commons Revival", sub: "Ostrom · Nobel 2009", col: 4, h: 35, color: "#2ee8d0", score: 70, glow: true,
    note: "Communities CAN manage shared resources — neither state nor market needed" },

  // Col 5 — Contemporary (spaced)
  { id: "degrowth", label: "Degrowth / Doughnut", sub: "Raworth, Hickel, Latouche · ~2M", col: 5, h: 38, color: "#b8924a", score: 35,
    yOverride: 370, note: "Correct diagnosis, naive politics — vulnerable to capture by the power it critiques" },
  { id: "localFirst", label: "Local / Solidarity Economy", sub: "Cooperatives, CSAs, mutual aid", col: 5, h: 35, color: "#2ee8d0", score: 72, glow: true,
    yOverride: 190, note: "Economic life re-embedded in community — participation over extraction" },
  { id: "stakeholder", label: "Stakeholder Capitalism", sub: "Davos rhetoric, ESG, B-corps", col: 5, h: 40, color: "#b8924a", score: 20,
    yOverride: 400, note: "Acknowledges the problem, instrumentalizes the solution — greenwashing risk" },
  { id: "algoTrading", label: "Algorithmic Trading", sub: "HFT, quant funds · microsecond profits", col: 5, h: 50, color: "#e84450", score: 1,
    yOverride: 530, note: "Machines trading with machines — humans fully removed from economic activity" },
  { id: "platformCapital", label: "Platform Capitalism", sub: "Uber, Airbnb, gig economy", col: 5, h: 48, color: "#993a3a", score: 3,
    yOverride: 600, note: "Extract value from human activity without employing humans — digital enclosure" },
  { id: "cryptoDefi", label: "Crypto / DeFi", sub: "Trustless finance · speculation", col: 5, h: 45, color: "#dd3a4a", score: 4,
    yOverride: 668, note: "Decentralized but not re-embedded — speculation without community" },
  { id: "debtMachine", label: "Sovereign Debt / MMT-as-weapon", sub: "Infinite growth imperative", col: 5, h: 45, color: "#aa5a4a", score: 2,
    yOverride: 733, note: "Entire nations as debt-servicing entities — economy consumes the polity" },
];

const nodes = nodesRaw.map(n => ({
  ...n,
  y: n.yOverride != null ? n.yOverride : scoreToY(n.score) - n.h / 2,
}));
const nodeMap = {};
nodes.forEach(n => { nodeMap[n.id] = n; });

const links = [
  // Ancient → Medieval
  { from: "ancient", to: "scholastic", value: 15, stream: "scholastic" },
  { from: "ancient", to: "islamicEcon", value: 10, stream: "scholastic" },
  { from: "ancient", to: "commons", value: 15, stream: "commons" },
  { from: "ancient", to: "mercantile", value: 18, stream: "mercantile" },

  // Medieval → Classical
  { from: "scholastic", to: "smith", value: 6, stream: "smith" },
  { from: "scholastic", to: "physiocrat", value: 4, stream: "oikonomia" },
  { from: "scholastic", to: "marx", value: 3, stream: "scholastic" },
  { from: "islamicEcon", to: "smith", value: 3, stream: "smith" },
  { from: "commons", to: "smith", value: 3, stream: "commons" },
  { from: "commons", to: "marx", value: 5, stream: "commons" },
  { from: "mercantile", to: "ricardo", value: 10, stream: "classical" },
  { from: "mercantile", to: "smith", value: 6, stream: "mercantile" },

  // Classical → Late 19th
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

  // Late 19th → Late 20th
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

  // Late 20th → Contemporary
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
  { from: "financialization", to: "debtMachine", value: 4, stream: "finance" },
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
  const y2 = 783;
  const mid = (y1 + y2) / 2;
  return (
    <g opacity={0.3}>
      <path d={`M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`}
        fill="none" stroke="#e84450" strokeWidth={0.8} />
      <path d={`M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`}
        fill="none" stroke="#e84450" strokeWidth={0.8} />
      <text x={x + 28} y={mid - 6} fill="#e84450" fontSize="9.5"
        fontFamily="'JetBrains Mono', monospace" fontWeight="600" letterSpacing="0.06em">
        ALL SCORE ≤ 4
      </text>
      <text x={x + 28} y={mid + 6} fill={COLORS.textMuted} fontSize="9.5"
        fontFamily="'Crimson Pro', serif" fontStyle="italic">
        pure chrematistike
      </text>
    </g>
  );
}

const eraLabels = [
  { x: COL_X[0] + 7, label: "ANCIENT" },
  { x: COL_X[1] + 7, label: "MEDIEVAL" },
  { x: COL_X[2] + 7, label: "CLASSICAL" },
  { x: COL_X[3] + 7, label: "LATE 19TH C." },
  { x: COL_X[4] + 7, label: "LATE 20TH C." },
  { x: COL_X[5] + 7, label: "CONTEMPORARY" },
];

export default function EconomicsSankey() {
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
        The Triumph of Chrematistike
      </h1>
      <p style={{ color: COLORS.textDim, fontSize: "16px", fontWeight: 300,
        fontStyle: "italic", marginBottom: "12px", textAlign: "center", maxWidth: 700, lineHeight: 1.5 }}>
        Aristotle distinguished <em>oikonomia</em> (household management for flourishing) from{" "}
        <em>chrematistike</em> (money-making as its own end). Every node on this chart
        is a position in that ancient argument. Hover for diagnostic notes.
      </p>

      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { color: "#3ac5b5", label: "Embedded / participatory (70–100)" },
          { color: "#7aaa8a", label: "Moderate (50–69)" },
          { color: "#b8924a", label: "Mixed (35–49)" },
          { color: "#d48a4e", label: "Thinned (20–34)" },
          { color: "#cc6644", label: "Disembedded (10–19)" },
          { color: "#e84450", label: "Pure extraction (0–9)" },
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
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>OIKONOMIA</text>
          {["human flourishing", "embedded in community", "sufficiency", "common good"].map((w, i) => (
            <text key={w} x={25} y={TOP_Y + 24 + i * 10} fill="#3ac5b5" fontSize="9"
              fontFamily="'Crimson Pro', serif" fontStyle="italic"
              textAnchor="middle" opacity={0.45}>{w}</text>
          ))}
          <text x={25} y={BOT_Y - 40} fill="#e84450" fontSize="10"
            fontFamily="'JetBrains Mono', monospace" fontWeight="600"
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>CHREMATISTIKE</text>
          {["money for money's sake", "disembedded from life", "infinite accumulation", "humans as inputs"].map((w, i) => (
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
          <strong style={{ color: COLORS.text, fontWeight: 600 }}>Aristotle named it 2,400 years ago:</strong>{" "}
          <em>chrematistike</em> — money-making as its own end — is "unnatural" because it has no
          inherent limit. <em>Oikonomia</em> aims at sufficiency for the good life; chrematistike
          aims at infinite accumulation.{" "}
          <span style={{ color: "#8aaa6a" }}>Adam Smith</span> at 55 is the bridge — moral philosopher
          who also unleashed the market; <em>Theory of Moral Sentiments</em> and{" "}
          <em>Wealth of Nations</em> are the two halves of his Catholicism.{" "}
          The <span style={{ color: "#cc5544" }}>Marginalist Revolution</span> at 12 is the
          nominalist fork — value becomes subjective utility, economics becomes calculus,
          the human becomes a maximizing function.{" "}
          The <span style={{ color: "#b8924a" }}>Austrian School</span> at 38 preserves genuine
          anti-instrumentalist insight — distributed knowledge, anti-planning — but still
          treats the human as a maximizer.{" "}
          <span style={{ color: "#b8924a" }}>Degrowth</span> at 35 correctly diagnoses infinite growth
          on a finite planet but has no viable theory of transition and is vulnerable to
          capture by power.{" "}
          <span style={{ color: "#2ee8d0" }}>Ostrom</span> and the commons revival proved
          communities can manage shared resources without either state or market —
          the thin teal stream. <span style={{ color: "#e84450" }}>Algorithmic trading</span> at 1:
          machines trading with machines, humans fully removed. Aristotle's nightmare.
        </p>
      </div>
    </div>
  );
}
