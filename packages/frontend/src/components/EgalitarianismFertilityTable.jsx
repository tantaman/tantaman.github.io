// @ts-ignore
import React from 'https://esm.sh/react';

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

const data = [
  { community: 'Amish', egal: 'Low', tfr: '~6.0', trend: 'Stable', trendColor: T.green },
  { community: 'Haredi Jews', egal: 'Low', tfr: '~6.6', trend: 'Stable', trendColor: T.green },
  { community: 'Hutterites', egal: 'Low', tfr: '~4.0', trend: 'Slowly declining', trendColor: T.gold },
  { community: 'Active LDS', egal: 'Medium', tfr: '~2.6', trend: 'Declining', trendColor: T.gold },
  { community: 'Finnish Laestadians', egal: 'Medium', tfr: '~5.0', trend: 'Eroding', trendColor: T.red },
  { community: 'Nordic Lutherans', egal: 'High', tfr: '~1.8–2.0', trend: 'Below replacement', trendColor: T.red },
  { community: 'Sikhs worldwide', egal: 'High', tfr: '~1.6', trend: 'Below replacement', trendColor: T.red },
  { community: 'Secular baseline', egal: 'High', tfr: '~1.4–1.6', trend: 'Declining', trendColor: T.red },
];

const egalColors = {
  Low: T.teal,
  Medium: T.gold,
  High: T.purple,
};

export default function EgalitarianismFertilityTable() {
  const pill = (label) => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontFamily: T.mono,
    fontWeight: 600,
    letterSpacing: '0.04em',
    color: egalColors[label],
    background: `${egalColors[label]}18`,
    border: `1px solid ${egalColors[label]}30`,
  });

  const cellBase = {
    padding: '10px 14px',
    borderBottom: `1px solid ${T.border}`,
    textAlign: 'left',
    verticalAlign: 'middle',
    background: 'inherit',
  };

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
          The Egalitarianism–Fertility Gradient
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: 520,
        }}>
          <thead>
            <tr style={{ background: `${T.bg}` }}>
              {['Community', 'Gender Egalitarianism', 'TFR', 'Trend'].map((h) => (
                <th key={h} style={{
                  ...cellBase,
                  fontFamily: T.mono,
                  fontSize: 10,
                  color: T.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{
                background: i % 2 === 0 ? 'transparent' : `${T.bg}44`,
              }}>
                <td style={{
                  ...cellBase,
                  color: T.text,
                  fontWeight: 600,
                  fontSize: 14,
                }}>
                  {row.community}
                </td>
                <td style={cellBase}>
                  <span style={pill(row.egal)}>{row.egal}</span>
                </td>
                <td style={{
                  ...cellBase,
                  fontFamily: T.mono,
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.text,
                }}>
                  {row.tfr}
                </td>
                <td style={{
                  ...cellBase,
                  fontSize: 13,
                  color: row.trendColor,
                  fontStyle: 'italic',
                }}>
                  {row.trend}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        padding: '10px 18px',
        borderTop: `1px solid ${T.border}`,
        fontSize: 11,
        color: T.textDim,
        fontStyle: 'italic',
        lineHeight: 1.5,
      }}>
        Sources: Pew Research Center; Israeli CBS; Elizabethtown College Young Center; BYU Religious Studies Center; Yle Finland
      </div>
    </div>
  );
}
