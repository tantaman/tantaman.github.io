import { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  ReferenceLine,
} from 'recharts';

const DEFAULTS = {
  otherSpendGrowth: 3.0,
  numMillionaires: 34000,
  millionaireTaxRate: 3.876,
  corpTaxRate: 7.75,
  propertyTaxRate: 12.28,
  migrationSensitivity: 1.5,
  corpErosionSensitivity: 5.0,
  pensionGrowthRate: 5.5,
  benefitsGrowthRate: 8.0,
  salaryGrowthRate: 3.2,
  revenueGrowth: 2.8,
  yearsToProject: 10,
  includeNewSpending: false,
};

// Mamdani's new spending commitments ($ billions)
// Each item: { label, description, amounts: [yr1, yr2, yr3, yr4+], type: "comp"|"other"|"debt" }
const NEW_COMMITMENTS = [
  {
    label: 'Class size mandate',
    desc: '6,000 new teachers to meet state cap (20-25 per class). $543M yr1 → $943M/yr.',
    amounts: [0.54, 0.94, 0.94, 0.94],
    type: 'comp',
    source: 'Chalkbeat / NYC DOE',
  },
  {
    label: 'Universal childcare (6wk–5yr)',
    desc: 'Campaign est. ~$6B/yr at full scale. Phases in: 2-Care launch, expand 3K, then infants. State funds first 2 yrs partially.',
    amounts: [1.0, 2.5, 4.0, 6.0],
    type: 'comp',
    source: 'Mamdani campaign / CNN',
  },
  {
    label: 'Free buses',
    desc: '$700-800M/yr MTA revenue backfill. Not in preliminary budget — deferred to April.',
    amounts: [0, 0.8, 0.8, 0.8],
    type: 'other',
    source: 'Vital City / MTA',
  },
  {
    label: 'Affordable housing program',
    desc: '$100B total ($70B borrowed). Debt service on municipal bonds phases in.',
    amounts: [0.5, 1.5, 3.0, 4.5],
    type: 'debt',
    source: 'Mamdani campaign',
  },
  {
    label: 'Mental health department',
    desc: 'New standalone dept for crisis response. $1B at full scale.',
    amounts: [0.3, 0.7, 1.0, 1.0],
    type: 'comp',
    source: 'Mamdani campaign',
  },
  {
    label: 'Parks to 1% of budget',
    desc: 'Campaign pledge. Current: 0.57%. Gap: $536M–$767M.',
    amounts: [0.2, 0.4, 0.6, 0.7],
    type: 'other',
    source: 'THE CITY',
  },
  {
    label: 'Libraries to 0.5%',
    desc: 'Current: 0.39%. Mamdani endorsed target.',
    amounts: [0.05, 0.1, 0.14, 0.14],
    type: 'other',
    source: 'THE CITY',
  },
  {
    label: 'Misc (equity offices, food security, legal, immigrant services)',
    desc: 'Racial equity +42%, food baseline to $53.6M, 200 new attorneys, expanded immigrant legal aid.',
    amounts: [0.15, 0.25, 0.3, 0.3],
    type: 'other',
    source: 'NYC budget / NYIC',
  },
];

const BASELINE = {
  millionaireTaxRate: 3.876,
  corpTaxRate: 7.75,
  propertyTaxRate: 12.28,
};

const fmt = (n) => {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}T`;
  if (Math.abs(n) >= 1) return `$${n.toFixed(1)}B`;
  return `$${(n * 1000).toFixed(0)}M`;
};

const fmtK = (n) => n.toLocaleString();

const formatDescription = (desc) => {
  if (!desc) return null;
  // Color "Current:" in teal and "Mamdani:" in red-orange
  const parts = desc.split(/(Current:|Mamdani:)/g);
  return parts.map((part, i) => {
    if (part === 'Current:')
      return (
        <span
          key={i}
          style={{ color: '#5cb85c', fontWeight: 700, fontStyle: 'normal' }}
        >
          {part}
        </span>
      );
    if (part === 'Mamdani:')
      return (
        <span
          key={i}
          style={{ color: '#e85d4a', fontWeight: 700, fontStyle: 'normal' }}
        >
          {part}
        </span>
      );
    return <span key={i}>{part}</span>;
  });
};

const logToLinear = (value, min, max) => {
  // Map a log-scale value to linear 0-1000 slider position
  return Math.round((1000 * Math.log(value / min)) / Math.log(max / min));
};

const linearToLog = (position, min, max) => {
  // Map linear 0-1000 slider position to log-scale value
  return min * Math.pow(max / min, position / 1000);
};

const Knob = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  description,
  logScale,
  sources,
}) => {
  const [showSources, setShowSources] = useState(false);
  const sliderVal = logScale ? logToLinear(value, min, max) : undefined;
  const handleChange = logScale
    ? (e) => {
        const raw = linearToLog(parseFloat(e.target.value), min, max);
        const factor = 1 / step;
        onChange(Math.round(raw * factor) / factor);
      }
    : (e) => onChange(parseFloat(e.target.value));

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 3,
        }}
      >
        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#c4b5a0',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {label}
          {sources && (
            <span
              onClick={(e) => {
                e.preventDefault();
                setShowSources(!showSources);
              }}
              style={{
                cursor: 'pointer',
                fontSize: 10,
                color: showSources ? '#d4a556' : '#6b6157',
                fontWeight: 400,
                userSelect: 'none',
              }}
              title="Show sources"
            >
              ⓘ
            </span>
          )}
        </label>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#f0e6d3',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {typeof value === 'number' && value % 1 !== 0
            ? value.toFixed(2)
            : value.toLocaleString()}
          {unit}
        </span>
      </div>
      {description && (
        <div
          style={{
            fontSize: 10,
            color: '#8a7e6e',
            marginBottom: 4,
            fontStyle: 'italic',
          }}
        >
          {formatDescription(description)}
        </div>
      )}
      {showSources && sources && (
        <div
          style={{
            fontSize: 10,
            color: '#a89880',
            background: 'rgba(20,18,16,0.8)',
            border: '1px solid #3a342a',
            borderRadius: 4,
            padding: '6px 8px',
            marginBottom: 4,
            lineHeight: 1.6,
          }}
        >
          {sources.map((s, i) => (
            <div
              key={i}
              style={{ marginBottom: i < sources.length - 1 ? 4 : 0 }}
            >
              {s.text}
              {s.url && (
                <>
                  {' '}
                  —{' '}
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#d4a556', textDecoration: 'underline' }}
                  >
                    {s.linkLabel || 'source'}
                  </a>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <input
        type="range"
        min={logScale ? 0 : min}
        max={logScale ? 1000 : max}
        step={logScale ? 1 : step}
        value={logScale ? sliderVal : value}
        onChange={handleChange}
        style={{
          width: '100%',
          accentColor: '#d4a556',
          height: 3,
          cursor: 'pointer',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 9,
          color: '#6b6157',
        }}
      >
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, sub, color, labelColor }) => (
  <div
    style={{
      background: 'rgba(30,27,22,0.7)',
      border: '1px solid #3a342a',
      borderRadius: 6,
      padding: '10px 12px',
      minWidth: 140,
      flex: 1,
    }}
  >
    <div
      style={{
        fontSize: 10,
        color: labelColor || '#8a7e6e',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 4,
        fontWeight: labelColor ? 700 : 400,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 20,
        fontWeight: 700,
        color: color || '#f0e6d3',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: 10, color: '#6b6157', marginTop: 2 }}>{sub}</div>
    )}
  </div>
);

const SectionTitle = ({ children }) => (
  <h3
    style={{
      fontSize: 13,
      fontWeight: 700,
      color: '#d4a556',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      fontFamily: "'JetBrains Mono', monospace",
      marginBottom: 12,
      marginTop: 24,
      borderBottom: '1px solid #3a342a',
      paddingBottom: 8,
    }}
  >
    {children}
  </h3>
);

function simulate(params) {
  const {
    otherSpendGrowth,
    numMillionaires,
    millionaireTaxRate,
    corpTaxRate,
    propertyTaxRate,
    migrationSensitivity,
    corpErosionSensitivity,
    pensionGrowthRate,
    benefitsGrowthRate,
    salaryGrowthRate,
    revenueGrowth,
    yearsToProject,
    includeNewSpending,
  } = params;

  const currentYear = 2026;
  const data = [];
  let currentMillionaires = numMillionaires;

  // Starting values (FY2026 actuals)
  const startingPropertyTaxRev = 35;
  const startingIncomePersonalRev = 16.5;
  const startingCorpTaxRev = 8.5;
  const startingOtherRev = 20;
  const startingStateAid = 20.9;
  const startingFedAid = 11;
  const startingSalary = 46.5; // NYC Personal Services ($56.9B) minus health benefits ($10.4B tracked separately). Includes base pay, overtime ($2.9B), payroll taxes, workers comp
  const startingPension = 10.5;
  const startingBenefits = 10.4;
  const startingDebtService = 7.5;
  const startingOtherSpend = 52.1; // 127 - 46.5 - 10.5 - 10.4 - 7.5 = parks, transit, housing, services, education
  const millionaireShareOfIncomeTax = 0.4;
  const avgMillionaireIncome = 4.2;

  // Migration model: elasticity of out-migration to tax rate changes
  // Based on literature: ~1.5% of millionaires leave per 1% tax increase
  const taxDelta = millionaireTaxRate - BASELINE.millionaireTaxRate;
  const propDelta = propertyTaxRate - BASELINE.propertyTaxRate;

  for (let i = 0; i <= yearsToProject; i++) {
    const year = currentYear + i;
    const t = i;

    // Migration: compound annual out-migration based on tax differential
    const annualMigrationRate =
      taxDelta > 0
        ? migrationSensitivity * taxDelta * 0.012 +
          (propDelta > 0 ? propDelta * 0.003 : 0)
        : Math.max(taxDelta * 0.005, -0.01); // slight in-migration if taxes drop

    if (i > 0) {
      const netMigration = Math.round(
        currentMillionaires * annualMigrationRate,
      );
      currentMillionaires = Math.max(5000, currentMillionaires - netMigration);
    }

    // Revenue calculations
    const millionaireRatio = currentMillionaires / numMillionaires;
    const incomeFromMillionaires =
      (currentMillionaires *
        avgMillionaireIncome *
        (millionaireTaxRate / 100)) /
      1000;
    const incomeFromOthers =
      startingIncomePersonalRev *
      (1 - millionaireShareOfIncomeTax) *
      Math.pow(1 + revenueGrowth / 100, t);
    const personalIncomeTaxRev = incomeFromMillionaires + incomeFromOthers;

    // Corporate tax: base erodes as rates rise (Giroud & Rauh 2019: -0.4 to -0.5 elasticity;
    // Berkeley CIT study: ~5-7% base shrinkage per 1pp rate hike via profit-shifting, reduced activity, relocation)
    // Erosion phases in over time as firms restructure — 40% immediate, rest over ~5 years
    const corpRateDelta = corpTaxRate - BASELINE.corpTaxRate;
    const totalBaseChange = 1 - (corpErosionSensitivity / 100) * corpRateDelta; // e.g. 3.75pp hike * 5% = 18.75% shrinkage
    const phaseIn = Math.min(1, 0.4 + 0.6 * (t / 5)); // 40% year 1, fully phased in by year 5
    const effectiveBase =
      corpRateDelta > 0
        ? 1 - (1 - totalBaseChange) * phaseIn // erosion phases in
        : 1 + (totalBaseChange - 1) * phaseIn; // growth phases in if rates drop
    const corpRevenue =
      startingCorpTaxRev *
      (corpTaxRate / BASELINE.corpTaxRate) *
      Math.pow(1 + revenueGrowth / 100, t) *
      Math.max(0.3, effectiveBase);

    const propertyTaxRev =
      startingPropertyTaxRev *
      (propertyTaxRate / BASELINE.propertyTaxRate) *
      Math.pow(1 + 0.02, t);

    const otherRev = startingOtherRev * Math.pow(1 + revenueGrowth / 100, t);
    const stateAid = startingStateAid * Math.pow(1 + 0.015, t);
    const fedAid = startingFedAid * Math.pow(1 - 0.02, t); // declining federal aid

    const totalRevenue =
      personalIncomeTaxRev +
      corpRevenue +
      propertyTaxRev +
      otherRev +
      stateAid +
      fedAid;

    // Spending calculations — bottom-up: budget = sum of components
    const salarySpend =
      startingSalary * Math.pow(1 + salaryGrowthRate / 100, t);
    const pensionSpend =
      startingPension * Math.pow(1 + pensionGrowthRate / 100, t);
    const benefitsSpend =
      startingBenefits * Math.pow(1 + benefitsGrowthRate / 100, t);
    const debtService = startingDebtService * Math.pow(1 + 0.03, t);
    const fixedCosts = salarySpend + pensionSpend + benefitsSpend + debtService;
    const otherSpend =
      startingOtherSpend * Math.pow(1 + otherSpendGrowth / 100, t);

    // New Mamdani spending commitments (phase in over years)
    let newSpendTotal = 0;
    if (includeNewSpending && t > 0) {
      NEW_COMMITMENTS.forEach((c) => {
        const yr = Math.min(t - 1, 3); // index into amounts array (0-3)
        const amt = c.amounts[yr];
        // grow at 3% after initial phase-in year
        const growthYears = Math.max(0, t - 1 - yr);
        newSpendTotal += amt * Math.pow(1.03, growthYears);
      });
    }

    const totalBudget = fixedCosts + otherSpend + newSpendTotal;

    const gap = totalBudget - totalRevenue;

    data.push({
      year,
      totalBudget: parseFloat(totalBudget.toFixed(1)),
      totalRevenue: parseFloat(totalRevenue.toFixed(1)),
      salarySpend: parseFloat(salarySpend.toFixed(1)),
      pensionSpend: parseFloat(pensionSpend.toFixed(1)),
      benefitsSpend: parseFloat(benefitsSpend.toFixed(1)),
      debtService: parseFloat(debtService.toFixed(1)),
      fixedCosts: parseFloat(fixedCosts.toFixed(1)),
      fixedCostPct: parseFloat(((fixedCosts / totalBudget) * 100).toFixed(1)),
      otherSpend: parseFloat(Math.max(0, otherSpend).toFixed(1)),
      newSpend: parseFloat(newSpendTotal.toFixed(1)),
      gap: parseFloat(gap.toFixed(1)),
      millionaires: currentMillionaires,
      millionaireRevenue: parseFloat(incomeFromMillionaires.toFixed(1)),
      corpRevenue: parseFloat(corpRevenue.toFixed(1)),
      propertyTaxRev: parseFloat(propertyTaxRev.toFixed(1)),
      personalIncomeTaxRev: parseFloat(personalIncomeTaxRev.toFixed(1)),
      otherRev: parseFloat((otherRev + stateAid + fedAid).toFixed(1)),
      cumulativeGap: 0,
    });
  }

  // Compute cumulative gap
  let cum = 0;
  for (const d of data) {
    cum += d.gap;
    d.cumulativeGap = parseFloat(cum.toFixed(1));
  }

  return data;
}

const chartMargin = { top: 10, right: 20, left: 10, bottom: 5 };

const GHOST_PAIRS = {
  ghostBudget: 'Total Spend',
  ghostRevenue: 'Total Revenue',
  ghostFixed: '⬤ FIXED COSTS',
  ghostGap: 'Budget Gap',
  ghostMillionaires: 'Millionaires',
  ghostMillionaireRev: 'Millionaire Tax Rev',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;

  // Separate ghost and real items, then pair them
  const ghosts = {};
  const reals = [];
  payload.forEach((p) => {
    if (p.dataKey && p.dataKey.startsWith('ghost')) {
      ghosts[p.dataKey] = p;
    } else {
      reals.push(p);
    }
  });

  // Build paired display: real item, then its ghost (if any) indented below
  const ghostForReal = {};
  Object.entries(GHOST_PAIRS).forEach(([ghostKey, realName]) => {
    if (ghosts[ghostKey]) ghostForReal[realName] = ghosts[ghostKey];
  });

  return (
    <div
      style={{
        background: '#1e1b16',
        border: '1px solid #3a342a',
        borderRadius: 6,
        padding: '8px 12px',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div style={{ color: '#d4a556', fontWeight: 700, marginBottom: 4 }}>
        {label}
      </div>
      {reals.map((p, i) => {
        const ghost = ghostForReal[p.name];
        const fmtVal = (v) =>
          typeof v === 'number' && v > 500 ? fmtK(v) : fmt(v);
        return (
          <div key={i} style={{ marginBottom: ghost ? 1 : 2 }}>
            <div style={{ color: p.color }}>
              {p.name}: {fmtVal(p.value)}
            </div>
            {ghost && fmtVal(ghost.value) !== fmtVal(p.value) && (
              <div
                style={{
                  color: ghost.color,
                  opacity: 0.35,
                  fontSize: 10,
                  paddingLeft: 8,
                }}
              >
                baseline: {fmtVal(ghost.value)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function NYCBudgetSimulator() {
  const [params, setParams] = useState(DEFAULTS);
  const [showMamdani, setShowMamdani] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [newSpendInfoOpen, setNewSpendInfoOpen] = useState(false);

  const set = useCallback(
    (key) => (val) => setParams((p) => ({ ...p, [key]: val })),
    [],
  );

  const applyMamdaniTax = () => {
    if (showMamdani) {
      setParams((p) => ({
        ...p,
        millionaireTaxRate: DEFAULTS.millionaireTaxRate,
        corpTaxRate: DEFAULTS.corpTaxRate,
        propertyTaxRate: DEFAULTS.propertyTaxRate,
      }));
      setShowMamdani(false);
    } else {
      setParams((p) => ({
        ...p,
        millionaireTaxRate: 5.876,
        corpTaxRate: 11.5,
        propertyTaxRate: 13.45,
      }));
      setShowMamdani(true);
    }
  };

  const applyMamdaniSpending = () => {
    setParams((p) => ({
      ...p,
      includeNewSpending: !p.includeNewSpending,
    }));
  };

  const resetDefaults = () => {
    setParams(DEFAULTS);
    setShowMamdani(false);
    setNewSpendInfoOpen(false);
  };

  const data = useMemo(() => simulate(params), [params]);
  const baselineData = useMemo(() => simulate(DEFAULTS), []);

  // Merge ghost (baseline) values into data for overlay
  const dataWithGhost = useMemo(() => {
    return data.map((d, i) => {
      const b = baselineData[i] || {};
      return {
        ...d,
        ghostBudget: b.totalBudget,
        ghostRevenue: b.totalRevenue,
        ghostFixed: b.fixedCosts,
        ghostGap: b.gap,
        ghostMillionaires: b.millionaires,
        ghostMillionaireRev: b.millionaireRevenue,
      };
    });
  }, [data, baselineData]);
  const lastYear = data[data.length - 1];
  const firstYear = data[0];

  const totalMillionaireLoss = firstYear.millionaires - lastYear.millionaires;
  const finalGap = lastYear.gap;
  const pensionPctFinal = (
    (lastYear.pensionSpend / lastYear.totalBudget) *
    100
  ).toFixed(1);
  const benefitsPctFinal = (
    (lastYear.benefitsSpend / lastYear.totalBudget) *
    100
  ).toFixed(1);
  const salaryPctFinal = (
    (lastYear.salarySpend / lastYear.totalBudget) *
    100
  ).toFixed(1);
  const fixedCostPctFinal = lastYear.fixedCostPct;

  // Tax burden by bracket (simplified model)
  const brackets = useMemo(() => {
    const cityRate = params.millionaireTaxRate;
    const stateRates = { bottom50: 4.0, middle: 6.5, top10: 8.82, top1: 10.9 };
    const fedRates = { bottom50: 10, middle: 22, top10: 32, top1: 37 };
    return [
      {
        bracket: 'Bottom 50%\n(<$50K)',
        cityRate: 3.078,
        stateRate: stateRates.bottom50,
        fedRate: fedRates.bottom50,
        shareOfRevenue: 0.2,
      },
      {
        bracket: 'Middle\n($50K-$200K)',
        cityRate: 3.5,
        stateRate: stateRates.middle,
        fedRate: fedRates.middle,
        shareOfRevenue: 18.5,
      },
      {
        bracket: 'Top 10%\n($200K-$1M)',
        cityRate: 3.876,
        stateRate: stateRates.top10,
        fedRate: fedRates.top10,
        shareOfRevenue: 42,
      },
      {
        bracket: 'Top 1%\n(>$1M)',
        cityRate: cityRate,
        stateRate: stateRates.top1,
        fedRate: fedRates.top1,
        shareOfRevenue: 39.3,
      },
    ].map((b) => ({
      ...b,
      totalRate: parseFloat((b.cityRate + b.stateRate + b.fedRate).toFixed(1)),
      label: b.bracket,
    }));
  }, [params.millionaireTaxRate]);

  return (
    <div
      style={{
        background: '#141210',
        color: '#f0e6d3',
        minHeight: '100vh',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        padding: '24px 20px',
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            borderBottom: '2px solid #d4a556',
            paddingBottom: 16,
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: '#d4a556',
              letterSpacing: '0.08em',
              margin: 0,
            }}
          >
            NYC FISCAL DEATH SPIRAL SIMULATOR
          </h1>
          <p
            style={{
              fontSize: 12,
              color: '#8a7e6e',
              margin: '6px 0 0 0',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Modeling the structural trap of progressive municipal governance ·
            FY2026–{2026 + params.yearsToProject}
          </p>
        </div>

        {/* Intro box */}
        <div
          style={{
            background: 'rgba(212,165,86,0.06)',
            border: '1px solid #3a342a',
            borderLeft: '3px solid #d4a556',
            borderRadius: 6,
            marginBottom: 20,
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setInfoOpen(!infoOpen)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              color: '#d4a556',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.06em',
              }}
            >
              WHAT YOU'RE LOOKING AT
            </span>
            <span
              style={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#8a7e6e',
                transform: infoOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              ▼
            </span>
          </button>
          {infoOpen && (
            <div
              style={{
                padding: '0 16px 14px 16px',
                fontSize: 13,
                lineHeight: 1.7,
                color: '#c4b5a0',
              }}
            >
              <p style={{ margin: '0 0 10px 0' }}>
                NYC spends more per capita than almost any city on earth —
                comparable to the <em>entire state of Florida</em> with a third
                the population — yet delivers middling outcomes. The city spends{' '}
                <span style={{ color: '#e85d4a', fontWeight: 600 }}>
                  $36,000 per student
                </span>{' '}
                (2.3× the national average) for below-average test scores.
              </p>
              <p style={{ margin: '0 0 10px 0' }}>
                The core problem:{' '}
                <span style={{ color: '#e088a8', fontWeight: 600 }}>
                  salaries
                </span>
                ,{' '}
                <span style={{ color: '#b088d4', fontWeight: 600 }}>
                  pensions
                </span>
                , and{' '}
                <span style={{ color: '#e088a8', fontWeight: 600 }}>
                  health benefits
                </span>{' '}
                for 302,000 active city employees <em>and 250,000+ retirees</em>{' '}
                consume an ever-growing share of the budget. These are{' '}
                <em>exactly</em> the costs a socialist coalition built on
                public-sector unions cannot cut. The unfunded retiree healthcare
                liability alone is{' '}
                <span style={{ color: '#e85d4a', fontWeight: 600 }}>
                  ~$100 billion
                </span>
                . Pension payouts are exempt from state and local tax.
              </p>
              <p style={{ margin: '0 0 10px 0' }}>
                Watch the{' '}
                <span style={{ color: '#4a9de8', fontWeight: 700 }}>
                  ⬤ FIXED COSTS % BUDGET
                </span>{' '}
                stat. As personnel costs compound faster than revenue, they
                crowd out everything else — parks, transit, housing, actual
                services. The city increasingly exists to pay its own employees,
                not to serve residents. Raising taxes on the rich provides a
                one-time sugar hit, but the spending treadmill outruns it within
                years, especially as millionaires leave.
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: '#8a7e6e',
                  fontStyle: 'italic',
                }}
              >
                Use the knobs to test different scenarios. Hit "Apply Mamdani
                Proposal" to see his plan in action.
              </p>
            </div>
          )}
        </div>

        {/* Preset buttons */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <button
            onClick={applyMamdaniTax}
            style={{
              background: showMamdani ? '#d4a556' : 'transparent',
              color: showMamdani ? '#141210' : '#d4a556',
              border: '1px solid #d4a556',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            {showMamdani ? '✓ ' : ''}APPLY MAMDANI TAX PROPOSAL
          </button>
          <button
            onClick={applyMamdaniSpending}
            style={{
              background: params.includeNewSpending ? '#e85d4a' : 'transparent',
              color: params.includeNewSpending ? '#141210' : '#e85d4a',
              border: '1px solid #e85d4a',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            {params.includeNewSpending ? '✓ ' : ''}APPLY MAMDANI SPENDING
            PROPOSAL
          </button>
          <button
            onClick={() => setNewSpendInfoOpen(!newSpendInfoOpen)}
            style={{
              background: 'transparent',
              color: '#e85d4a',
              border: '1px solid #3a342a',
              borderRadius: 4,
              padding: '6px 10px',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⓘ DETAILS
          </button>
          <button
            onClick={resetDefaults}
            style={{
              background: 'transparent',
              color: '#8a7e6e',
              border: '1px solid #3a342a',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            RESET TO CURRENT
          </button>
        </div>

        {/* New spending detail panel */}
        {newSpendInfoOpen && (
          <div
            style={{
              background: 'rgba(30,27,22,0.8)',
              border: '1px solid #3a342a',
              borderRadius: 6,
              padding: '14px 16px',
              marginBottom: 16,
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.7,
            }}
          >
            {/* Tax section */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#d4a556',
                letterSpacing: '0.06em',
                marginBottom: 10,
                textTransform: 'uppercase',
              }}
            >
              Mamdani's Tax Proposals
            </div>
            <div style={{ fontSize: 11, color: '#8a7e6e', marginBottom: 12 }}>
              Requires Albany approval. Hochul has flatly rejected tax hikes. If
              blocked, Mamdani's fallback is the 9.5% property tax increase.
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 11,
                marginBottom: 16,
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #3a342a' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      color: '#c4b5a0',
                      fontWeight: 600,
                    }}
                  >
                    Tax
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#c4b5a0',
                      fontWeight: 600,
                    }}
                  >
                    Current
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#c4b5a0',
                      fontWeight: 600,
                    }}
                  >
                    Proposed
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#c4b5a0',
                      fontWeight: 600,
                    }}
                  >
                    Combined*
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#c4b5a0',
                      fontWeight: 600,
                    }}
                  >
                    Est. Revenue
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      color: '#c4b5a0',
                      fontWeight: 600,
                    }}
                  >
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #2a2520' }}>
                  <td style={{ padding: '6px 8px', color: '#f0e6d3' }}>
                    City income tax (&gt;$1M)
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#5cb85c',
                    }}
                  >
                    3.876%
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#e85d4a',
                      fontWeight: 700,
                    }}
                  >
                    5.876%
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#e85d4a',
                    }}
                  >
                    ~16.8%
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#d4a556',
                    }}
                  >
                    ~$4B/yr
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      color: '#6b6157',
                      fontSize: 10,
                    }}
                  >
                    +2pp on ~33K filers. Combined fed+state+city = highest in
                    US. SALT cap makes non-deductible.
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #2a2520' }}>
                  <td style={{ padding: '6px 8px', color: '#f0e6d3' }}>
                    Corporate tax
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#5cb85c',
                    }}
                  >
                    7.75%
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#e85d4a',
                      fontWeight: 700,
                    }}
                  >
                    11.5%
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#e85d4a',
                    }}
                  >
                    ~38.8%
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#d4a556',
                    }}
                  >
                    ~$5B/yr
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      color: '#6b6157',
                      fontSize: 10,
                    }}
                  >
                    Combined fed (21%) + state (7.25%) + city. Subject to base
                    erosion via profit-shifting.
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #2a2520' }}>
                  <td style={{ padding: '6px 8px', color: '#f0e6d3' }}>
                    Property tax (fallback)
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#5cb85c',
                    }}
                  >
                    12.28%
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#e85d4a',
                      fontWeight: 700,
                    }}
                  >
                    13.45%
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#6b6157',
                    }}
                  >
                    —
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#d4a556',
                    }}
                  >
                    ~$3.7B/yr
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      color: '#6b6157',
                      fontSize: 10,
                    }}
                  >
                    9.5% hike. Hits 3M+ residential units, 100K commercial.
                    Landlords pass to tenants — contradicts rent freeze.
                  </td>
                </tr>
                <tr style={{ borderTop: '2px solid #d4a556' }}>
                  <td
                    colSpan={4}
                    style={{
                      padding: '6px 8px',
                      color: '#d4a556',
                      fontWeight: 700,
                    }}
                  >
                    TOTAL ESTIMATED NEW TAX REVENUE (static)
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: '#d4a556',
                      fontWeight: 700,
                    }}
                  >
                    ~$9B/yr
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      color: '#6b6157',
                      fontSize: 10,
                    }}
                  >
                    Before migration & base erosion
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              style={{
                fontSize: 10,
                color: '#6b6157',
                marginBottom: 16,
                fontStyle: 'italic',
              }}
            >
              * Combined = federal + NYS + NYC. The SALT deduction cap ($10K)
              means state/local taxes are effectively non-deductible for high
              earners, increasing the real burden and migration incentive. NY's
              share of US millionaires fell from 12.7% (2010) to 8.7% (2022).
            </div>

            {/* Spending section */}
            <div style={{ borderTop: '1px solid #3a342a', paddingTop: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#e85d4a',
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                  textTransform: 'uppercase',
                }}
              >
                Mamdani's New Spending Commitments
              </div>
              <div style={{ fontSize: 11, color: '#8a7e6e', marginBottom: 12 }}>
                Not all items are in the preliminary budget — free buses,
                grocery stores, and the mental health department are deferred to
                the April executive budget. Housing is a $100B capital plan
                ($70B borrowed) modeled here as debt service. Childcare cost is
                the campaign's own estimate at full scale.
              </div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #3a342a' }}>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '6px 8px',
                        color: '#c4b5a0',
                        fontWeight: 600,
                      }}
                    >
                      Program
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '6px 8px',
                        color: '#c4b5a0',
                        fontWeight: 600,
                      }}
                    >
                      Yr 1
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '6px 8px',
                        color: '#c4b5a0',
                        fontWeight: 600,
                      }}
                    >
                      Yr 2
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '6px 8px',
                        color: '#c4b5a0',
                        fontWeight: 600,
                      }}
                    >
                      Yr 3
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '6px 8px',
                        color: '#c4b5a0',
                        fontWeight: 600,
                      }}
                    >
                      Yr 4+
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '6px 8px',
                        color: '#c4b5a0',
                        fontWeight: 600,
                      }}
                    >
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {NEW_COMMITMENTS.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #2a2520' }}>
                      <td style={{ padding: '6px 8px', color: '#f0e6d3' }}>
                        <div>{c.label}</div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#6b6157',
                            fontStyle: 'italic',
                          }}
                        >
                          {c.desc}
                        </div>
                      </td>
                      {c.amounts.map((a, j) => (
                        <td
                          key={j}
                          style={{
                            textAlign: 'right',
                            padding: '6px 8px',
                            color: a > 0 ? '#e85d4a' : '#3a342a',
                            fontWeight: 600,
                          }}
                        >
                          ${a.toFixed(1)}B
                        </td>
                      ))}
                      <td
                        style={{
                          padding: '6px 8px',
                          color: '#6b6157',
                          fontSize: 10,
                        }}
                      >
                        {c.source}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #e85d4a' }}>
                    <td
                      style={{
                        padding: '6px 8px',
                        color: '#e85d4a',
                        fontWeight: 700,
                      }}
                    >
                      TOTAL NEW SPENDING
                    </td>
                    {[0, 1, 2, 3].map((yr) => (
                      <td
                        key={yr}
                        style={{
                          textAlign: 'right',
                          padding: '6px 8px',
                          color: '#e85d4a',
                          fontWeight: 700,
                        }}
                      >
                        $
                        {NEW_COMMITMENTS.reduce(
                          (s, c) => s + c.amounts[yr],
                          0,
                        ).toFixed(1)}
                        B
                      </td>
                    ))}
                    <td></td>
                  </tr>
                </tbody>
              </table>
              <div
                style={{
                  fontSize: 10,
                  color: '#6b6157',
                  marginTop: 8,
                  fontStyle: 'italic',
                }}
              >
                Type breakdown: Comp (teachers, childcare/MH workers) adds to
                personnel costs and generates future pension/benefit
                obligations. Program transfers (buses, parks, libraries) are
                non-personnel. Housing modeled as incremental debt service on
                $70B in bonds. All items grow at 3%/yr after reaching full
                phase-in.
              </div>
            </div>
          </div>
        )}

        {/* Main layout */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {/* Controls */}
          <div
            style={{
              width: 280,
              flexShrink: 0,
              background: 'rgba(20,18,16,0.8)',
              border: '1px solid #2a2520',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#d4a556',
                letterSpacing: '0.1em',
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 16,
                textTransform: 'uppercase',
              }}
            >
              Controls
            </div>
            <Knob
              label="Other Spend Growth"
              value={params.otherSpendGrowth}
              onChange={set('otherSpendGrowth')}
              min={0}
              max={10}
              step={0.1}
              unit="%"
              description="Parks, transit, housing, education, services — everything outside fixed costs"
              sources={[
                {
                  text: 'NYC OMB FY2026 budget: non-personnel services historically grow 2-4%/yr',
                  url: 'https://www.nyc.gov/site/omb/publications/finplan01-25.page',
                  linkLabel: 'NYC OMB',
                },
              ]}
            />
            <Knob
              label="Millionaires"
              value={params.numMillionaires}
              onChange={set('numMillionaires')}
              min={10000}
              max={60000}
              step={1000}
              unit=""
              description="Starting millionaire tax filers"
              sources={[
                {
                  text: '~34K filers with AGI >$1M in NYC (IRS SOI, NYS Dept of Taxation)',
                  url: 'https://www.tax.ny.gov/research/stats/statistics/personal-income-tax-filers.htm',
                  linkLabel: 'NYS Tax Stats',
                },
                {
                  text: 'Top 1% pay ~40% of NYC personal income tax',
                  url: 'https://cbcny.org/research/growing-gap',
                  linkLabel: 'CBC Report',
                },
              ]}
            />
            <Knob
              label="City Income Tax (>$1M)"
              value={params.millionaireTaxRate}
              onChange={set('millionaireTaxRate')}
              min={1}
              max={75}
              step={0.1}
              unit="%"
              logScale
              description={`Current: 3.876% · Mamdani: 5.876%`}
              sources={[
                {
                  text: 'NYC top rate 3.876% (income >$50M). Mamdani proposal raises to 5.876% on >$1M',
                  url: 'https://www.nyc.gov/site/finance/taxes/property-tax-rates.page',
                  linkLabel: 'NYC Finance',
                },
                {
                  text: 'Combined w/ state: 14.776% current → 16.776% proposed (highest in US)',
                  url: 'https://taxfoundation.org/data/all/state/state-income-tax-rates-2025/',
                  linkLabel: 'Tax Foundation',
                },
              ]}
            />
            <Knob
              label="Corporate Tax Rate"
              value={params.corpTaxRate}
              onChange={set('corpTaxRate')}
              min={2}
              max={75}
              step={0.25}
              unit="%"
              logScale
              description={`Current: 7.75% · Mamdani: 11.5%`}
              sources={[
                {
                  text: 'NYC General Corporation Tax: 8.85% (combined w/ metro surcharge ≈ 7.75% effective). Mamdani proposes 11.5%',
                  url: 'https://www.nyc.gov/site/finance/taxes/business-corporation-tax.page',
                  linkLabel: 'NYC Finance',
                },
                {
                  text: 'Combined federal+state+city would reach ~38.75% — highest metro corp rate in US',
                  url: 'https://taxfoundation.org/research/all/state/2025-state-tax-competitiveness-index/',
                  linkLabel: 'Tax Foundation',
                },
              ]}
            />
            <Knob
              label="Property Tax Rate"
              value={params.propertyTaxRate}
              onChange={set('propertyTaxRate')}
              min={2}
              max={75}
              step={0.1}
              unit="%"
              logScale
              description={`Current: 12.28% · Mamdani: 13.45%`}
              sources={[
                {
                  text: 'FY2025 Class 1 residential rate: 19.997%, Class 4 commercial: 10.755%. Blended effective ~12.28%',
                  url: 'https://www.nyc.gov/site/finance/taxes/property-tax-rates.page',
                  linkLabel: 'NYC Finance',
                },
                {
                  text: "Mamdani: 9.5% hike as 'last resort' if Albany blocks millionaire tax",
                  url: 'https://www.politico.com/news/2025/06/09/mamdani-property-tax-hike-nyc-budget-00393041',
                  linkLabel: 'Politico',
                },
              ]}
            />
            <Knob
              label="Migration Sensitivity"
              value={params.migrationSensitivity}
              onChange={set('migrationSensitivity')}
              min={0}
              max={5}
              step={0.1}
              unit="x"
              description="Millionaire out-migration elasticity per 1% tax hike"
              sources={[
                {
                  text: 'Kleven et al. (2019): literature review finds elasticities of 1.2-1.8 for top earners',
                  url: 'https://www.aeaweb.org/articles?id=10.1257/jep.28.4.77',
                  linkLabel: 'AEA',
                },
                {
                  text: 'NY lost 12.7% → 8.7% share of US millionaires (2010-2022)',
                  url: 'https://www.empirecenter.org/publications/new-yorks-shrinking-share/',
                  linkLabel: 'Empire Center',
                },
                {
                  text: 'CA lost $16.1B in AGI after millionaire tax (Proposition 30, 2016 data)',
                  url: 'https://taxfoundation.org/research/all/state/state-migration-trends/',
                  linkLabel: 'Tax Foundation',
                },
              ]}
            />
            <Knob
              label="Corp Base Erosion"
              value={params.corpErosionSensitivity}
              onChange={set('corpErosionSensitivity')}
              min={0}
              max={10}
              step={0.5}
              unit="%"
              description="% of corp tax base lost per 1pp rate hike (profit-shifting, relocation, reduced activity). Literature: 4-7%"
              sources={[
                {
                  text: 'Giroud & Rauh (2019): C-corp employment elasticity of -0.4 to -0.5 per 1pp rate increase',
                  url: 'https://www.journals.uchicago.edu/doi/10.1086/706048',
                  linkLabel: 'J. Political Economy',
                },
                {
                  text: 'Bruce, Deskins & Fox: 1pp CIT rate increase → 6.6% base shrinkage (elasticity -0.44)',
                  url: 'https://eml.berkeley.edu/~burch/incometax05/bruce_deskins_fox.pdf',
                  linkLabel: 'Berkeley Working Paper',
                },
                {
                  text: 'Suárez Serrato & Zidar (NBER): firms bear ~50% of corp tax incidence, implying significant activity response',
                  url: 'https://www.nber.org/reporter/2023number3/how-do-corporate-taxes-affect-economic-activity',
                  linkLabel: 'NBER',
                },
              ]}
            />
            <Knob
              label="Pension Growth"
              value={params.pensionGrowthRate}
              onChange={set('pensionGrowthRate')}
              min={1}
              max={10}
              step={0.1}
              unit="%"
              description="Annual pension obligation growth"
              sources={[
                {
                  text: 'NYC pension contributions grew from $6.4B (FY14) to $10.5B (FY25) ≈ 4.6% CAGR. Default 5.5% reflects upward trend',
                  url: 'https://comptroller.nyc.gov/reports/annual-comprehensive-financial-report/',
                  linkLabel: 'NYC Comptroller',
                },
                {
                  text: '5 pension systems cover 302K active + 250K+ retirees. Payouts are exempt from NYS/NYC income tax',
                  url: 'https://www.empirecenter.org/publications/pension-and-opeb-transparency/',
                  linkLabel: 'Empire Center',
                },
              ]}
            />
            <Knob
              label="Benefits Growth"
              value={params.benefitsGrowthRate}
              onChange={set('benefitsGrowthRate')}
              min={1}
              max={15}
              step={0.1}
              unit="%"
              description="Health insurance & OPEB growth (12.2% approved for FY26)"
              sources={[
                {
                  text: 'FY26 health insurance premium increase of 12.2% approved by Office of Labor Relations',
                  url: 'https://cbcny.org/research/growing-gap',
                  linkLabel: 'CBC',
                },
                {
                  text: '~$100B unfunded OPEB (retiree healthcare) liability per NYC Comptroller',
                  url: 'https://comptroller.nyc.gov/reports/annual-comprehensive-financial-report/',
                  linkLabel: 'NYC Comptroller',
                },
                {
                  text: 'National employer health costs rising 7-9%/yr (KFF 2024 survey). NYC runs 8%+ due to generous union contracts',
                  url: 'https://www.kff.org/health-costs/report/employer-health-benefits-survey/',
                  linkLabel: 'KFF',
                },
              ]}
            />
            <Knob
              label="Comp Growth"
              value={params.salaryGrowthRate}
              onChange={set('salaryGrowthRate')}
              min={0}
              max={8}
              step={0.1}
              unit="%"
              description="Annual compensation growth (salary + OT + payroll tax) for 302K employees"
              sources={[
                {
                  text: 'Recent union contracts (DC37, UFT) settled at 3-3.5% annual raises. OT ($2.9B) grows faster',
                  url: 'https://cbcny.org/research/growing-gap',
                  linkLabel: 'CBC',
                },
                {
                  text: 'Total Personal Services: $56.9B for FY26 per NYC OMB (base pay + OT + fringe)',
                  url: 'https://www.nyc.gov/site/omb/publications/finplan01-25.page',
                  linkLabel: 'NYC OMB',
                },
              ]}
            />
            <Knob
              label="Base Revenue Growth"
              value={params.revenueGrowth}
              onChange={set('revenueGrowth')}
              min={0}
              max={6}
              step={0.1}
              unit="%"
              description="Non-tax revenue annual growth"
              sources={[
                {
                  text: 'NYC IBO projects non-tax revenue (fees, fines, state aid) growing ~2.5-3%/yr',
                  url: 'https://www.ibo.nyc.ny.us/',
                  linkLabel: 'NYC IBO',
                },
              ]}
            />
            <Knob
              label="Years to Project"
              value={params.yearsToProject}
              onChange={set('yearsToProject')}
              min={5}
              max={20}
              step={1}
              unit="yr"
            />
          </div>

          {/* Charts */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Budget vs Revenue chart */}
            <SectionTitle>
              Budget vs Revenue ·{' '}
              <span style={{ color: '#4a9de8' }}>Fixed Costs</span> Overlay
            </SectionTitle>
            <div
              style={{
                background: 'rgba(20,18,16,0.6)',
                border: '1px solid #2a2520',
                borderRadius: 8,
                padding: '16px 8px',
              }}
            >
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={dataWithGhost} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2520" />
                  <XAxis
                    dataKey="year"
                    tick={{
                      fill: '#6b6157',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <YAxis
                    tick={{
                      fill: '#6b6157',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono',
                    }}
                    tickFormatter={(v) => `${v}B`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pensionSpend"
                    name="Pension"
                    fill="#b088d4"
                    fillOpacity={0.25}
                    stroke="#b088d4"
                    strokeWidth={1.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="benefitsSpend"
                    name="Benefits"
                    fill="#e088a8"
                    fillOpacity={0.2}
                    stroke="#e088a8"
                    strokeWidth={1.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="salarySpend"
                    name="Compensation"
                    fill="#6ab0d4"
                    fillOpacity={0.2}
                    stroke="#6ab0d4"
                    strokeWidth={1.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="ghostBudget"
                    name="Baseline Spend"
                    legendType="none"
                    stroke="#e85d4a"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="4 4"
                    strokeOpacity={0.3}
                  />
                  <Line
                    type="monotone"
                    dataKey="ghostRevenue"
                    name="Baseline Rev"
                    legendType="none"
                    stroke="#5cb85c"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="4 4"
                    strokeOpacity={0.3}
                  />
                  <Line
                    type="monotone"
                    dataKey="ghostFixed"
                    name="Baseline Fixed"
                    legendType="none"
                    stroke="#4a9de8"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="4 4"
                    strokeOpacity={0.3}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalBudget"
                    name="Total Spend"
                    stroke="#e85d4a"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalRevenue"
                    name="Total Revenue"
                    stroke="#5cb85c"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="fixedCosts"
                    name="⬤ FIXED COSTS"
                    stroke="#4a9de8"
                    strokeWidth={2.5}
                    dot={false}
                    strokeDasharray="6 3"
                  />
                  <Area
                    type="monotone"
                    dataKey="debtService"
                    name="Debt Service"
                    fill="#e8a84a"
                    fillOpacity={0.15}
                    stroke="#e8a84a"
                    strokeWidth={1}
                  />
                  {params.includeNewSpending && (
                    <Area
                      type="monotone"
                      dataKey="newSpend"
                      name="New Commitments"
                      fill="#e85d4a"
                      fillOpacity={0.3}
                      stroke="#e85d4a"
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Annual Budget Gap */}
            <SectionTitle>Annual Budget Gap</SectionTitle>
            <div
              style={{
                background: 'rgba(20,18,16,0.6)',
                border: '1px solid #2a2520',
                borderRadius: 8,
                padding: '16px 8px',
              }}
            >
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={dataWithGhost} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2520" />
                  <XAxis
                    dataKey="year"
                    tick={{
                      fill: '#6b6157',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <YAxis
                    tick={{
                      fill: '#6b6157',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono',
                    }}
                    tickFormatter={(v) => `${v}B`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#3a342a" />
                  <Line
                    type="monotone"
                    dataKey="ghostGap"
                    name="Baseline Gap"
                    legendType="none"
                    stroke="#e85d4a"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="4 4"
                    strokeOpacity={0.3}
                  />
                  <Bar
                    dataKey="gap"
                    name="Budget Gap"
                    fill="#e85d4a"
                    fillOpacity={0.7}
                    radius={[3, 3, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Millionaire Migration */}
            <SectionTitle>Millionaire Exodus</SectionTitle>
            <div
              style={{
                background: 'rgba(20,18,16,0.6)',
                border: '1px solid #2a2520',
                borderRadius: 8,
                padding: '16px 8px',
              }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={dataWithGhost} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2520" />
                  <XAxis
                    dataKey="year"
                    tick={{
                      fill: '#6b6157',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{
                      fill: '#6b6157',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono',
                    }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{
                      fill: '#6b6157',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono',
                    }}
                    tickFormatter={(v) => `${v}B`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="ghostMillionaires"
                    name="Baseline Count"
                    legendType="none"
                    stroke="#d4a556"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="4 4"
                    strokeOpacity={0.3}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="ghostMillionaireRev"
                    name="Baseline Rev"
                    legendType="none"
                    stroke="#e85d4a"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="4 4"
                    strokeOpacity={0.3}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="millionaires"
                    name="Millionaires"
                    fill="#d4a556"
                    fillOpacity={0.2}
                    stroke="#d4a556"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="millionaireRevenue"
                    name="Millionaire Tax Rev"
                    stroke="#e85d4a"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Who Gets Paid section */}
            <SectionTitle>Who Gets Paid</SectionTitle>
            <div
              style={{
                background: 'rgba(20,18,16,0.6)',
                border: '1px solid #2a2520',
                borderRadius: 8,
                padding: 16,
                marginBottom: 4,
              }}
            >
              {/* Dual proportional bars */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: '#8a7e6e',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Population — 8.3M residents
                </div>
                <div
                  style={{
                    display: 'flex',
                    height: 32,
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px solid #2a2520',
                  }}
                >
                  <div
                    style={{
                      width: '4%',
                      minWidth: 40,
                      background: '#4a9de8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 8,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#141210',
                    }}
                  >
                    302K
                  </div>
                  <div
                    style={{
                      width: '3%',
                      minWidth: 36,
                      background: '#e088a8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 8,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#141210',
                    }}
                  >
                    250K+
                  </div>
                  <div
                    style={{
                      width: '12%',
                      minWidth: 40,
                      background: '#b088d4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 8,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#141210',
                    }}
                  >
                    1M
                  </div>
                  <div
                    style={{
                      flex: 1,
                      background: '#2a2520',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#6b6157',
                    }}
                  >
                    ~7M other residents
                  </div>
                </div>

                {/* Budget capture bar */}
                {(() => {
                  const salPct =
                    (lastYear.salarySpend / lastYear.totalBudget) * 100;
                  const penPct =
                    (lastYear.pensionSpend / lastYear.totalBudget) * 100;
                  const benPct =
                    (lastYear.benefitsSpend / lastYear.totalBudget) * 100;
                  const empTotalPct = salPct + penPct + benPct;
                  const newSpendPct =
                    (lastYear.newSpend / lastYear.totalBudget) * 100;
                  const eduPct = 22;
                  const otherPct = 100 - empTotalPct - eduPct - newSpendPct;
                  return (
                    <>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#8a7e6e',
                          fontFamily: "'JetBrains Mono', monospace",
                          marginTop: 10,
                          marginBottom: 6,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        Budget captured — {fmt(lastYear.totalBudget)}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          height: 32,
                          borderRadius: 4,
                          overflow: 'hidden',
                          border: '1px solid #2a2520',
                        }}
                      >
                        <div
                          style={{
                            width: `${salPct}%`,
                            minWidth: 30,
                            background: '#4a9de8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 8,
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: '#141210',
                          }}
                        >
                          Salary
                        </div>
                        <div
                          style={{
                            width: `${penPct}%`,
                            minWidth: 24,
                            background: '#b088d4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 8,
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: '#141210',
                          }}
                        >
                          Pension
                        </div>
                        <div
                          style={{
                            width: `${benPct}%`,
                            minWidth: 24,
                            background: '#e088a8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 8,
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: '#141210',
                          }}
                        >
                          Benefits
                        </div>
                        <div
                          style={{
                            width: `${eduPct}%`,
                            minWidth: 24,
                            background: '#6b6157',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 8,
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: '#141210',
                          }}
                        >
                          Education
                        </div>
                        {newSpendPct > 0.5 && (
                          <div
                            style={{
                              width: `${newSpendPct}%`,
                              minWidth: 24,
                              background: '#e85d4a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 7,
                              fontWeight: 700,
                              fontFamily: "'JetBrains Mono', monospace",
                              color: '#141210',
                            }}
                          >
                            New
                          </div>
                        )}
                        <div
                          style={{
                            flex: 1,
                            background: '#2a2520',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 8,
                            fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: '#6b6157',
                          }}
                        >
                          Everything else
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: '#4a9de8',
                          fontWeight: 700,
                        }}
                      >
                        Employee total cost: {empTotalPct.toFixed(0)}% of budget
                        (
                        {fmt(
                          lastYear.salarySpend +
                            lastYear.pensionSpend +
                            lastYear.benefitsSpend,
                        )}
                        ) → for {(((302 + 250) / 8300) * 100).toFixed(1)}% of
                        the population
                      </div>
                    </>
                  );
                })()}

                <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    marginTop: 8,
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    flexWrap: 'wrap',
                  }}
                >
                  <span>
                    <span style={{ color: '#4a9de8' }}>■</span>{' '}
                    <span style={{ color: '#8a7e6e' }}>
                      Active employees / Comp
                    </span>
                  </span>
                  <span>
                    <span style={{ color: '#e088a8' }}>■</span>{' '}
                    <span style={{ color: '#8a7e6e' }}>
                      Retirees / Benefits
                    </span>
                  </span>
                  <span>
                    <span style={{ color: '#b088d4' }}>■</span>{' '}
                    <span style={{ color: '#8a7e6e' }}>
                      Students / Pensions
                    </span>
                  </span>
                  {lastYear.newSpend > 0 && (
                    <span>
                      <span style={{ color: '#e85d4a' }}>■</span>{' '}
                      <span style={{ color: '#8a7e6e' }}>New Commitments</span>
                    </span>
                  )}
                  <span>
                    <span style={{ color: '#3a342a' }}>■</span>{' '}
                    <span style={{ color: '#6b6157' }}>Everyone else</span>
                  </span>
                </div>
              </div>

              {/* Per capita spending comparison */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(() => {
                  // More accurate: salary goes to ~549K workers (incl part-time), pension/benefits also cover ~250K+ retirees
                  const actualPayroll = 34.6; // actual take-home payroll, not total PS
                  const avgPay = (actualPayroll / 0.549) * 1000; // $B / 549K employees -> dollars
                  const totalCompPerActive =
                    ((lastYear.salarySpend +
                      lastYear.benefitsSpend * 0.55 +
                      lastYear.pensionSpend * 0.4) /
                      0.302) *
                    1000;
                  const perResident = (lastYear.totalBudget / 8.3) * 1000;
                  const perStudent =
                    ((lastYear.totalBudget * 0.22) / 1.0) * 1000;
                  const fmtDollar = (d) =>
                    d >= 1000000
                      ? `$${(d / 1000000).toFixed(1)}M`
                      : d >= 1000
                        ? `$${(d / 1000).toFixed(0)}K`
                        : `$${d.toFixed(0)}`;
                  return (
                    <>
                      <div
                        style={{
                          flex: 1.3,
                          minWidth: 180,
                          background: 'rgba(74,157,232,0.08)',
                          border: '1px solid #4a9de8',
                          borderRadius: 6,
                          padding: '10px 12px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: '#4a9de8',
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 4,
                          }}
                        >
                          Per City Worker (avg pay)
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: '#4a9de8',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {fmtDollar(avgPay)}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#6b6157',
                            marginTop: 2,
                            lineHeight: 1.4,
                          }}
                        >
                          salary ÷ 549K workers (incl. part-time) · what they
                          actually see
                        </div>
                      </div>
                      <div
                        style={{
                          flex: 1.3,
                          minWidth: 180,
                          background: 'rgba(224,136,168,0.08)',
                          border: '1px solid #e088a8',
                          borderRadius: 6,
                          padding: '10px 12px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: '#e088a8',
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 4,
                          }}
                        >
                          True Cost Per Active Employee
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: '#e088a8',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {fmtDollar(totalCompPerActive)}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#6b6157',
                            marginTop: 2,
                            lineHeight: 1.4,
                          }}
                        >
                          salary + share of pension & benefits · 250K+ retirees
                          also draw from the same pools
                        </div>
                      </div>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 150,
                          background: 'rgba(30,27,22,0.7)',
                          border: '1px solid #3a342a',
                          borderRadius: 6,
                          padding: '10px 12px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: '#8a7e6e',
                            fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 4,
                          }}
                        >
                          Per Resident
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: '#f0e6d3',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {fmtDollar(perResident)}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#6b6157',
                            marginTop: 2,
                          }}
                        >
                          total budget ÷ 8.3M people
                        </div>
                      </div>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 150,
                          background: 'rgba(176,136,212,0.08)',
                          border: '1px solid #b088d4',
                          borderRadius: 6,
                          padding: '10px 12px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: '#b088d4',
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 4,
                          }}
                        >
                          Per Student
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: '#b088d4',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {fmtDollar(perStudent)}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#6b6157',
                            marginTop: 2,
                          }}
                        >
                          22% of budget ÷ ~1M students · middling outcomes
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#6b6157',
                  fontFamily: "'JetBrains Mono', monospace",
                  marginTop: 8,
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                The gap between avg pay and true cost is where the money
                "disappears": overtime ($2.9B/yr), employer payroll taxes,
                pension contributions funding 250K+ retirees (tax-exempt
                payouts), health benefits for current <em>and</em> retired
                workers ($100B unfunded liability).
              </div>
            </div>

            {/* Chart 4: Revenue Breakdown */}
            <SectionTitle>Revenue Composition</SectionTitle>
            <div
              style={{
                background: 'rgba(20,18,16,0.6)',
                border: '1px solid #2a2520',
                borderRadius: 8,
                padding: '16px 8px',
              }}
            >
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2520" />
                  <XAxis
                    dataKey="year"
                    tick={{
                      fill: '#6b6157',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <YAxis
                    tick={{
                      fill: '#6b6157',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono',
                    }}
                    tickFormatter={(v) => `${v}B`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="propertyTaxRev"
                    name="Property Tax"
                    stackId="1"
                    fill="#d4a556"
                    fillOpacity={0.6}
                    stroke="#d4a556"
                  />
                  <Area
                    type="monotone"
                    dataKey="personalIncomeTaxRev"
                    name="Income Tax"
                    stackId="1"
                    fill="#6ab0d4"
                    fillOpacity={0.6}
                    stroke="#6ab0d4"
                  />
                  <Area
                    type="monotone"
                    dataKey="corpRevenue"
                    name="Corporate Tax"
                    stackId="1"
                    fill="#b088d4"
                    fillOpacity={0.6}
                    stroke="#b088d4"
                  />
                  <Area
                    type="monotone"
                    dataKey="otherRev"
                    name="Other + State + Fed"
                    stackId="1"
                    fill="#5cb85c"
                    fillOpacity={0.4}
                    stroke="#5cb85c"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Tax burden table */}
            <SectionTitle>Total Tax Burden by Income Bracket</SectionTitle>
            <div
              style={{
                background: 'rgba(20,18,16,0.6)',
                border: '1px solid #2a2520',
                borderRadius: 8,
                padding: 16,
                overflowX: 'auto',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #3a342a' }}>
                    {[
                      'Bracket',
                      'Federal',
                      'State',
                      'City',
                      'Total Rate',
                      'Share of City Rev',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          color: '#8a7e6e',
                          fontWeight: 600,
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {brackets.map((b, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e1b16' }}>
                      <td
                        style={{
                          padding: '8px 10px',
                          color: '#c4b5a0',
                          whiteSpace: 'pre-line',
                          lineHeight: 1.3,
                        }}
                      >
                        {b.label}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#6b6157' }}>
                        {b.fedRate}%
                      </td>
                      <td style={{ padding: '8px 10px', color: '#6b6157' }}>
                        {b.stateRate}%
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          color:
                            b.cityRate > BASELINE.millionaireTaxRate
                              ? '#e85d4a'
                              : '#d4a556',
                          fontWeight:
                            b.cityRate > BASELINE.millionaireTaxRate
                              ? 700
                              : 400,
                        }}
                      >
                        {b.cityRate.toFixed(2)}%
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          color: '#f0e6d3',
                          fontWeight: 700,
                        }}
                      >
                        {b.totalRate}%
                      </td>
                      <td style={{ padding: '8px 10px', color: '#d4a556' }}>
                        {b.shareOfRevenue}%
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid #3a342a' }}>
                    <td
                      style={{
                        padding: '8px 10px',
                        color: '#b088d4',
                        fontWeight: 600,
                      }}
                    >
                      Corporations
                    </td>
                    <td style={{ padding: '8px 10px', color: '#6b6157' }}>
                      21%
                    </td>
                    <td style={{ padding: '8px 10px', color: '#6b6157' }}>
                      7.25%
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        color:
                          params.corpTaxRate > BASELINE.corpTaxRate
                            ? '#e85d4a'
                            : '#d4a556',
                        fontWeight:
                          params.corpTaxRate > BASELINE.corpTaxRate ? 700 : 400,
                      }}
                    >
                      {params.corpTaxRate.toFixed(2)}%
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        color: '#f0e6d3',
                        fontWeight: 700,
                      }}
                    >
                      {(21 + 7.25 + params.corpTaxRate).toFixed(1)}%
                    </td>
                    <td style={{ padding: '8px 10px', color: '#6b6157' }}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Final year breakdown */}
            <SectionTitle>FY{lastYear.year} Projected Breakdown</SectionTitle>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <StatBox
                label="Total Budget"
                value={fmt(lastYear.totalBudget)}
                color="#e85d4a"
              />
              <StatBox
                label="Total Revenue"
                value={fmt(lastYear.totalRevenue)}
                color="#5cb85c"
              />
              <StatBox
                label={`FY${lastYear.year} Gap`}
                value={fmt(finalGap)}
                sub="annual shortfall"
                color={finalGap > 0 ? '#e85d4a' : '#5cb85c'}
              />
              <StatBox
                label="Cumulative Gap"
                value={fmt(lastYear.cumulativeGap)}
                sub={`over ${params.yearsToProject} years`}
                color={lastYear.cumulativeGap > 0 ? '#e85d4a' : '#5cb85c'}
              />
              <div
                style={{
                  border: '2px solid #4a9de8',
                  borderRadius: 8,
                  padding: 8,
                  flex: '1 1 100%',
                  background: 'rgba(74,157,232,0.04)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#4a9de8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span>⬤ FIXED COSTS — {fixedCostPctFinal}% of budget</span>
                  <span
                    style={{
                      fontSize: 16,
                      color: fixedCostPctFinal > 75 ? '#e85d4a' : '#4a9de8',
                    }}
                  >
                    {fmt(lastYear.fixedCosts)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <StatBox
                    label="Compensation"
                    value={fmt(lastYear.salarySpend)}
                    sub={`${salaryPctFinal}% of budget`}
                    color="#6ab0d4"
                  />
                  <StatBox
                    label="Pensions"
                    value={fmt(lastYear.pensionSpend)}
                    sub={`${pensionPctFinal}% of budget`}
                    color="#b088d4"
                  />
                  <StatBox
                    label="Benefits"
                    value={fmt(lastYear.benefitsSpend)}
                    sub={`${benefitsPctFinal}% of budget`}
                    color="#e088a8"
                  />
                  <StatBox
                    label="Debt Service"
                    value={fmt(lastYear.debtService)}
                    sub={`${((lastYear.debtService / lastYear.totalBudget) * 100).toFixed(1)}% of budget`}
                    color="#e8a84a"
                  />
                </div>
              </div>
              <StatBox
                label="All Other Spending"
                value={fmt(lastYear.otherSpend)}
                sub={`${((lastYear.otherSpend / lastYear.totalBudget) * 100).toFixed(1)}% of budget — parks, transit, housing, services`}
                color="#6b6157"
              />
              {params.includeNewSpending && lastYear.newSpend > 0 && (
                <StatBox
                  label="New Commitments"
                  value={fmt(lastYear.newSpend)}
                  sub={`${((lastYear.newSpend / lastYear.totalBudget) * 100).toFixed(1)}% of budget — childcare, buses, housing, class size, etc.`}
                  color="#e85d4a"
                />
              )}
              <StatBox
                label="Property Tax Rev"
                value={fmt(lastYear.propertyTaxRev)}
                color="#d4a556"
              />
              <StatBox
                label="Income Tax Rev"
                value={fmt(lastYear.personalIncomeTaxRev)}
                color="#6ab0d4"
              />
              <StatBox
                label="Corporate Tax Rev"
                value={fmt(lastYear.corpRevenue)}
                color="#b088d4"
              />
              <StatBox
                label="Remaining Millionaires"
                value={fmtK(lastYear.millionaires)}
                sub={`started at ${fmtK(firstYear.millionaires)}`}
                color="#d4a556"
              />
              <StatBox
                label="Millionaire Exodus"
                value={fmtK(totalMillionaireLoss)}
                sub={`${((totalMillionaireLoss / firstYear.millionaires) * 100).toFixed(1)}% of base`}
                color={totalMillionaireLoss > 0 ? '#e8a84a' : '#5cb85c'}
              />
            </div>

            {/* Methodology note */}
            <div
              style={{
                marginTop: 28,
                padding: 14,
                background: 'rgba(20,18,16,0.6)',
                border: '1px solid #2a2520',
                borderRadius: 8,
                fontSize: 10,
                color: '#6b6157',
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: '#8a7e6e' }}>METHODOLOGY NOTE:</strong>{' '}
              This is a simplified model for illustrative purposes. Migration
              elasticity is based on academic literature (~1.5% out-migration
              per 1% tax increase, adjustable). Revenue projections assume Wall
              Street returns normalize. Pension growth reflects historical NYC
              actuarial trends. Benefits growth default of 8% reflects the 12.2%
              premium increase approved for FY2026 blended with long-term
              trends; the city's unfunded OPEB liability is ~$100B. Federal aid
              modeled as declining 2%/yr under current policy trajectory.
              Property tax revenue grows with assessed values at 2%/yr baseline.
              Starting figures derived from FY2025-2026 NYC budget data,
              Comptroller reports, CBC reports, and IBO analyses. The model does
              not account for recession scenarios, one-time federal shocks, or
              potential state bailouts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
