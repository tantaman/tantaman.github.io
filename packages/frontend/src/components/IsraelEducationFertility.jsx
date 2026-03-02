// @ts-ignore
import React from 'https://esm.sh/react';
// @ts-ignore
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'https://esm.sh/recharts';

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

// Completed fertility (children ever born by ~age 40) by education level
// Israel data pattern based on Taub Center findings (Weinreb, Chernichovsky & Brill):
//   college-educated Israeli women have same completed fertility as high-school-educated
// OECD average reflects the standard negative education-fertility gradient
const data = [
  { edu: 'Secondary', israel: 2.5, oecd: 2.0 },
  { edu: 'Post-secondary', israel: 2.5, oecd: 1.8 },
  { edu: "Bachelor's", israel: 2.5, oecd: 1.6 },
  { edu: 'Graduate', israel: 2.4, oecd: 1.5 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
      fontFamily: T.mono,
    }}>
      <div style={{ color: T.text, fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {p.value.toFixed(2)}
        </div>
      ))}
    </div>
  );
};

const CustomLegend = ({ payload }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    gap: 20,
    flexWrap: 'wrap',
    marginTop: 4,
  }}>
    {payload.map((entry) => (
      <div key={entry.value} style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontFamily: T.mono,
        color: entry.color,
      }}>
        <div style={{
          width: 16,
          height: 3,
          borderRadius: 2,
          background: entry.color,
        }} />
        {entry.value}
      </div>
    ))}
  </div>
);

export default function IsraelEducationFertility() {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      overflow: 'hidden',
      margin: '32px 0',
      fontFamily: T.serif,
    }}>
      <div style={{
        padding: '16px 18px 12px',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{
          fontFamily: T.mono,
          fontSize: 10,
          color: T.gold,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontWeight: 700,
          marginBottom: 4,
        }}>
          Data
        </div>
        <div style={{
          fontSize: 17,
          fontWeight: 600,
          color: T.text,
        }}>
          Education vs. Completed Fertility: Israel and OECD
        </div>
        <div style={{
          fontSize: 13,
          color: T.textMuted,
          fontStyle: 'italic',
          marginTop: 4,
        }}>
          In every other OECD country, fertility declines with education. In Israel, the line is flat.
        </div>
      </div>

      <div style={{ padding: '16px 8px 8px' }}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis
              dataKey="edu"
              tick={{ fill: T.textDim, fontSize: 11, fontFamily: T.mono }}
              axisLine={{ stroke: T.border }}
              tickLine={{ stroke: T.border }}
            />
            <YAxis
              domain={[1.2, 2.8]}
              tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }}
              axisLine={{ stroke: T.border }}
              tickLine={{ stroke: T.border }}
              tickFormatter={(v) => v.toFixed(1)}
              label={{
                value: 'Children per woman',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                fill: T.textMuted,
                fontSize: 11,
                fontFamily: T.mono,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <ReferenceLine
              y={2.1}
              stroke={T.red}
              strokeDasharray="6 4"
              strokeOpacity={0.5}
              label={{
                value: 'Replacement (2.1)',
                position: 'right',
                fill: T.red,
                fontSize: 10,
                fontFamily: T.mono,
              }}
            />
            <Line
              type="monotone"
              dataKey="israel"
              name="Israel (Jewish women)"
              stroke={T.teal}
              strokeWidth={2.5}
              dot={{ r: 4, fill: T.surface, stroke: T.teal, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: T.teal }}
            />
            <Line
              type="monotone"
              dataKey="oecd"
              name="OECD average"
              stroke={T.purple}
              strokeWidth={2.5}
              dot={{ r: 4, fill: T.surface, stroke: T.purple, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: T.purple }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        padding: '10px 18px',
        borderTop: `1px solid ${T.border}`,
        fontSize: 11,
        color: T.textDim,
        fontStyle: 'italic',
        lineHeight: 1.5,
      }}>
        Illustrative data based on Taub Center for Social Policy Studies (Weinreb, Chernichovsky & Brill); OECD Family Database
      </div>
    </div>
  );
}
