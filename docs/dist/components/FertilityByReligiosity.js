// @ts-ignore
import React from 'https://esm.sh/react';
// @ts-ignore
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, } from 'https://esm.sh/recharts';
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
    purple: '#b088d4',
    teal: '#3ac5b5',
    mono: "'JetBrains Mono', 'SF Mono', monospace",
    serif: "'Crimson Pro', Georgia, serif",
};
// Illustrative data based on NSFG (1982–2019) and IFS compilations
const data = [
    { year: 1982, weekly: 2.8, occasional: 2.3, nonreligious: 1.9 },
    { year: 1987, weekly: 2.75, occasional: 2.15, nonreligious: 1.8 },
    { year: 1992, weekly: 2.7, occasional: 2.05, nonreligious: 1.7 },
    { year: 1997, weekly: 2.65, occasional: 1.95, nonreligious: 1.65 },
    { year: 2002, weekly: 2.7, occasional: 1.9, nonreligious: 1.6 },
    { year: 2007, weekly: 2.7, occasional: 1.85, nonreligious: 1.55 },
    { year: 2012, weekly: 2.75, occasional: 1.7, nonreligious: 1.4 },
    { year: 2017, weekly: 2.8, occasional: 1.6, nonreligious: 1.3 },
    { year: 2022, weekly: 2.85, occasional: 1.55, nonreligious: 1.2 },
];
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !(payload === null || payload === void 0 ? void 0 : payload.length))
        return null;
    return (React.createElement("div", { style: {
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            fontFamily: T.mono,
        } },
        React.createElement("div", { style: { color: T.text, fontWeight: 600, marginBottom: 6 } }, label),
        payload.map((p) => (React.createElement("div", { key: p.dataKey, style: { color: p.color, marginBottom: 2 } },
            p.name,
            ": ",
            p.value.toFixed(2))))));
};
const CustomLegend = ({ payload }) => (React.createElement("div", { style: {
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        flexWrap: 'wrap',
        marginTop: 4,
    } }, payload.map((entry) => (React.createElement("div", { key: entry.value, style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontFamily: T.mono,
        color: entry.color,
    } },
    React.createElement("div", { style: {
            width: 16,
            height: 3,
            borderRadius: 2,
            background: entry.color,
        } }),
    entry.value)))));
export default function FertilityByReligiosity() {
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
                } }, "US Fertility by Religiosity, 1982\u20132022"),
            React.createElement("div", { style: {
                    fontSize: 13,
                    color: T.textMuted,
                    fontStyle: 'italic',
                    marginTop: 4,
                } }, "The gap between religious and nonreligious fertility has widened dramatically since 2007")),
        React.createElement("div", { style: { padding: '16px 8px 8px' } },
            React.createElement(ResponsiveContainer, { width: "100%", height: 320 },
                React.createElement(LineChart, { data: data, margin: { left: 10, right: 20, top: 10, bottom: 5 } },
                    React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: T.border }),
                    React.createElement(XAxis, { dataKey: "year", tick: { fill: T.textDim, fontSize: 11, fontFamily: T.mono }, axisLine: { stroke: T.border }, tickLine: { stroke: T.border } }),
                    React.createElement(YAxis, { domain: [1.0, 3.2], tick: { fill: T.textDim, fontSize: 10, fontFamily: T.mono }, axisLine: { stroke: T.border }, tickLine: { stroke: T.border }, tickFormatter: (v) => v.toFixed(1), label: {
                            value: 'TFR',
                            angle: -90,
                            position: 'insideLeft',
                            offset: 10,
                            fill: T.textMuted,
                            fontSize: 11,
                            fontFamily: T.mono,
                        } }),
                    React.createElement(Tooltip, { content: React.createElement(CustomTooltip, null) }),
                    React.createElement(Legend, { content: React.createElement(CustomLegend, null) }),
                    React.createElement(ReferenceLine, { y: 2.1, stroke: T.red, strokeDasharray: "6 4", strokeOpacity: 0.5, label: {
                            value: 'Replacement (2.1)',
                            position: 'right',
                            fill: T.red,
                            fontSize: 10,
                            fontFamily: T.mono,
                        } }),
                    React.createElement(ReferenceLine, { x: 2007, stroke: T.textDim, strokeDasharray: "4 4", strokeOpacity: 0.5, label: {
                            value: 'Gap widens',
                            position: 'top',
                            fill: T.textMuted,
                            fontSize: 10,
                            fontFamily: T.mono,
                            fontStyle: 'italic',
                        } }),
                    React.createElement(Line, { type: "monotone", dataKey: "weekly", name: "Weekly attenders", stroke: T.teal, strokeWidth: 2.5, dot: { r: 3.5, fill: T.surface, stroke: T.teal, strokeWidth: 2 }, activeDot: { r: 5, fill: T.teal } }),
                    React.createElement(Line, { type: "monotone", dataKey: "occasional", name: "Occasional attenders", stroke: T.gold, strokeWidth: 2.5, dot: { r: 3.5, fill: T.surface, stroke: T.gold, strokeWidth: 2 }, activeDot: { r: 5, fill: T.gold } }),
                    React.createElement(Line, { type: "monotone", dataKey: "nonreligious", name: "Nonreligious", stroke: T.purple, strokeWidth: 2.5, dot: { r: 3.5, fill: T.surface, stroke: T.purple, strokeWidth: 2 }, activeDot: { r: 5, fill: T.purple } })))),
        React.createElement("div", { style: {
                padding: '10px 18px',
                borderTop: `1px solid ${T.border}`,
                fontSize: 11,
                color: T.textDim,
                fontStyle: 'italic',
                lineHeight: 1.5,
            } }, "Illustrative data based on National Survey of Family Growth (1982\u20132019); Demographic Intelligence Family Survey (2020\u20132022), compiled by IFS")));
}
