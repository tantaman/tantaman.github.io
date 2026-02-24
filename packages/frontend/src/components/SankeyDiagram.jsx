// @ts-ignore
import React, { useState, useMemo } from 'https://esm.sh/react';

const COLORS = {
  bg: "#0f0f0e",
  text: "#e8e4da",
  textDim: "#9a9888",
  textMuted: "#5a5848",
};

const SCORE_COLORS = ["#3ac5b5", "#7aaa8a", "#b8924a", "#d48a4e", "#cc6644", "#e84450"];

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

function computeLinks(nodes, links, nodeMap) {
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
  return React.createElement('path', {
    d, fill: `url(#${gradientId})`,
    opacity: dimmed ? 0.03 : highlighted ? 0.6 : 0.3,
    style: { transition: "opacity 0.4s ease" },
  });
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

function NodeRect({ node, onHover, dimmed, isHovered, tooltipWidth, tooltipHeight }) {
  const x = COL_X[node.col];
  const isRight = node.col >= 4;
  const isLeft = node.col <= 1;
  const labelX = isRight ? x + NODE_W + 10 : (isLeft ? x + NODE_W + 10 : x - 8);
  const anchor = isRight ? "start" : (isLeft ? "start" : "end");
  const tw = tooltipWidth || 360;
  const th = tooltipHeight || 192;

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
        <foreignObject
          x={x + (isRight ? -10 : -tw)} y={node.y - th}
          width={tw} height={th}
          style={{ pointerEvents: "none", overflow: "visible" }}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            height: "100%", display: "flex", alignItems: "flex-end",
          }}>
            <div style={{
              background: "#1a1a18",
              border: `0.7px solid ${scoreToColor(node.score)}`,
              borderRadius: 4,
              padding: "6px 10px",
              color: "#9a9888",
              fontSize: 14,
              fontFamily: "'Crimson Pro', serif",
              fontStyle: "italic",
              lineHeight: 1.35,
            }}>
              {node.note}
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function InvertedBracketEl({ bracket }) {
  const x = COL_X[5] + NODE_W + (bracket.xOffset || 200);
  const y1 = bracket.y1;
  const y2 = bracket.y2;
  const mid = (y1 + y2) / 2;
  return (
    <g opacity={0.3}>
      <path d={`M ${x} ${y1} Q ${x + 14} ${y1}, ${x + 14} ${y1 + 14} L ${x + 14} ${mid - 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`}
        fill="none" stroke="#e84450" strokeWidth={0.8} />
      <path d={`M ${x} ${y2} Q ${x + 14} ${y2}, ${x + 14} ${y2 - 14} L ${x + 14} ${mid + 8} Q ${x + 14} ${mid}, ${x + 22} ${mid}`}
        fill="none" stroke="#e84450" strokeWidth={0.8} />
      <text x={x + 28} y={mid - 6} fill="#e84450" fontSize="9.5"
        fontFamily="'JetBrains Mono', monospace" fontWeight="600" letterSpacing="0.06em">
        {bracket.scoreLabel}
      </text>
      <text x={x + 28} y={mid + 6} fill={COLORS.textMuted} fontSize="9.5"
        fontFamily="'Crimson Pro', serif" fontStyle="italic">
        {bracket.description}
      </text>
    </g>
  );
}

export default function SankeyDiagram({ data }) {
  const { streamColors, nodes: nodesRaw, links, eraLabels, title, description,
    legendLabels, invertedBracket, yAxis, explanatoryNote,
    tooltipWidth, tooltipHeight } = data;

  const nodes = useMemo(() => nodesRaw.map(n => ({
    ...n,
    y: n.yOverride != null ? n.yOverride : scoreToY(n.score) - n.h / 2,
  })), [nodesRaw]);

  const nodeMap = useMemo(() => {
    const m = {};
    nodes.forEach(n => { m[n.id] = n; });
    return m;
  }, [nodes]);

  const [hovered, setHovered] = useState(null);
  const linkData = useMemo(() => computeLinks(nodes, links, nodeMap), [nodes, links, nodeMap]);

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

  const eraLabelData = eraLabels.map((label, i) => ({ x: COL_X[i] + 7, label }));

  return (
    <div style={{
      background: `radial-gradient(ellipse at 20% 15%, #1a1815 0%, ${COLORS.bg} 70%)`,
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
      padding: "24px 16px 20px", fontFamily: "'Crimson Pro', Georgia, serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400&family=JetBrains+Mono:wght@300;400;600&display=swap" rel="stylesheet" />

      <h1 style={{ color: COLORS.text, fontSize: "30px", fontWeight: 300,
        letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "2px", textAlign: "center" }}>
        {title}
      </h1>
      <p style={{ color: COLORS.textDim, fontSize: "16px", fontWeight: 300,
        fontStyle: "italic", marginBottom: "12px", textAlign: "center", maxWidth: 700, lineHeight: 1.5 }}>
        {description}
      </p>

      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", justifyContent: "center" }}>
        {legendLabels.map((label, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: 14, height: 5, borderRadius: 3,
              background: `linear-gradient(90deg, ${SCORE_COLORS[i]}cc, ${SCORE_COLORS[i]}55)` }} />
            <span style={{ color: COLORS.textDim }}>{label}</span>
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
            const sc = streamColors[link.stream] || { start: "#888", end: "#888" };
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
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>{yAxis.top.label}</text>
          {yAxis.top.subLabels.map((w, i) => (
            <text key={w} x={25} y={TOP_Y + 24 + i * 10} fill="#3ac5b5" fontSize="9"
              fontFamily="'Crimson Pro', serif" fontStyle="italic"
              textAnchor="middle" opacity={0.45}>{w}</text>
          ))}
          <text x={25} y={BOT_Y - 40} fill="#e84450" fontSize="10"
            fontFamily="'JetBrains Mono', monospace" fontWeight="600"
            textAnchor="middle" letterSpacing="0.05em" opacity={0.65}>{yAxis.bottom.label}</text>
          {yAxis.bottom.subLabels.map((w, i) => (
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

        {eraLabelData.map((era, i) => (
          <g key={i}>
            <line x1={COL_X[i]} y1={TOP_Y - 5} x2={COL_X[i]} y2={BOT_Y + 25}
              stroke={COLORS.textMuted} strokeWidth={0.3} strokeDasharray="2,8" opacity={0.2} />
            <text x={era.x} y={BOT_Y + 45} fill={COLORS.textMuted} fontSize="10"
              fontFamily="'JetBrains Mono', monospace" fontWeight="600" letterSpacing="0.08em">
              {era.label}</text>
          </g>
        ))}

        <InvertedBracketEl bracket={invertedBracket} />

        {linkData.map((link, i) => (
          <FlowBand key={i} link={link} gradientId={`fg-${i}`}
            dimmed={hovered ? !isLinkHL(link) : false} highlighted={isLinkHL(link)} />
        ))}

        {nodes.map(node => (
          <NodeRect key={node.id} node={node} onHover={setHovered}
            dimmed={hovered && !connectedIds.has(node.id)} isHovered={hovered === node.id}
            tooltipWidth={tooltipWidth} tooltipHeight={tooltipHeight} />
        ))}
      </svg>

      <div style={{
        maxWidth: 750, marginTop: "8px", padding: "14px 20px",
        background: "rgba(255,255,255,0.025)", borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.05)",
      }}>
        <p style={{ color: COLORS.textDim, fontSize: "14px", lineHeight: 1.7,
          margin: 0, fontFamily: "'Crimson Pro', serif", fontWeight: 300 }}>
          <strong style={{ color: COLORS.text, fontWeight: 600 }}>{explanatoryNote.heading}</strong>{" "}
          <span dangerouslySetInnerHTML={{ __html: explanatoryNote.text }} />
        </p>
      </div>
    </div>
  );
}
