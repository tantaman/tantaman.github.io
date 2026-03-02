// @ts-ignore
import React from 'https://esm.sh/react';
// @ts-ignore
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
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

// Left panel: aggregate negative correlation (income vs fertility)
const aggregateData = [
  { income: '$20k', tfr: 2.5 },
  { income: '$40k', tfr: 2.1 },
  { income: '$60k', tfr: 1.8 },
  { income: '$80k', tfr: 1.65 },
  { income: '$100k', tfr: 1.6 },
  { income: '$120k', tfr: 1.55 },
  { income: '$150k+', tfr: 1.55 },
];

// Right panel: within-strata positive correlation (income vs fertility by education)
const strataData = [
  { income: 'Low', noHS: 2.2, hs: 1.9, bachelors: 1.5, graduate: 1.3 },
  { income: 'Mid-low', noHS: 2.4, hs: 2.0, bachelors: 1.6, graduate: 1.4 },
  { income: 'Middle', noHS: 2.5, hs: 2.1, bachelors: 1.7, graduate: 1.55 },
  { income: 'Mid-high', noHS: 2.6, hs: 2.2, bachelors: 1.85, graduate: 1.7 },
  { income: 'High', noHS: 2.7, hs: 2.3, bachelors: 2.0, graduate: 1.9 },
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
      <div style={{ color: T.text, fontWeight: 600, marginBottom: 4 }}>
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
    gap: 14,
    flexWrap: 'wrap',
    marginTop: 4,
  }}>
    {payload.map((entry) => (
      <div key={entry.value} style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 10,
        fontFamily: T.mono,
        color: entry.color,
      }}>
        <div style={{
          width: 14,
          height: 3,
          borderRadius: 2,
          background: entry.color,
        }} />
        {entry.value}
      </div>
    ))}
  </div>
);

function PanelLabel({ children }) {
  return (
    <div style={{
      textAlign: 'center',
      fontFamily: T.mono,
      fontSize: 10,
      color: T.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: 8,
      fontWeight: 600,
    }}>
      {children}
    </div>
  );
}

export default function IncomeFertilityParadox() {
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
          The Income–Fertility Paradox
        </div>
        <div style={{
          fontSize: 13,
          color: T.textMuted,
          fontStyle: 'italic',
          marginTop: 4,
        }}>
          Aggregate negative correlation masks within-strata positive correlation
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0,
      }}>
        {/* Left panel: aggregate */}
        <div style={{
          flex: '1 1 320px',
          minWidth: 280,
          padding: '16px 8px 8px',
          borderRight: `1px solid ${T.border}`,
        }}>
          <PanelLabel>Aggregate: Income vs Fertility</PanelLabel>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={aggregateData} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis
                dataKey="income"
                tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }}
                axisLine={{ stroke: T.border }}
                tickLine={{ stroke: T.border }}
              />
              <YAxis
                domain={[1.2, 2.8]}
                tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }}
                axisLine={{ stroke: T.border }}
                tickLine={{ stroke: T.border }}
                tickFormatter={(v) => v.toFixed(1)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="tfr"
                name="TFR"
                stroke={T.red}
                strokeWidth={2.5}
                dot={{ r: 4, fill: T.surface, stroke: T.red, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: T.red }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div style={{
            textAlign: 'center',
            fontSize: 11,
            color: T.red,
            fontFamily: T.mono,
            fontStyle: 'italic',
            opacity: 0.8,
            marginTop: 2,
          }}>
            Higher income → fewer children
          </div>
        </div>

        {/* Right panel: within strata */}
        <div style={{
          flex: '1 1 320px',
          minWidth: 280,
          padding: '16px 8px 8px',
        }}>
          <PanelLabel>Within Education Strata</PanelLabel>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={strataData} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis
                dataKey="income"
                tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }}
                axisLine={{ stroke: T.border }}
                tickLine={{ stroke: T.border }}
              />
              <YAxis
                domain={[1.2, 2.8]}
                tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }}
                axisLine={{ stroke: T.border }}
                tickLine={{ stroke: T.border }}
                tickFormatter={(v) => v.toFixed(1)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              <Line
                type="monotone"
                dataKey="noHS"
                name="No HS diploma"
                stroke={T.teal}
                strokeWidth={2}
                dot={{ r: 3, fill: T.surface, stroke: T.teal, strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="hs"
                name="HS diploma"
                stroke={T.gold}
                strokeWidth={2}
                dot={{ r: 3, fill: T.surface, stroke: T.gold, strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="bachelors"
                name="Bachelor's"
                stroke={T.blue}
                strokeWidth={2}
                dot={{ r: 3, fill: T.surface, stroke: T.blue, strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="graduate"
                name="Graduate"
                stroke={T.purple}
                strokeWidth={2}
                dot={{ r: 3, fill: T.surface, stroke: T.purple, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div style={{
            textAlign: 'center',
            fontSize: 11,
            color: T.green,
            fontFamily: T.mono,
            fontStyle: 'italic',
            opacity: 0.8,
            marginTop: 2,
          }}>
            Within each stratum: higher income → more children
          </div>
        </div>
      </div>

      <div style={{
        padding: '10px 18px',
        borderTop: `1px solid ${T.border}`,
        fontSize: 11,
        color: T.textDim,
        fontStyle: 'italic',
        lineHeight: 1.5,
      }}>
        Illustrative data based on Strulik, "Higher Education and the Income-Fertility Nexus," Journal of Population Economics (2024)
      </div>
    </div>
  );
}
