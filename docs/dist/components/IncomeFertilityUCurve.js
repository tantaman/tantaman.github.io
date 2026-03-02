// @ts-ignore
import React from 'https://esm.sh/react';
// @ts-ignore
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, } from 'https://esm.sh/recharts';
const T = {
    bg: '#0e0c0a',
    surface: '#161412',
    border: '#2a2520',
    text: '#e8e4da',
    textMuted: '#9a9888',
    textDim: '#5a5848',
    gold: '#d4a556',
    red: '#e85d4a',
    green: '#5cb85c',
    blue: '#4a9de8',
    mono: "'JetBrains Mono', 'SF Mono', monospace",
    serif: "'Crimson Pro', Georgia, serif",
};
// Illustrative data based on Hazan & Zoabi (2015) and US Census/ACS patterns
const data = [
    { decile: '1st', label: 'Bottom 10%', tfr: 2.45 },
    { decile: '2nd', label: '10–20%', tfr: 2.25 },
    { decile: '3rd', label: '20–30%', tfr: 2.0 },
    { decile: '4th', label: '30–40%', tfr: 1.85 },
    { decile: '5th', label: '40–50%', tfr: 1.72 },
    { decile: '6th', label: '50–60%', tfr: 1.68 },
    { decile: '7th', label: '60–70%', tfr: 1.75 },
    { decile: '8th', label: '70–80%', tfr: 1.85 },
    { decile: '9th', label: '80–90%', tfr: 1.95 },
    { decile: '10th', label: 'Top 10%', tfr: 2.1 },
];
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !(payload === null || payload === void 0 ? void 0 : payload.length))
        return null;
    const d = payload[0].payload;
    return (React.createElement("div", { style: {
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            fontFamily: T.mono,
        } },
        React.createElement("div", { style: { color: T.text, fontWeight: 600, marginBottom: 4 } }, d.label),
        React.createElement("div", { style: { color: T.gold } },
            "TFR: ",
            d.tfr.toFixed(2))));
};
export default function IncomeFertilityUCurve() {
    return (React.createElement("div", { style: {
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            overflow: 'hidden',
            margin: '32px 0',
            fontFamily: T.serif,
        } },
        React.createElement("div", { style: {
                padding: '16px 18px 12px',
                borderBottom: `1px solid ${T.border}`,
            } },
            React.createElement("div", { style: {
                    fontFamily: T.mono,
                    fontSize: 10,
                    color: T.gold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    fontWeight: 700,
                    marginBottom: 4,
                } }, "Data"),
            React.createElement("div", { style: {
                    fontSize: 17,
                    fontWeight: 600,
                    color: T.text,
                } }, "Income\u2013Fertility U-Curve"),
            React.createElement("div", { style: {
                    fontSize: 13,
                    color: T.textMuted,
                    fontStyle: 'italic',
                    marginTop: 4,
                } }, "Fertility dips in the middle income brackets, partially recovering at the top")),
        React.createElement("div", { style: { padding: '16px 8px 8px' } },
            React.createElement(ResponsiveContainer, { width: "100%", height: 280 },
                React.createElement(AreaChart, { data: data, margin: { left: 10, right: 20, top: 10, bottom: 5 } },
                    React.createElement("defs", null,
                        React.createElement("linearGradient", { id: "uCurveFill", x1: "0", y1: "0", x2: "0", y2: "1" },
                            React.createElement("stop", { offset: "0%", stopColor: T.gold, stopOpacity: 0.3 }),
                            React.createElement("stop", { offset: "100%", stopColor: T.gold, stopOpacity: 0.05 }))),
                    React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: T.border }),
                    React.createElement(XAxis, { dataKey: "decile", tick: { fill: T.textDim, fontSize: 11, fontFamily: T.mono }, axisLine: { stroke: T.border }, tickLine: { stroke: T.border }, label: {
                            value: 'Income Decile',
                            position: 'insideBottom',
                            offset: -2,
                            fill: T.textMuted,
                            fontSize: 11,
                            fontFamily: T.mono,
                        } }),
                    React.createElement(YAxis, { domain: [1.4, 2.6], tick: { fill: T.textDim, fontSize: 10, fontFamily: T.mono }, axisLine: { stroke: T.border }, tickLine: { stroke: T.border }, tickFormatter: (v) => v.toFixed(1), label: {
                            value: 'TFR',
                            angle: -90,
                            position: 'insideLeft',
                            offset: 10,
                            fill: T.textMuted,
                            fontSize: 11,
                            fontFamily: T.mono,
                        } }),
                    React.createElement(Tooltip, { content: React.createElement(CustomTooltip, null) }),
                    React.createElement(ReferenceLine, { y: 2.1, stroke: T.red, strokeDasharray: "6 4", strokeOpacity: 0.6, label: {
                            value: 'Replacement (2.1)',
                            position: 'right',
                            fill: T.red,
                            fontSize: 10,
                            fontFamily: T.mono,
                        } }),
                    React.createElement(Area, { type: "monotone", dataKey: "tfr", stroke: T.gold, strokeWidth: 2.5, fill: "url(#uCurveFill)", dot: { r: 4, fill: T.surface, stroke: T.gold, strokeWidth: 2 }, activeDot: { r: 6, fill: T.gold, stroke: T.surface, strokeWidth: 2 } })))),
        React.createElement("div", { style: {
                padding: '10px 18px',
                borderTop: `1px solid ${T.border}`,
                fontSize: 11,
                color: T.textDim,
                fontStyle: 'italic',
                lineHeight: 1.5,
            } }, "Illustrative data based on Hazan & Zoabi (2015); US Census Bureau / American Community Survey")));
}
