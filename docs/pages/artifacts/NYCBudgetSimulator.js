// content/pages/artifacts/NYCBudgetSimulator.jsx
import { useState, useMemo, useCallback } from "https://esm.sh/react";
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
  ReferenceLine
} from "https://esm.sh/recharts";
import { Fragment, jsx, jsxs } from "https://esm.sh/react/jsx-runtime";
var DEFAULTS = {
  otherSpendGrowth: 3,
  numMillionaires: 34e3,
  millionaireTaxRate: 3.876,
  corpTaxRate: 7.75,
  propertyTaxRate: 12.28,
  migrationSensitivity: 1.5,
  corpErosionSensitivity: 5,
  pensionGrowthRate: 5.5,
  benefitsGrowthRate: 8,
  salaryGrowthRate: 3.2,
  revenueGrowth: 2.8,
  yearsToProject: 10,
  includeNewSpending: false
};
var NEW_COMMITMENTS = [
  {
    label: "Class size mandate",
    desc: "6,000 new teachers to meet state cap (20-25 per class). $543M yr1 \u2192 $943M/yr.",
    amounts: [0.54, 0.94, 0.94, 0.94],
    type: "comp",
    source: "Chalkbeat / NYC DOE"
  },
  {
    label: "Universal childcare (6wk\u20135yr)",
    desc: "Campaign est. ~$6B/yr at full scale. Phases in: 2-Care launch, expand 3K, then infants. State funds first 2 yrs partially.",
    amounts: [1, 2.5, 4, 6],
    type: "comp",
    source: "Mamdani campaign / CNN"
  },
  {
    label: "Free buses",
    desc: "$700-800M/yr MTA revenue backfill. Not in preliminary budget \u2014 deferred to April.",
    amounts: [0, 0.8, 0.8, 0.8],
    type: "other",
    source: "Vital City / MTA"
  },
  {
    label: "Affordable housing program",
    desc: "$100B total ($70B borrowed). Debt service on municipal bonds phases in.",
    amounts: [0.5, 1.5, 3, 4.5],
    type: "debt",
    source: "Mamdani campaign"
  },
  {
    label: "Mental health department",
    desc: "New standalone dept for crisis response. $1B at full scale.",
    amounts: [0.3, 0.7, 1, 1],
    type: "comp",
    source: "Mamdani campaign"
  },
  {
    label: "Parks to 1% of budget",
    desc: "Campaign pledge. Current: 0.57%. Gap: $536M\u2013$767M.",
    amounts: [0.2, 0.4, 0.6, 0.7],
    type: "other",
    source: "THE CITY"
  },
  {
    label: "Libraries to 0.5%",
    desc: "Current: 0.39%. Mamdani endorsed target.",
    amounts: [0.05, 0.1, 0.14, 0.14],
    type: "other",
    source: "THE CITY"
  },
  {
    label: "Misc (equity offices, food security, legal, immigrant services)",
    desc: "Racial equity +42%, food baseline to $53.6M, 200 new attorneys, expanded immigrant legal aid.",
    amounts: [0.15, 0.25, 0.3, 0.3],
    type: "other",
    source: "NYC budget / NYIC"
  }
];
var BASELINE = {
  millionaireTaxRate: 3.876,
  corpTaxRate: 7.75,
  propertyTaxRate: 12.28
};
var fmt = (n) => {
  if (Math.abs(n) >= 1e3)
    return `$${(n / 1e3).toFixed(1)}T`;
  if (Math.abs(n) >= 1)
    return `$${n.toFixed(1)}B`;
  return `$${(n * 1e3).toFixed(0)}M`;
};
var fmtK = (n) => n.toLocaleString();
var formatDescription = (desc) => {
  if (!desc)
    return null;
  const parts = desc.split(/(Current:|Mamdani:)/g);
  return parts.map((part, i) => {
    if (part === "Current:")
      return /* @__PURE__ */ jsx("span", {
        style: { color: "#5cb85c", fontWeight: 700, fontStyle: "normal" },
        children: part
      }, i);
    if (part === "Mamdani:")
      return /* @__PURE__ */ jsx("span", {
        style: { color: "#e85d4a", fontWeight: 700, fontStyle: "normal" },
        children: part
      }, i);
    return /* @__PURE__ */ jsx("span", {
      children: part
    }, i);
  });
};
var logToLinear = (value, min, max) => {
  return Math.round(1e3 * Math.log(value / min) / Math.log(max / min));
};
var linearToLog = (position, min, max) => {
  return min * Math.pow(max / min, position / 1e3);
};
var Knob = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  description,
  logScale,
  sources
}) => {
  const [showSources, setShowSources] = useState(false);
  const sliderVal = logScale ? logToLinear(value, min, max) : void 0;
  const handleChange = logScale ? (e) => {
    const raw = linearToLog(parseFloat(e.target.value), min, max);
    const factor = 1 / step;
    onChange(Math.round(raw * factor) / factor);
  } : (e) => onChange(parseFloat(e.target.value));
  return /* @__PURE__ */ jsxs("div", {
    style: { marginBottom: 14 },
    children: [
      /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 3
        },
        children: [
          /* @__PURE__ */ jsxs("label", {
            style: {
              fontSize: 11,
              fontWeight: 600,
              color: "#c4b5a0",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', monospace",
              display: "flex",
              alignItems: "center",
              gap: 5
            },
            children: [
              label,
              sources && /* @__PURE__ */ jsx("span", {
                onClick: (e) => {
                  e.preventDefault();
                  setShowSources(!showSources);
                },
                style: {
                  cursor: "pointer",
                  fontSize: 10,
                  color: showSources ? "#d4a556" : "#6b6157",
                  fontWeight: 400,
                  userSelect: "none"
                },
                title: "Show sources",
                children: "\u24D8"
              })
            ]
          }),
          /* @__PURE__ */ jsxs("span", {
            style: {
              fontSize: 14,
              fontWeight: 700,
              color: "#f0e6d3",
              fontFamily: "'JetBrains Mono', monospace"
            },
            children: [
              typeof value === "number" && value % 1 !== 0 ? value.toFixed(2) : value.toLocaleString(),
              unit
            ]
          })
        ]
      }),
      description && /* @__PURE__ */ jsx("div", {
        style: {
          fontSize: 10,
          color: "#8a7e6e",
          marginBottom: 4,
          fontStyle: "italic"
        },
        children: formatDescription(description)
      }),
      showSources && sources && /* @__PURE__ */ jsx("div", {
        style: {
          fontSize: 10,
          color: "#a89880",
          background: "rgba(20,18,16,0.8)",
          border: "1px solid #3a342a",
          borderRadius: 4,
          padding: "6px 8px",
          marginBottom: 4,
          lineHeight: 1.6
        },
        children: sources.map((s, i) => /* @__PURE__ */ jsxs("div", {
          style: { marginBottom: i < sources.length - 1 ? 4 : 0 },
          children: [
            s.text,
            s.url && /* @__PURE__ */ jsxs(Fragment, {
              children: [
                " ",
                "\u2014",
                " ",
                /* @__PURE__ */ jsx("a", {
                  href: s.url,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  style: { color: "#d4a556", textDecoration: "underline" },
                  children: s.linkLabel || "source"
                })
              ]
            })
          ]
        }, i))
      }),
      /* @__PURE__ */ jsx("input", {
        type: "range",
        min: logScale ? 0 : min,
        max: logScale ? 1e3 : max,
        step: logScale ? 1 : step,
        value: logScale ? sliderVal : value,
        onChange: handleChange,
        style: {
          width: "100%",
          accentColor: "#d4a556",
          height: 3,
          cursor: "pointer"
        }
      }),
      /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          fontSize: 9,
          color: "#6b6157"
        },
        children: [
          /* @__PURE__ */ jsxs("span", {
            children: [
              min,
              unit
            ]
          }),
          /* @__PURE__ */ jsxs("span", {
            children: [
              max,
              unit
            ]
          })
        ]
      })
    ]
  });
};
var StatBox = ({ label, value, sub, color, labelColor }) => /* @__PURE__ */ jsxs("div", {
  style: {
    background: "rgba(30,27,22,0.7)",
    border: "1px solid #3a342a",
    borderRadius: 6,
    padding: "10px 12px",
    minWidth: 140,
    flex: 1
  },
  children: [
    /* @__PURE__ */ jsx("div", {
      style: {
        fontSize: 10,
        color: labelColor || "#8a7e6e",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 4,
        fontWeight: labelColor ? 700 : 400
      },
      children: label
    }),
    /* @__PURE__ */ jsx("div", {
      style: {
        fontSize: 20,
        fontWeight: 700,
        color: color || "#f0e6d3",
        fontFamily: "'JetBrains Mono', monospace"
      },
      children: value
    }),
    sub && /* @__PURE__ */ jsx("div", {
      style: { fontSize: 10, color: "#6b6157", marginTop: 2 },
      children: sub
    })
  ]
});
var SectionTitle = ({ children }) => /* @__PURE__ */ jsx("h3", {
  style: {
    fontSize: 13,
    fontWeight: 700,
    color: "#d4a556",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 12,
    marginTop: 24,
    borderBottom: "1px solid #3a342a",
    paddingBottom: 8
  },
  children
});
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
    includeNewSpending
  } = params;
  const currentYear = 2026;
  const data = [];
  let currentMillionaires = numMillionaires;
  const startingPropertyTaxRev = 35;
  const startingIncomePersonalRev = 16.5;
  const startingCorpTaxRev = 8.5;
  const startingOtherRev = 20;
  const startingStateAid = 20.9;
  const startingFedAid = 11;
  const startingSalary = 46.5;
  const startingPension = 10.5;
  const startingBenefits = 10.4;
  const startingDebtService = 7.5;
  const startingOtherSpend = 52.1;
  const millionaireShareOfIncomeTax = 0.4;
  const avgMillionaireIncome = 4.2;
  const taxDelta = millionaireTaxRate - BASELINE.millionaireTaxRate;
  const propDelta = propertyTaxRate - BASELINE.propertyTaxRate;
  for (let i = 0; i <= yearsToProject; i++) {
    const year = currentYear + i;
    const t = i;
    const annualMigrationRate = taxDelta > 0 ? migrationSensitivity * taxDelta * 0.012 + (propDelta > 0 ? propDelta * 3e-3 : 0) : Math.max(taxDelta * 5e-3, -0.01);
    if (i > 0) {
      const netMigration = Math.round(
        currentMillionaires * annualMigrationRate
      );
      currentMillionaires = Math.max(5e3, currentMillionaires - netMigration);
    }
    const millionaireRatio = currentMillionaires / numMillionaires;
    const incomeFromMillionaires = currentMillionaires * avgMillionaireIncome * (millionaireTaxRate / 100) / 1e3;
    const incomeFromOthers = startingIncomePersonalRev * (1 - millionaireShareOfIncomeTax) * Math.pow(1 + revenueGrowth / 100, t);
    const personalIncomeTaxRev = incomeFromMillionaires + incomeFromOthers;
    const corpRateDelta = corpTaxRate - BASELINE.corpTaxRate;
    const totalBaseChange = 1 - corpErosionSensitivity / 100 * corpRateDelta;
    const phaseIn = Math.min(1, 0.4 + 0.6 * (t / 5));
    const effectiveBase = corpRateDelta > 0 ? 1 - (1 - totalBaseChange) * phaseIn : 1 + (totalBaseChange - 1) * phaseIn;
    const corpRevenue = startingCorpTaxRev * (corpTaxRate / BASELINE.corpTaxRate) * Math.pow(1 + revenueGrowth / 100, t) * Math.max(0.3, effectiveBase);
    const propertyTaxRev = startingPropertyTaxRev * (propertyTaxRate / BASELINE.propertyTaxRate) * Math.pow(1 + 0.02, t);
    const otherRev = startingOtherRev * Math.pow(1 + revenueGrowth / 100, t);
    const stateAid = startingStateAid * Math.pow(1 + 0.015, t);
    const fedAid = startingFedAid * Math.pow(1 - 0.02, t);
    const totalRevenue = personalIncomeTaxRev + corpRevenue + propertyTaxRev + otherRev + stateAid + fedAid;
    const salarySpend = startingSalary * Math.pow(1 + salaryGrowthRate / 100, t);
    const pensionSpend = startingPension * Math.pow(1 + pensionGrowthRate / 100, t);
    const benefitsSpend = startingBenefits * Math.pow(1 + benefitsGrowthRate / 100, t);
    const debtService = startingDebtService * Math.pow(1 + 0.03, t);
    const fixedCosts = salarySpend + pensionSpend + benefitsSpend + debtService;
    const otherSpend = startingOtherSpend * Math.pow(1 + otherSpendGrowth / 100, t);
    let newSpendTotal = 0;
    if (includeNewSpending && t > 0) {
      NEW_COMMITMENTS.forEach((c) => {
        const yr = Math.min(t - 1, 3);
        const amt = c.amounts[yr];
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
      fixedCostPct: parseFloat((fixedCosts / totalBudget * 100).toFixed(1)),
      otherSpend: parseFloat(Math.max(0, otherSpend).toFixed(1)),
      newSpend: parseFloat(newSpendTotal.toFixed(1)),
      gap: parseFloat(gap.toFixed(1)),
      millionaires: currentMillionaires,
      millionaireRevenue: parseFloat(incomeFromMillionaires.toFixed(1)),
      corpRevenue: parseFloat(corpRevenue.toFixed(1)),
      propertyTaxRev: parseFloat(propertyTaxRev.toFixed(1)),
      personalIncomeTaxRev: parseFloat(personalIncomeTaxRev.toFixed(1)),
      otherRev: parseFloat((otherRev + stateAid + fedAid).toFixed(1)),
      cumulativeGap: 0
    });
  }
  let cum = 0;
  for (const d of data) {
    cum += d.gap;
    d.cumulativeGap = parseFloat(cum.toFixed(1));
  }
  return data;
}
var chartMargin = { top: 10, right: 20, left: 10, bottom: 5 };
var GHOST_PAIRS = {
  ghostBudget: "Total Spend",
  ghostRevenue: "Total Revenue",
  ghostFixed: "\u2B24 FIXED COSTS",
  ghostGap: "Budget Gap",
  ghostMillionaires: "Millionaires",
  ghostMillionaireRev: "Millionaire Tax Rev"
};
var CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload)
    return null;
  const ghosts = {};
  const reals = [];
  payload.forEach((p) => {
    if (p.dataKey && p.dataKey.startsWith("ghost")) {
      ghosts[p.dataKey] = p;
    } else {
      reals.push(p);
    }
  });
  const ghostForReal = {};
  Object.entries(GHOST_PAIRS).forEach(([ghostKey, realName]) => {
    if (ghosts[ghostKey])
      ghostForReal[realName] = ghosts[ghostKey];
  });
  return /* @__PURE__ */ jsxs("div", {
    style: {
      background: "#1e1b16",
      border: "1px solid #3a342a",
      borderRadius: 6,
      padding: "8px 12px",
      fontSize: 11,
      fontFamily: "'JetBrains Mono', monospace"
    },
    children: [
      /* @__PURE__ */ jsx("div", {
        style: { color: "#d4a556", fontWeight: 700, marginBottom: 4 },
        children: label
      }),
      reals.map((p, i) => {
        const ghost = ghostForReal[p.name];
        const fmtVal = (v) => typeof v === "number" && v > 500 ? fmtK(v) : fmt(v);
        return /* @__PURE__ */ jsxs("div", {
          style: { marginBottom: ghost ? 1 : 2 },
          children: [
            /* @__PURE__ */ jsxs("div", {
              style: { color: p.color },
              children: [
                p.name,
                ": ",
                fmtVal(p.value)
              ]
            }),
            ghost && fmtVal(ghost.value) !== fmtVal(p.value) && /* @__PURE__ */ jsxs("div", {
              style: {
                color: ghost.color,
                opacity: 0.35,
                fontSize: 10,
                paddingLeft: 8
              },
              children: [
                "baseline: ",
                fmtVal(ghost.value)
              ]
            })
          ]
        }, i);
      })
    ]
  });
};
function NYCBudgetSimulator() {
  const [params, setParams] = useState(DEFAULTS);
  const [showMamdani, setShowMamdani] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [newSpendInfoOpen, setNewSpendInfoOpen] = useState(false);
  const set = useCallback(
    (key) => (val) => setParams((p) => ({ ...p, [key]: val })),
    []
  );
  const applyMamdaniTax = () => {
    if (showMamdani) {
      setParams((p) => ({
        ...p,
        millionaireTaxRate: DEFAULTS.millionaireTaxRate,
        corpTaxRate: DEFAULTS.corpTaxRate,
        propertyTaxRate: DEFAULTS.propertyTaxRate
      }));
      setShowMamdani(false);
    } else {
      setParams((p) => ({
        ...p,
        millionaireTaxRate: 5.876,
        corpTaxRate: 11.5,
        propertyTaxRate: 13.45
      }));
      setShowMamdani(true);
    }
  };
  const applyMamdaniSpending = () => {
    setParams((p) => ({
      ...p,
      includeNewSpending: !p.includeNewSpending
    }));
  };
  const resetDefaults = () => {
    setParams(DEFAULTS);
    setShowMamdani(false);
    setNewSpendInfoOpen(false);
  };
  const data = useMemo(() => simulate(params), [params]);
  const baselineData = useMemo(() => simulate(DEFAULTS), []);
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
        ghostMillionaireRev: b.millionaireRevenue
      };
    });
  }, [data, baselineData]);
  const lastYear = data[data.length - 1];
  const firstYear = data[0];
  const totalMillionaireLoss = firstYear.millionaires - lastYear.millionaires;
  const finalGap = lastYear.gap;
  const pensionPctFinal = (lastYear.pensionSpend / lastYear.totalBudget * 100).toFixed(1);
  const benefitsPctFinal = (lastYear.benefitsSpend / lastYear.totalBudget * 100).toFixed(1);
  const salaryPctFinal = (lastYear.salarySpend / lastYear.totalBudget * 100).toFixed(1);
  const fixedCostPctFinal = lastYear.fixedCostPct;
  const brackets = useMemo(() => {
    const cityRate = params.millionaireTaxRate;
    const stateRates = { bottom50: 4, middle: 6.5, top10: 8.82, top1: 10.9 };
    const fedRates = { bottom50: 10, middle: 22, top10: 32, top1: 37 };
    return [
      {
        bracket: "Bottom 50%\n(<$50K)",
        cityRate: 3.078,
        stateRate: stateRates.bottom50,
        fedRate: fedRates.bottom50,
        shareOfRevenue: 0.2
      },
      {
        bracket: "Middle\n($50K-$200K)",
        cityRate: 3.5,
        stateRate: stateRates.middle,
        fedRate: fedRates.middle,
        shareOfRevenue: 18.5
      },
      {
        bracket: "Top 10%\n($200K-$1M)",
        cityRate: 3.876,
        stateRate: stateRates.top10,
        fedRate: fedRates.top10,
        shareOfRevenue: 42
      },
      {
        bracket: "Top 1%\n(>$1M)",
        cityRate,
        stateRate: stateRates.top1,
        fedRate: fedRates.top1,
        shareOfRevenue: 39.3
      }
    ].map((b) => ({
      ...b,
      totalRate: parseFloat((b.cityRate + b.stateRate + b.fedRate).toFixed(1)),
      label: b.bracket
    }));
  }, [params.millionaireTaxRate]);
  return /* @__PURE__ */ jsxs("div", {
    style: {
      background: "#141210",
      color: "#f0e6d3",
      minHeight: "100vh",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      padding: "24px 20px"
    },
    children: [
      /* @__PURE__ */ jsx("link", {
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap",
        rel: "stylesheet"
      }),
      /* @__PURE__ */ jsxs("div", {
        style: { maxWidth: 1200, margin: "0 auto" },
        children: [
          /* @__PURE__ */ jsxs("div", {
            style: {
              borderBottom: "2px solid #d4a556",
              paddingBottom: 16,
              marginBottom: 24
            },
            children: [
              /* @__PURE__ */ jsx("h1", {
                style: {
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#d4a556",
                  letterSpacing: "0.08em",
                  margin: 0
                },
                children: "NYC FISCAL DEATH SPIRAL SIMULATOR"
              }),
              /* @__PURE__ */ jsxs("p", {
                style: {
                  fontSize: 12,
                  color: "#8a7e6e",
                  margin: "6px 0 0 0",
                  fontFamily: "'JetBrains Mono', monospace"
                },
                children: [
                  "Modeling the structural trap of progressive municipal governance \xB7 FY2026\u2013",
                  2026 + params.yearsToProject
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            style: {
              background: "rgba(212,165,86,0.06)",
              border: "1px solid #3a342a",
              borderLeft: "3px solid #d4a556",
              borderRadius: 6,
              marginBottom: 20,
              overflow: "hidden"
            },
            children: [
              /* @__PURE__ */ jsxs("button", {
                onClick: () => setInfoOpen(!infoOpen),
                style: {
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  color: "#d4a556"
                },
                children: [
                  /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "0.06em"
                    },
                    children: "WHAT YOU'RE LOOKING AT"
                  }),
                  /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "#8a7e6e",
                      transform: infoOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s"
                    },
                    children: "\u25BC"
                  })
                ]
              }),
              infoOpen && /* @__PURE__ */ jsxs("div", {
                style: {
                  padding: "0 16px 14px 16px",
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "#c4b5a0"
                },
                children: [
                  /* @__PURE__ */ jsxs("p", {
                    style: { margin: "0 0 10px 0" },
                    children: [
                      "NYC spends more per capita than almost any city on earth \u2014 comparable to the ",
                      /* @__PURE__ */ jsx("em", {
                        children: "entire state of Florida"
                      }),
                      " with a third the population \u2014 yet delivers middling outcomes. The city spends",
                      " ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#e85d4a", fontWeight: 600 },
                        children: "$36,000 per student"
                      }),
                      " ",
                      "(2.3\xD7 the national average) for below-average test scores."
                    ]
                  }),
                  /* @__PURE__ */ jsxs("p", {
                    style: { margin: "0 0 10px 0" },
                    children: [
                      "The core problem:",
                      " ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#e088a8", fontWeight: 600 },
                        children: "salaries"
                      }),
                      ",",
                      " ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#b088d4", fontWeight: 600 },
                        children: "pensions"
                      }),
                      ", and",
                      " ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#e088a8", fontWeight: 600 },
                        children: "health benefits"
                      }),
                      " ",
                      "for 302,000 active city employees ",
                      /* @__PURE__ */ jsx("em", {
                        children: "and 250,000+ retirees"
                      }),
                      " ",
                      "consume an ever-growing share of the budget. These are",
                      " ",
                      /* @__PURE__ */ jsx("em", {
                        children: "exactly"
                      }),
                      " the costs a socialist coalition built on public-sector unions cannot cut. The unfunded retiree healthcare liability alone is",
                      " ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#e85d4a", fontWeight: 600 },
                        children: "~$100 billion"
                      }),
                      ". Pension payouts are exempt from state and local tax."
                    ]
                  }),
                  /* @__PURE__ */ jsxs("p", {
                    style: { margin: "0 0 10px 0" },
                    children: [
                      "Watch the",
                      " ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#4a9de8", fontWeight: 700 },
                        children: "\u2B24 FIXED COSTS % BUDGET"
                      }),
                      " ",
                      "stat. As personnel costs compound faster than revenue, they crowd out everything else \u2014 parks, transit, housing, actual services. The city increasingly exists to pay its own employees, not to serve residents. Raising taxes on the rich provides a one-time sugar hit, but the spending treadmill outruns it within years, especially as millionaires leave."
                    ]
                  }),
                  /* @__PURE__ */ jsx("p", {
                    style: {
                      margin: 0,
                      fontSize: 12,
                      color: "#8a7e6e",
                      fontStyle: "italic"
                    },
                    children: 'Use the knobs to test different scenarios. Hit "Apply Mamdani Proposal" to see his plan in action.'
                  })
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              gap: 10,
              marginBottom: 10,
              flexWrap: "wrap",
              alignItems: "center"
            },
            children: [
              /* @__PURE__ */ jsxs("button", {
                onClick: applyMamdaniTax,
                style: {
                  background: showMamdani ? "#d4a556" : "transparent",
                  color: showMamdani ? "#141210" : "#d4a556",
                  border: "1px solid #d4a556",
                  borderRadius: 4,
                  padding: "6px 14px",
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.05em"
                },
                children: [
                  showMamdani ? "\u2713 " : "",
                  "APPLY MAMDANI TAX PROPOSAL"
                ]
              }),
              /* @__PURE__ */ jsxs("button", {
                onClick: applyMamdaniSpending,
                style: {
                  background: params.includeNewSpending ? "#e85d4a" : "transparent",
                  color: params.includeNewSpending ? "#141210" : "#e85d4a",
                  border: "1px solid #e85d4a",
                  borderRadius: 4,
                  padding: "6px 14px",
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.05em"
                },
                children: [
                  params.includeNewSpending ? "\u2713 " : "",
                  "APPLY MAMDANI SPENDING PROPOSAL"
                ]
              }),
              /* @__PURE__ */ jsx("button", {
                onClick: () => setNewSpendInfoOpen(!newSpendInfoOpen),
                style: {
                  background: "transparent",
                  color: "#e85d4a",
                  border: "1px solid #3a342a",
                  borderRadius: 4,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  cursor: "pointer"
                },
                children: "\u24D8 DETAILS"
              }),
              /* @__PURE__ */ jsx("button", {
                onClick: resetDefaults,
                style: {
                  background: "transparent",
                  color: "#8a7e6e",
                  border: "1px solid #3a342a",
                  borderRadius: 4,
                  padding: "6px 14px",
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  cursor: "pointer"
                },
                children: "RESET TO CURRENT"
              })
            ]
          }),
          newSpendInfoOpen && /* @__PURE__ */ jsxs("div", {
            style: {
              background: "rgba(30,27,22,0.8)",
              border: "1px solid #3a342a",
              borderRadius: 6,
              padding: "14px 16px",
              marginBottom: 16,
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.7
            },
            children: [
              /* @__PURE__ */ jsx("div", {
                style: {
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#d4a556",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                  textTransform: "uppercase"
                },
                children: "Mamdani's Tax Proposals"
              }),
              /* @__PURE__ */ jsx("div", {
                style: { fontSize: 11, color: "#8a7e6e", marginBottom: 12 },
                children: "Requires Albany approval. Hochul has flatly rejected tax hikes. If blocked, Mamdani's fallback is the 9.5% property tax increase."
              }),
              /* @__PURE__ */ jsxs("table", {
                style: {
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11,
                  marginBottom: 16
                },
                children: [
                  /* @__PURE__ */ jsx("thead", {
                    children: /* @__PURE__ */ jsxs("tr", {
                      style: { borderBottom: "1px solid #3a342a" },
                      children: [
                        /* @__PURE__ */ jsx("th", {
                          style: {
                            textAlign: "left",
                            padding: "6px 8px",
                            color: "#c4b5a0",
                            fontWeight: 600
                          },
                          children: "Tax"
                        }),
                        /* @__PURE__ */ jsx("th", {
                          style: {
                            textAlign: "right",
                            padding: "6px 8px",
                            color: "#c4b5a0",
                            fontWeight: 600
                          },
                          children: "Current"
                        }),
                        /* @__PURE__ */ jsx("th", {
                          style: {
                            textAlign: "right",
                            padding: "6px 8px",
                            color: "#c4b5a0",
                            fontWeight: 600
                          },
                          children: "Proposed"
                        }),
                        /* @__PURE__ */ jsx("th", {
                          style: {
                            textAlign: "right",
                            padding: "6px 8px",
                            color: "#c4b5a0",
                            fontWeight: 600
                          },
                          children: "Combined*"
                        }),
                        /* @__PURE__ */ jsx("th", {
                          style: {
                            textAlign: "right",
                            padding: "6px 8px",
                            color: "#c4b5a0",
                            fontWeight: 600
                          },
                          children: "Est. Revenue"
                        }),
                        /* @__PURE__ */ jsx("th", {
                          style: {
                            textAlign: "left",
                            padding: "6px 8px",
                            color: "#c4b5a0",
                            fontWeight: 600
                          },
                          children: "Notes"
                        })
                      ]
                    })
                  }),
                  /* @__PURE__ */ jsxs("tbody", {
                    children: [
                      /* @__PURE__ */ jsxs("tr", {
                        style: { borderBottom: "1px solid #2a2520" },
                        children: [
                          /* @__PURE__ */ jsx("td", {
                            style: { padding: "6px 8px", color: "#f0e6d3" },
                            children: "City income tax (>$1M)"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#5cb85c"
                            },
                            children: "3.876%"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#e85d4a",
                              fontWeight: 700
                            },
                            children: "5.876%"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#e85d4a"
                            },
                            children: "~16.8%"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#d4a556"
                            },
                            children: "~$4B/yr"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              padding: "6px 8px",
                              color: "#6b6157",
                              fontSize: 10
                            },
                            children: "+2pp on ~33K filers. Combined fed+state+city = highest in US. SALT cap makes non-deductible."
                          })
                        ]
                      }),
                      /* @__PURE__ */ jsxs("tr", {
                        style: { borderBottom: "1px solid #2a2520" },
                        children: [
                          /* @__PURE__ */ jsx("td", {
                            style: { padding: "6px 8px", color: "#f0e6d3" },
                            children: "Corporate tax"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#5cb85c"
                            },
                            children: "7.75%"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#e85d4a",
                              fontWeight: 700
                            },
                            children: "11.5%"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#e85d4a"
                            },
                            children: "~38.8%"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#d4a556"
                            },
                            children: "~$5B/yr"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              padding: "6px 8px",
                              color: "#6b6157",
                              fontSize: 10
                            },
                            children: "Combined fed (21%) + state (7.25%) + city. Subject to base erosion via profit-shifting."
                          })
                        ]
                      }),
                      /* @__PURE__ */ jsxs("tr", {
                        style: { borderBottom: "1px solid #2a2520" },
                        children: [
                          /* @__PURE__ */ jsx("td", {
                            style: { padding: "6px 8px", color: "#f0e6d3" },
                            children: "Property tax (fallback)"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#5cb85c"
                            },
                            children: "12.28%"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#e85d4a",
                              fontWeight: 700
                            },
                            children: "13.45%"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#6b6157"
                            },
                            children: "\u2014"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#d4a556"
                            },
                            children: "~$3.7B/yr"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              padding: "6px 8px",
                              color: "#6b6157",
                              fontSize: 10
                            },
                            children: "9.5% hike. Hits 3M+ residential units, 100K commercial. Landlords pass to tenants \u2014 contradicts rent freeze."
                          })
                        ]
                      }),
                      /* @__PURE__ */ jsxs("tr", {
                        style: { borderTop: "2px solid #d4a556" },
                        children: [
                          /* @__PURE__ */ jsx("td", {
                            colSpan: 4,
                            style: {
                              padding: "6px 8px",
                              color: "#d4a556",
                              fontWeight: 700
                            },
                            children: "TOTAL ESTIMATED NEW TAX REVENUE (static)"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              textAlign: "right",
                              padding: "6px 8px",
                              color: "#d4a556",
                              fontWeight: 700
                            },
                            children: "~$9B/yr"
                          }),
                          /* @__PURE__ */ jsx("td", {
                            style: {
                              padding: "6px 8px",
                              color: "#6b6157",
                              fontSize: 10
                            },
                            children: "Before migration & base erosion"
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),
              /* @__PURE__ */ jsx("div", {
                style: {
                  fontSize: 10,
                  color: "#6b6157",
                  marginBottom: 16,
                  fontStyle: "italic"
                },
                children: "* Combined = federal + NYS + NYC. The SALT deduction cap ($10K) means state/local taxes are effectively non-deductible for high earners, increasing the real burden and migration incentive. NY's share of US millionaires fell from 12.7% (2010) to 8.7% (2022)."
              }),
              /* @__PURE__ */ jsxs("div", {
                style: { borderTop: "1px solid #3a342a", paddingTop: 14 },
                children: [
                  /* @__PURE__ */ jsx("div", {
                    style: {
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#e85d4a",
                      letterSpacing: "0.06em",
                      marginBottom: 10,
                      textTransform: "uppercase"
                    },
                    children: "Mamdani's New Spending Commitments"
                  }),
                  /* @__PURE__ */ jsx("div", {
                    style: { fontSize: 11, color: "#8a7e6e", marginBottom: 12 },
                    children: "Not all items are in the preliminary budget \u2014 free buses, grocery stores, and the mental health department are deferred to the April executive budget. Housing is a $100B capital plan ($70B borrowed) modeled here as debt service. Childcare cost is the campaign's own estimate at full scale."
                  }),
                  /* @__PURE__ */ jsxs("table", {
                    style: {
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 11
                    },
                    children: [
                      /* @__PURE__ */ jsx("thead", {
                        children: /* @__PURE__ */ jsxs("tr", {
                          style: { borderBottom: "1px solid #3a342a" },
                          children: [
                            /* @__PURE__ */ jsx("th", {
                              style: {
                                textAlign: "left",
                                padding: "6px 8px",
                                color: "#c4b5a0",
                                fontWeight: 600
                              },
                              children: "Program"
                            }),
                            /* @__PURE__ */ jsx("th", {
                              style: {
                                textAlign: "right",
                                padding: "6px 8px",
                                color: "#c4b5a0",
                                fontWeight: 600
                              },
                              children: "Yr 1"
                            }),
                            /* @__PURE__ */ jsx("th", {
                              style: {
                                textAlign: "right",
                                padding: "6px 8px",
                                color: "#c4b5a0",
                                fontWeight: 600
                              },
                              children: "Yr 2"
                            }),
                            /* @__PURE__ */ jsx("th", {
                              style: {
                                textAlign: "right",
                                padding: "6px 8px",
                                color: "#c4b5a0",
                                fontWeight: 600
                              },
                              children: "Yr 3"
                            }),
                            /* @__PURE__ */ jsx("th", {
                              style: {
                                textAlign: "right",
                                padding: "6px 8px",
                                color: "#c4b5a0",
                                fontWeight: 600
                              },
                              children: "Yr 4+"
                            }),
                            /* @__PURE__ */ jsx("th", {
                              style: {
                                textAlign: "left",
                                padding: "6px 8px",
                                color: "#c4b5a0",
                                fontWeight: 600
                              },
                              children: "Source"
                            })
                          ]
                        })
                      }),
                      /* @__PURE__ */ jsxs("tbody", {
                        children: [
                          NEW_COMMITMENTS.map((c, i) => /* @__PURE__ */ jsxs("tr", {
                            style: { borderBottom: "1px solid #2a2520" },
                            children: [
                              /* @__PURE__ */ jsxs("td", {
                                style: { padding: "6px 8px", color: "#f0e6d3" },
                                children: [
                                  /* @__PURE__ */ jsx("div", {
                                    children: c.label
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 10,
                                      color: "#6b6157",
                                      fontStyle: "italic"
                                    },
                                    children: c.desc
                                  })
                                ]
                              }),
                              c.amounts.map((a, j) => /* @__PURE__ */ jsxs("td", {
                                style: {
                                  textAlign: "right",
                                  padding: "6px 8px",
                                  color: a > 0 ? "#e85d4a" : "#3a342a",
                                  fontWeight: 600
                                },
                                children: [
                                  "$",
                                  a.toFixed(1),
                                  "B"
                                ]
                              }, j)),
                              /* @__PURE__ */ jsx("td", {
                                style: {
                                  padding: "6px 8px",
                                  color: "#6b6157",
                                  fontSize: 10
                                },
                                children: c.source
                              })
                            ]
                          }, i)),
                          /* @__PURE__ */ jsxs("tr", {
                            style: { borderTop: "2px solid #e85d4a" },
                            children: [
                              /* @__PURE__ */ jsx("td", {
                                style: {
                                  padding: "6px 8px",
                                  color: "#e85d4a",
                                  fontWeight: 700
                                },
                                children: "TOTAL NEW SPENDING"
                              }),
                              [0, 1, 2, 3].map((yr) => /* @__PURE__ */ jsxs("td", {
                                style: {
                                  textAlign: "right",
                                  padding: "6px 8px",
                                  color: "#e85d4a",
                                  fontWeight: 700
                                },
                                children: [
                                  "$",
                                  NEW_COMMITMENTS.reduce(
                                    (s, c) => s + c.amounts[yr],
                                    0
                                  ).toFixed(1),
                                  "B"
                                ]
                              }, yr)),
                              /* @__PURE__ */ jsx("td", {})
                            ]
                          })
                        ]
                      })
                    ]
                  }),
                  /* @__PURE__ */ jsx("div", {
                    style: {
                      fontSize: 10,
                      color: "#6b6157",
                      marginTop: 8,
                      fontStyle: "italic"
                    },
                    children: "Type breakdown: Comp (teachers, childcare/MH workers) adds to personnel costs and generates future pension/benefit obligations. Program transfers (buses, parks, libraries) are non-personnel. Housing modeled as incremental debt service on $70B in bonds. All items grow at 3%/yr after reaching full phase-in."
                  })
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            style: { display: "flex", gap: 24, flexWrap: "wrap" },
            children: [
              /* @__PURE__ */ jsxs("div", {
                style: {
                  width: 280,
                  flexShrink: 0,
                  background: "rgba(20,18,16,0.8)",
                  border: "1px solid #2a2520",
                  borderRadius: 8,
                  padding: 16
                },
                children: [
                  /* @__PURE__ */ jsx("div", {
                    style: {
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#d4a556",
                      letterSpacing: "0.1em",
                      fontFamily: "'JetBrains Mono', monospace",
                      marginBottom: 16,
                      textTransform: "uppercase"
                    },
                    children: "Controls"
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Other Spend Growth",
                    value: params.otherSpendGrowth,
                    onChange: set("otherSpendGrowth"),
                    min: 0,
                    max: 10,
                    step: 0.1,
                    unit: "%",
                    description: "Parks, transit, housing, education, services \u2014 everything outside fixed costs",
                    sources: [
                      {
                        text: "NYC OMB FY2026 budget: non-personnel services historically grow 2-4%/yr",
                        url: "https://www.nyc.gov/site/omb/publications/finplan01-25.page",
                        linkLabel: "NYC OMB"
                      }
                    ]
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Millionaires",
                    value: params.numMillionaires,
                    onChange: set("numMillionaires"),
                    min: 1e4,
                    max: 6e4,
                    step: 1e3,
                    unit: "",
                    description: "Starting millionaire tax filers",
                    sources: [
                      {
                        text: "~34K filers with AGI >$1M in NYC (IRS SOI, NYS Dept of Taxation)",
                        url: "https://www.tax.ny.gov/research/stats/statistics/personal-income-tax-filers.htm",
                        linkLabel: "NYS Tax Stats"
                      },
                      {
                        text: "Top 1% pay ~40% of NYC personal income tax",
                        url: "https://cbcny.org/research/growing-gap",
                        linkLabel: "CBC Report"
                      }
                    ]
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "City Income Tax (>$1M)",
                    value: params.millionaireTaxRate,
                    onChange: set("millionaireTaxRate"),
                    min: 1,
                    max: 75,
                    step: 0.1,
                    unit: "%",
                    logScale: true,
                    description: `Current: 3.876% \xB7 Mamdani: 5.876%`,
                    sources: [
                      {
                        text: "NYC top rate 3.876% (income >$50M). Mamdani proposal raises to 5.876% on >$1M",
                        url: "https://www.nyc.gov/site/finance/taxes/property-tax-rates.page",
                        linkLabel: "NYC Finance"
                      },
                      {
                        text: "Combined w/ state: 14.776% current \u2192 16.776% proposed (highest in US)",
                        url: "https://taxfoundation.org/data/all/state/state-income-tax-rates-2025/",
                        linkLabel: "Tax Foundation"
                      }
                    ]
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Corporate Tax Rate",
                    value: params.corpTaxRate,
                    onChange: set("corpTaxRate"),
                    min: 2,
                    max: 75,
                    step: 0.25,
                    unit: "%",
                    logScale: true,
                    description: `Current: 7.75% \xB7 Mamdani: 11.5%`,
                    sources: [
                      {
                        text: "NYC General Corporation Tax: 8.85% (combined w/ metro surcharge \u2248 7.75% effective). Mamdani proposes 11.5%",
                        url: "https://www.nyc.gov/site/finance/taxes/business-corporation-tax.page",
                        linkLabel: "NYC Finance"
                      },
                      {
                        text: "Combined federal+state+city would reach ~38.75% \u2014 highest metro corp rate in US",
                        url: "https://taxfoundation.org/research/all/state/2025-state-tax-competitiveness-index/",
                        linkLabel: "Tax Foundation"
                      }
                    ]
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Property Tax Rate",
                    value: params.propertyTaxRate,
                    onChange: set("propertyTaxRate"),
                    min: 2,
                    max: 75,
                    step: 0.1,
                    unit: "%",
                    logScale: true,
                    description: `Current: 12.28% \xB7 Mamdani: 13.45%`,
                    sources: [
                      {
                        text: "FY2025 Class 1 residential rate: 19.997%, Class 4 commercial: 10.755%. Blended effective ~12.28%",
                        url: "https://www.nyc.gov/site/finance/taxes/property-tax-rates.page",
                        linkLabel: "NYC Finance"
                      },
                      {
                        text: "Mamdani: 9.5% hike as 'last resort' if Albany blocks millionaire tax",
                        url: "https://www.politico.com/news/2025/06/09/mamdani-property-tax-hike-nyc-budget-00393041",
                        linkLabel: "Politico"
                      }
                    ]
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Migration Sensitivity",
                    value: params.migrationSensitivity,
                    onChange: set("migrationSensitivity"),
                    min: 0,
                    max: 5,
                    step: 0.1,
                    unit: "x",
                    description: "Millionaire out-migration elasticity per 1% tax hike",
                    sources: [
                      {
                        text: "Kleven et al. (2019): literature review finds elasticities of 1.2-1.8 for top earners",
                        url: "https://www.aeaweb.org/articles?id=10.1257/jep.28.4.77",
                        linkLabel: "AEA"
                      },
                      {
                        text: "NY lost 12.7% \u2192 8.7% share of US millionaires (2010-2022)",
                        url: "https://www.empirecenter.org/publications/new-yorks-shrinking-share/",
                        linkLabel: "Empire Center"
                      },
                      {
                        text: "CA lost $16.1B in AGI after millionaire tax (Proposition 30, 2016 data)",
                        url: "https://taxfoundation.org/research/all/state/state-migration-trends/",
                        linkLabel: "Tax Foundation"
                      }
                    ]
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Corp Base Erosion",
                    value: params.corpErosionSensitivity,
                    onChange: set("corpErosionSensitivity"),
                    min: 0,
                    max: 10,
                    step: 0.5,
                    unit: "%",
                    description: "% of corp tax base lost per 1pp rate hike (profit-shifting, relocation, reduced activity). Literature: 4-7%",
                    sources: [
                      {
                        text: "Giroud & Rauh (2019): C-corp employment elasticity of -0.4 to -0.5 per 1pp rate increase",
                        url: "https://www.journals.uchicago.edu/doi/10.1086/706048",
                        linkLabel: "J. Political Economy"
                      },
                      {
                        text: "Bruce, Deskins & Fox: 1pp CIT rate increase \u2192 6.6% base shrinkage (elasticity -0.44)",
                        url: "https://eml.berkeley.edu/~burch/incometax05/bruce_deskins_fox.pdf",
                        linkLabel: "Berkeley Working Paper"
                      },
                      {
                        text: "Su\xE1rez Serrato & Zidar (NBER): firms bear ~50% of corp tax incidence, implying significant activity response",
                        url: "https://www.nber.org/reporter/2023number3/how-do-corporate-taxes-affect-economic-activity",
                        linkLabel: "NBER"
                      }
                    ]
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Pension Growth",
                    value: params.pensionGrowthRate,
                    onChange: set("pensionGrowthRate"),
                    min: 1,
                    max: 10,
                    step: 0.1,
                    unit: "%",
                    description: "Annual pension obligation growth",
                    sources: [
                      {
                        text: "NYC pension contributions grew from $6.4B (FY14) to $10.5B (FY25) \u2248 4.6% CAGR. Default 5.5% reflects upward trend",
                        url: "https://comptroller.nyc.gov/reports/annual-comprehensive-financial-report/",
                        linkLabel: "NYC Comptroller"
                      },
                      {
                        text: "5 pension systems cover 302K active + 250K+ retirees. Payouts are exempt from NYS/NYC income tax",
                        url: "https://www.empirecenter.org/publications/pension-and-opeb-transparency/",
                        linkLabel: "Empire Center"
                      }
                    ]
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Benefits Growth",
                    value: params.benefitsGrowthRate,
                    onChange: set("benefitsGrowthRate"),
                    min: 1,
                    max: 15,
                    step: 0.1,
                    unit: "%",
                    description: "Health insurance & OPEB growth (12.2% approved for FY26)",
                    sources: [
                      {
                        text: "FY26 health insurance premium increase of 12.2% approved by Office of Labor Relations",
                        url: "https://cbcny.org/research/growing-gap",
                        linkLabel: "CBC"
                      },
                      {
                        text: "~$100B unfunded OPEB (retiree healthcare) liability per NYC Comptroller",
                        url: "https://comptroller.nyc.gov/reports/annual-comprehensive-financial-report/",
                        linkLabel: "NYC Comptroller"
                      },
                      {
                        text: "National employer health costs rising 7-9%/yr (KFF 2024 survey). NYC runs 8%+ due to generous union contracts",
                        url: "https://www.kff.org/health-costs/report/employer-health-benefits-survey/",
                        linkLabel: "KFF"
                      }
                    ]
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Comp Growth",
                    value: params.salaryGrowthRate,
                    onChange: set("salaryGrowthRate"),
                    min: 0,
                    max: 8,
                    step: 0.1,
                    unit: "%",
                    description: "Annual compensation growth (salary + OT + payroll tax) for 302K employees",
                    sources: [
                      {
                        text: "Recent union contracts (DC37, UFT) settled at 3-3.5% annual raises. OT ($2.9B) grows faster",
                        url: "https://cbcny.org/research/growing-gap",
                        linkLabel: "CBC"
                      },
                      {
                        text: "Total Personal Services: $56.9B for FY26 per NYC OMB (base pay + OT + fringe)",
                        url: "https://www.nyc.gov/site/omb/publications/finplan01-25.page",
                        linkLabel: "NYC OMB"
                      }
                    ]
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Base Revenue Growth",
                    value: params.revenueGrowth,
                    onChange: set("revenueGrowth"),
                    min: 0,
                    max: 6,
                    step: 0.1,
                    unit: "%",
                    description: "Non-tax revenue annual growth",
                    sources: [
                      {
                        text: "NYC IBO projects non-tax revenue (fees, fines, state aid) growing ~2.5-3%/yr",
                        url: "https://www.ibo.nyc.ny.us/",
                        linkLabel: "NYC IBO"
                      }
                    ]
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Years to Project",
                    value: params.yearsToProject,
                    onChange: set("yearsToProject"),
                    min: 5,
                    max: 20,
                    step: 1,
                    unit: "yr"
                  })
                ]
              }),
              /* @__PURE__ */ jsxs("div", {
                style: { flex: 1, minWidth: 0 },
                children: [
                  /* @__PURE__ */ jsxs(SectionTitle, {
                    children: [
                      "Budget vs Revenue \xB7",
                      " ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#4a9de8" },
                        children: "Fixed Costs"
                      }),
                      " Overlay"
                    ]
                  }),
                  /* @__PURE__ */ jsx("div", {
                    style: {
                      background: "rgba(20,18,16,0.6)",
                      border: "1px solid #2a2520",
                      borderRadius: 8,
                      padding: "16px 8px"
                    },
                    children: /* @__PURE__ */ jsx(ResponsiveContainer, {
                      width: "100%",
                      height: 320,
                      children: /* @__PURE__ */ jsxs(ComposedChart, {
                        data: dataWithGhost,
                        margin: chartMargin,
                        children: [
                          /* @__PURE__ */ jsx(CartesianGrid, {
                            strokeDasharray: "3 3",
                            stroke: "#2a2520"
                          }),
                          /* @__PURE__ */ jsx(XAxis, {
                            dataKey: "year",
                            tick: {
                              fill: "#6b6157",
                              fontSize: 11,
                              fontFamily: "JetBrains Mono"
                            }
                          }),
                          /* @__PURE__ */ jsx(YAxis, {
                            tick: {
                              fill: "#6b6157",
                              fontSize: 10,
                              fontFamily: "JetBrains Mono"
                            },
                            tickFormatter: (v) => `${v}B`
                          }),
                          /* @__PURE__ */ jsx(Tooltip, {
                            content: /* @__PURE__ */ jsx(CustomTooltip, {})
                          }),
                          /* @__PURE__ */ jsx(Legend, {
                            wrapperStyle: {
                              fontSize: 10,
                              fontFamily: "JetBrains Mono"
                            }
                          }),
                          /* @__PURE__ */ jsx(Area, {
                            type: "monotone",
                            dataKey: "pensionSpend",
                            name: "Pension",
                            fill: "#b088d4",
                            fillOpacity: 0.25,
                            stroke: "#b088d4",
                            strokeWidth: 1.5
                          }),
                          /* @__PURE__ */ jsx(Area, {
                            type: "monotone",
                            dataKey: "benefitsSpend",
                            name: "Benefits",
                            fill: "#e088a8",
                            fillOpacity: 0.2,
                            stroke: "#e088a8",
                            strokeWidth: 1.5
                          }),
                          /* @__PURE__ */ jsx(Area, {
                            type: "monotone",
                            dataKey: "salarySpend",
                            name: "Compensation",
                            fill: "#6ab0d4",
                            fillOpacity: 0.2,
                            stroke: "#6ab0d4",
                            strokeWidth: 1.5
                          }),
                          /* @__PURE__ */ jsx(Line, {
                            type: "monotone",
                            dataKey: "ghostBudget",
                            name: "Baseline Spend",
                            legendType: "none",
                            stroke: "#e85d4a",
                            strokeWidth: 1,
                            dot: false,
                            strokeDasharray: "4 4",
                            strokeOpacity: 0.3
                          }),
                          /* @__PURE__ */ jsx(Line, {
                            type: "monotone",
                            dataKey: "ghostRevenue",
                            name: "Baseline Rev",
                            legendType: "none",
                            stroke: "#5cb85c",
                            strokeWidth: 1,
                            dot: false,
                            strokeDasharray: "4 4",
                            strokeOpacity: 0.3
                          }),
                          /* @__PURE__ */ jsx(Line, {
                            type: "monotone",
                            dataKey: "ghostFixed",
                            name: "Baseline Fixed",
                            legendType: "none",
                            stroke: "#4a9de8",
                            strokeWidth: 1,
                            dot: false,
                            strokeDasharray: "4 4",
                            strokeOpacity: 0.3
                          }),
                          /* @__PURE__ */ jsx(Line, {
                            type: "monotone",
                            dataKey: "totalBudget",
                            name: "Total Spend",
                            stroke: "#e85d4a",
                            strokeWidth: 2.5,
                            dot: false
                          }),
                          /* @__PURE__ */ jsx(Line, {
                            type: "monotone",
                            dataKey: "totalRevenue",
                            name: "Total Revenue",
                            stroke: "#5cb85c",
                            strokeWidth: 2.5,
                            dot: false
                          }),
                          /* @__PURE__ */ jsx(Line, {
                            type: "monotone",
                            dataKey: "fixedCosts",
                            name: "\u2B24 FIXED COSTS",
                            stroke: "#4a9de8",
                            strokeWidth: 2.5,
                            dot: false,
                            strokeDasharray: "6 3"
                          }),
                          /* @__PURE__ */ jsx(Area, {
                            type: "monotone",
                            dataKey: "debtService",
                            name: "Debt Service",
                            fill: "#e8a84a",
                            fillOpacity: 0.15,
                            stroke: "#e8a84a",
                            strokeWidth: 1
                          }),
                          params.includeNewSpending && /* @__PURE__ */ jsx(Area, {
                            type: "monotone",
                            dataKey: "newSpend",
                            name: "New Commitments",
                            fill: "#e85d4a",
                            fillOpacity: 0.3,
                            stroke: "#e85d4a",
                            strokeWidth: 1.5,
                            strokeDasharray: "4 2"
                          })
                        ]
                      })
                    })
                  }),
                  /* @__PURE__ */ jsx(SectionTitle, {
                    children: "Annual Budget Gap"
                  }),
                  /* @__PURE__ */ jsx("div", {
                    style: {
                      background: "rgba(20,18,16,0.6)",
                      border: "1px solid #2a2520",
                      borderRadius: 8,
                      padding: "16px 8px"
                    },
                    children: /* @__PURE__ */ jsx(ResponsiveContainer, {
                      width: "100%",
                      height: 200,
                      children: /* @__PURE__ */ jsxs(ComposedChart, {
                        data: dataWithGhost,
                        margin: chartMargin,
                        children: [
                          /* @__PURE__ */ jsx(CartesianGrid, {
                            strokeDasharray: "3 3",
                            stroke: "#2a2520"
                          }),
                          /* @__PURE__ */ jsx(XAxis, {
                            dataKey: "year",
                            tick: {
                              fill: "#6b6157",
                              fontSize: 11,
                              fontFamily: "JetBrains Mono"
                            }
                          }),
                          /* @__PURE__ */ jsx(YAxis, {
                            tick: {
                              fill: "#6b6157",
                              fontSize: 10,
                              fontFamily: "JetBrains Mono"
                            },
                            tickFormatter: (v) => `${v}B`
                          }),
                          /* @__PURE__ */ jsx(Tooltip, {
                            content: /* @__PURE__ */ jsx(CustomTooltip, {})
                          }),
                          /* @__PURE__ */ jsx(ReferenceLine, {
                            y: 0,
                            stroke: "#3a342a"
                          }),
                          /* @__PURE__ */ jsx(Line, {
                            type: "monotone",
                            dataKey: "ghostGap",
                            name: "Baseline Gap",
                            legendType: "none",
                            stroke: "#e85d4a",
                            strokeWidth: 1,
                            dot: false,
                            strokeDasharray: "4 4",
                            strokeOpacity: 0.3
                          }),
                          /* @__PURE__ */ jsx(Bar, {
                            dataKey: "gap",
                            name: "Budget Gap",
                            fill: "#e85d4a",
                            fillOpacity: 0.7,
                            radius: [3, 3, 0, 0]
                          })
                        ]
                      })
                    })
                  }),
                  /* @__PURE__ */ jsx(SectionTitle, {
                    children: "Millionaire Exodus"
                  }),
                  /* @__PURE__ */ jsx("div", {
                    style: {
                      background: "rgba(20,18,16,0.6)",
                      border: "1px solid #2a2520",
                      borderRadius: 8,
                      padding: "16px 8px"
                    },
                    children: /* @__PURE__ */ jsx(ResponsiveContainer, {
                      width: "100%",
                      height: 220,
                      children: /* @__PURE__ */ jsxs(ComposedChart, {
                        data: dataWithGhost,
                        margin: chartMargin,
                        children: [
                          /* @__PURE__ */ jsx(CartesianGrid, {
                            strokeDasharray: "3 3",
                            stroke: "#2a2520"
                          }),
                          /* @__PURE__ */ jsx(XAxis, {
                            dataKey: "year",
                            tick: {
                              fill: "#6b6157",
                              fontSize: 11,
                              fontFamily: "JetBrains Mono"
                            }
                          }),
                          /* @__PURE__ */ jsx(YAxis, {
                            yAxisId: "left",
                            tick: {
                              fill: "#6b6157",
                              fontSize: 10,
                              fontFamily: "JetBrains Mono"
                            },
                            tickFormatter: (v) => `${(v / 1e3).toFixed(0)}K`
                          }),
                          /* @__PURE__ */ jsx(YAxis, {
                            yAxisId: "right",
                            orientation: "right",
                            tick: {
                              fill: "#6b6157",
                              fontSize: 10,
                              fontFamily: "JetBrains Mono"
                            },
                            tickFormatter: (v) => `${v}B`
                          }),
                          /* @__PURE__ */ jsx(Tooltip, {
                            content: /* @__PURE__ */ jsx(CustomTooltip, {})
                          }),
                          /* @__PURE__ */ jsx(Legend, {
                            wrapperStyle: {
                              fontSize: 10,
                              fontFamily: "JetBrains Mono"
                            }
                          }),
                          /* @__PURE__ */ jsx(Line, {
                            yAxisId: "left",
                            type: "monotone",
                            dataKey: "ghostMillionaires",
                            name: "Baseline Count",
                            legendType: "none",
                            stroke: "#d4a556",
                            strokeWidth: 1,
                            dot: false,
                            strokeDasharray: "4 4",
                            strokeOpacity: 0.3
                          }),
                          /* @__PURE__ */ jsx(Line, {
                            yAxisId: "right",
                            type: "monotone",
                            dataKey: "ghostMillionaireRev",
                            name: "Baseline Rev",
                            legendType: "none",
                            stroke: "#e85d4a",
                            strokeWidth: 1,
                            dot: false,
                            strokeDasharray: "4 4",
                            strokeOpacity: 0.3
                          }),
                          /* @__PURE__ */ jsx(Area, {
                            yAxisId: "left",
                            type: "monotone",
                            dataKey: "millionaires",
                            name: "Millionaires",
                            fill: "#d4a556",
                            fillOpacity: 0.2,
                            stroke: "#d4a556",
                            strokeWidth: 2
                          }),
                          /* @__PURE__ */ jsx(Line, {
                            yAxisId: "right",
                            type: "monotone",
                            dataKey: "millionaireRevenue",
                            name: "Millionaire Tax Rev",
                            stroke: "#e85d4a",
                            strokeWidth: 2,
                            dot: false,
                            strokeDasharray: "5 5"
                          })
                        ]
                      })
                    })
                  }),
                  /* @__PURE__ */ jsx(SectionTitle, {
                    children: "Who Gets Paid"
                  }),
                  /* @__PURE__ */ jsxs("div", {
                    style: {
                      background: "rgba(20,18,16,0.6)",
                      border: "1px solid #2a2520",
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 4
                    },
                    children: [
                      /* @__PURE__ */ jsxs("div", {
                        style: { marginBottom: 16 },
                        children: [
                          /* @__PURE__ */ jsx("div", {
                            style: {
                              fontSize: 10,
                              color: "#8a7e6e",
                              fontFamily: "'JetBrains Mono', monospace",
                              marginBottom: 6,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em"
                            },
                            children: "Population \u2014 8.3M residents"
                          }),
                          /* @__PURE__ */ jsxs("div", {
                            style: {
                              display: "flex",
                              height: 32,
                              borderRadius: 4,
                              overflow: "hidden",
                              border: "1px solid #2a2520"
                            },
                            children: [
                              /* @__PURE__ */ jsx("div", {
                                style: {
                                  width: "4%",
                                  minWidth: 40,
                                  background: "#4a9de8",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 8,
                                  fontWeight: 700,
                                  fontFamily: "'JetBrains Mono', monospace",
                                  color: "#141210"
                                },
                                children: "302K"
                              }),
                              /* @__PURE__ */ jsx("div", {
                                style: {
                                  width: "3%",
                                  minWidth: 36,
                                  background: "#e088a8",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 8,
                                  fontWeight: 700,
                                  fontFamily: "'JetBrains Mono', monospace",
                                  color: "#141210"
                                },
                                children: "250K+"
                              }),
                              /* @__PURE__ */ jsx("div", {
                                style: {
                                  width: "12%",
                                  minWidth: 40,
                                  background: "#b088d4",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 8,
                                  fontWeight: 700,
                                  fontFamily: "'JetBrains Mono', monospace",
                                  color: "#141210"
                                },
                                children: "1M"
                              }),
                              /* @__PURE__ */ jsx("div", {
                                style: {
                                  flex: 1,
                                  background: "#2a2520",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 9,
                                  fontWeight: 600,
                                  fontFamily: "'JetBrains Mono', monospace",
                                  color: "#6b6157"
                                },
                                children: "~7M other residents"
                              })
                            ]
                          }),
                          (() => {
                            const salPct = lastYear.salarySpend / lastYear.totalBudget * 100;
                            const penPct = lastYear.pensionSpend / lastYear.totalBudget * 100;
                            const benPct = lastYear.benefitsSpend / lastYear.totalBudget * 100;
                            const empTotalPct = salPct + penPct + benPct;
                            const newSpendPct = lastYear.newSpend / lastYear.totalBudget * 100;
                            const eduPct = 22;
                            const otherPct = 100 - empTotalPct - eduPct - newSpendPct;
                            return /* @__PURE__ */ jsxs(Fragment, {
                              children: [
                                /* @__PURE__ */ jsxs("div", {
                                  style: {
                                    fontSize: 10,
                                    color: "#8a7e6e",
                                    fontFamily: "'JetBrains Mono', monospace",
                                    marginTop: 10,
                                    marginBottom: 6,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em"
                                  },
                                  children: [
                                    "Budget captured \u2014 ",
                                    fmt(lastYear.totalBudget)
                                  ]
                                }),
                                /* @__PURE__ */ jsxs("div", {
                                  style: {
                                    display: "flex",
                                    height: 32,
                                    borderRadius: 4,
                                    overflow: "hidden",
                                    border: "1px solid #2a2520"
                                  },
                                  children: [
                                    /* @__PURE__ */ jsx("div", {
                                      style: {
                                        width: `${salPct}%`,
                                        minWidth: 30,
                                        background: "#4a9de8",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 8,
                                        fontWeight: 700,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        color: "#141210"
                                      },
                                      children: "Salary"
                                    }),
                                    /* @__PURE__ */ jsx("div", {
                                      style: {
                                        width: `${penPct}%`,
                                        minWidth: 24,
                                        background: "#b088d4",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 8,
                                        fontWeight: 700,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        color: "#141210"
                                      },
                                      children: "Pension"
                                    }),
                                    /* @__PURE__ */ jsx("div", {
                                      style: {
                                        width: `${benPct}%`,
                                        minWidth: 24,
                                        background: "#e088a8",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 8,
                                        fontWeight: 700,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        color: "#141210"
                                      },
                                      children: "Benefits"
                                    }),
                                    /* @__PURE__ */ jsx("div", {
                                      style: {
                                        width: `${eduPct}%`,
                                        minWidth: 24,
                                        background: "#6b6157",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 8,
                                        fontWeight: 700,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        color: "#141210"
                                      },
                                      children: "Education"
                                    }),
                                    newSpendPct > 0.5 && /* @__PURE__ */ jsx("div", {
                                      style: {
                                        width: `${newSpendPct}%`,
                                        minWidth: 24,
                                        background: "#e85d4a",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 7,
                                        fontWeight: 700,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        color: "#141210"
                                      },
                                      children: "New"
                                    }),
                                    /* @__PURE__ */ jsx("div", {
                                      style: {
                                        flex: 1,
                                        background: "#2a2520",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 8,
                                        fontWeight: 600,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        color: "#6b6157"
                                      },
                                      children: "Everything else"
                                    })
                                  ]
                                }),
                                /* @__PURE__ */ jsxs("div", {
                                  style: {
                                    marginTop: 4,
                                    fontSize: 11,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: "#4a9de8",
                                    fontWeight: 700
                                  },
                                  children: [
                                    "Employee total cost: ",
                                    empTotalPct.toFixed(0),
                                    "% of budget (",
                                    fmt(
                                      lastYear.salarySpend + lastYear.pensionSpend + lastYear.benefitsSpend
                                    ),
                                    ") \u2192 for ",
                                    ((302 + 250) / 8300 * 100).toFixed(1),
                                    "% of the population"
                                  ]
                                })
                              ]
                            });
                          })(),
                          /* @__PURE__ */ jsxs("div", {
                            style: {
                              display: "flex",
                              gap: 14,
                              marginTop: 8,
                              fontSize: 10,
                              fontFamily: "'JetBrains Mono', monospace",
                              flexWrap: "wrap"
                            },
                            children: [
                              /* @__PURE__ */ jsxs("span", {
                                children: [
                                  /* @__PURE__ */ jsx("span", {
                                    style: { color: "#4a9de8" },
                                    children: "\u25A0"
                                  }),
                                  " ",
                                  /* @__PURE__ */ jsx("span", {
                                    style: { color: "#8a7e6e" },
                                    children: "Active employees / Comp"
                                  })
                                ]
                              }),
                              /* @__PURE__ */ jsxs("span", {
                                children: [
                                  /* @__PURE__ */ jsx("span", {
                                    style: { color: "#e088a8" },
                                    children: "\u25A0"
                                  }),
                                  " ",
                                  /* @__PURE__ */ jsx("span", {
                                    style: { color: "#8a7e6e" },
                                    children: "Retirees / Benefits"
                                  })
                                ]
                              }),
                              /* @__PURE__ */ jsxs("span", {
                                children: [
                                  /* @__PURE__ */ jsx("span", {
                                    style: { color: "#b088d4" },
                                    children: "\u25A0"
                                  }),
                                  " ",
                                  /* @__PURE__ */ jsx("span", {
                                    style: { color: "#8a7e6e" },
                                    children: "Students / Pensions"
                                  })
                                ]
                              }),
                              lastYear.newSpend > 0 && /* @__PURE__ */ jsxs("span", {
                                children: [
                                  /* @__PURE__ */ jsx("span", {
                                    style: { color: "#e85d4a" },
                                    children: "\u25A0"
                                  }),
                                  " ",
                                  /* @__PURE__ */ jsx("span", {
                                    style: { color: "#8a7e6e" },
                                    children: "New Commitments"
                                  })
                                ]
                              }),
                              /* @__PURE__ */ jsxs("span", {
                                children: [
                                  /* @__PURE__ */ jsx("span", {
                                    style: { color: "#3a342a" },
                                    children: "\u25A0"
                                  }),
                                  " ",
                                  /* @__PURE__ */ jsx("span", {
                                    style: { color: "#6b6157" },
                                    children: "Everyone else"
                                  })
                                ]
                              })
                            ]
                          })
                        ]
                      }),
                      /* @__PURE__ */ jsx("div", {
                        style: { display: "flex", gap: 10, flexWrap: "wrap" },
                        children: (() => {
                          const actualPayroll = 34.6;
                          const avgPay = actualPayroll / 0.549 * 1e3;
                          const totalCompPerActive = (lastYear.salarySpend + lastYear.benefitsSpend * 0.55 + lastYear.pensionSpend * 0.4) / 0.302 * 1e3;
                          const perResident = lastYear.totalBudget / 8.3 * 1e3;
                          const perStudent = lastYear.totalBudget * 0.22 / 1 * 1e3;
                          const fmtDollar = (d) => d >= 1e6 ? `$${(d / 1e6).toFixed(1)}M` : d >= 1e3 ? `$${(d / 1e3).toFixed(0)}K` : `$${d.toFixed(0)}`;
                          return /* @__PURE__ */ jsxs(Fragment, {
                            children: [
                              /* @__PURE__ */ jsxs("div", {
                                style: {
                                  flex: 1.3,
                                  minWidth: 180,
                                  background: "rgba(74,157,232,0.08)",
                                  border: "1px solid #4a9de8",
                                  borderRadius: 6,
                                  padding: "10px 12px"
                                },
                                children: [
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 10,
                                      color: "#4a9de8",
                                      fontWeight: 700,
                                      fontFamily: "'JetBrains Mono', monospace",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      marginBottom: 4
                                    },
                                    children: "Per City Worker (avg pay)"
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 22,
                                      fontWeight: 700,
                                      color: "#4a9de8",
                                      fontFamily: "'JetBrains Mono', monospace"
                                    },
                                    children: fmtDollar(avgPay)
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 10,
                                      color: "#6b6157",
                                      marginTop: 2,
                                      lineHeight: 1.4
                                    },
                                    children: "salary \xF7 549K workers (incl. part-time) \xB7 what they actually see"
                                  })
                                ]
                              }),
                              /* @__PURE__ */ jsxs("div", {
                                style: {
                                  flex: 1.3,
                                  minWidth: 180,
                                  background: "rgba(224,136,168,0.08)",
                                  border: "1px solid #e088a8",
                                  borderRadius: 6,
                                  padding: "10px 12px"
                                },
                                children: [
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 10,
                                      color: "#e088a8",
                                      fontWeight: 700,
                                      fontFamily: "'JetBrains Mono', monospace",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      marginBottom: 4
                                    },
                                    children: "True Cost Per Active Employee"
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 22,
                                      fontWeight: 700,
                                      color: "#e088a8",
                                      fontFamily: "'JetBrains Mono', monospace"
                                    },
                                    children: fmtDollar(totalCompPerActive)
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 10,
                                      color: "#6b6157",
                                      marginTop: 2,
                                      lineHeight: 1.4
                                    },
                                    children: "salary + share of pension & benefits \xB7 250K+ retirees also draw from the same pools"
                                  })
                                ]
                              }),
                              /* @__PURE__ */ jsxs("div", {
                                style: {
                                  flex: 1,
                                  minWidth: 150,
                                  background: "rgba(30,27,22,0.7)",
                                  border: "1px solid #3a342a",
                                  borderRadius: 6,
                                  padding: "10px 12px"
                                },
                                children: [
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 10,
                                      color: "#8a7e6e",
                                      fontWeight: 600,
                                      fontFamily: "'JetBrains Mono', monospace",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      marginBottom: 4
                                    },
                                    children: "Per Resident"
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 22,
                                      fontWeight: 700,
                                      color: "#f0e6d3",
                                      fontFamily: "'JetBrains Mono', monospace"
                                    },
                                    children: fmtDollar(perResident)
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 10,
                                      color: "#6b6157",
                                      marginTop: 2
                                    },
                                    children: "total budget \xF7 8.3M people"
                                  })
                                ]
                              }),
                              /* @__PURE__ */ jsxs("div", {
                                style: {
                                  flex: 1,
                                  minWidth: 150,
                                  background: "rgba(176,136,212,0.08)",
                                  border: "1px solid #b088d4",
                                  borderRadius: 6,
                                  padding: "10px 12px"
                                },
                                children: [
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 10,
                                      color: "#b088d4",
                                      fontWeight: 700,
                                      fontFamily: "'JetBrains Mono', monospace",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      marginBottom: 4
                                    },
                                    children: "Per Student"
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 22,
                                      fontWeight: 700,
                                      color: "#b088d4",
                                      fontFamily: "'JetBrains Mono', monospace"
                                    },
                                    children: fmtDollar(perStudent)
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: {
                                      fontSize: 10,
                                      color: "#6b6157",
                                      marginTop: 2
                                    },
                                    children: "22% of budget \xF7 ~1M students \xB7 middling outcomes"
                                  })
                                ]
                              })
                            ]
                          });
                        })()
                      }),
                      /* @__PURE__ */ jsxs("div", {
                        style: {
                          fontSize: 10,
                          color: "#6b6157",
                          fontFamily: "'JetBrains Mono', monospace",
                          marginTop: 8,
                          fontStyle: "italic",
                          lineHeight: 1.5
                        },
                        children: [
                          'The gap between avg pay and true cost is where the money "disappears": overtime ($2.9B/yr), employer payroll taxes, pension contributions funding 250K+ retirees (tax-exempt payouts), health benefits for current ',
                          /* @__PURE__ */ jsx("em", {
                            children: "and"
                          }),
                          " retired workers ($100B unfunded liability)."
                        ]
                      })
                    ]
                  }),
                  /* @__PURE__ */ jsx(SectionTitle, {
                    children: "Revenue Composition"
                  }),
                  /* @__PURE__ */ jsx("div", {
                    style: {
                      background: "rgba(20,18,16,0.6)",
                      border: "1px solid #2a2520",
                      borderRadius: 8,
                      padding: "16px 8px"
                    },
                    children: /* @__PURE__ */ jsx(ResponsiveContainer, {
                      width: "100%",
                      height: 260,
                      children: /* @__PURE__ */ jsxs(AreaChart, {
                        data,
                        margin: chartMargin,
                        children: [
                          /* @__PURE__ */ jsx(CartesianGrid, {
                            strokeDasharray: "3 3",
                            stroke: "#2a2520"
                          }),
                          /* @__PURE__ */ jsx(XAxis, {
                            dataKey: "year",
                            tick: {
                              fill: "#6b6157",
                              fontSize: 11,
                              fontFamily: "JetBrains Mono"
                            }
                          }),
                          /* @__PURE__ */ jsx(YAxis, {
                            tick: {
                              fill: "#6b6157",
                              fontSize: 10,
                              fontFamily: "JetBrains Mono"
                            },
                            tickFormatter: (v) => `${v}B`
                          }),
                          /* @__PURE__ */ jsx(Tooltip, {
                            content: /* @__PURE__ */ jsx(CustomTooltip, {})
                          }),
                          /* @__PURE__ */ jsx(Legend, {
                            wrapperStyle: {
                              fontSize: 10,
                              fontFamily: "JetBrains Mono"
                            }
                          }),
                          /* @__PURE__ */ jsx(Area, {
                            type: "monotone",
                            dataKey: "propertyTaxRev",
                            name: "Property Tax",
                            stackId: "1",
                            fill: "#d4a556",
                            fillOpacity: 0.6,
                            stroke: "#d4a556"
                          }),
                          /* @__PURE__ */ jsx(Area, {
                            type: "monotone",
                            dataKey: "personalIncomeTaxRev",
                            name: "Income Tax",
                            stackId: "1",
                            fill: "#6ab0d4",
                            fillOpacity: 0.6,
                            stroke: "#6ab0d4"
                          }),
                          /* @__PURE__ */ jsx(Area, {
                            type: "monotone",
                            dataKey: "corpRevenue",
                            name: "Corporate Tax",
                            stackId: "1",
                            fill: "#b088d4",
                            fillOpacity: 0.6,
                            stroke: "#b088d4"
                          }),
                          /* @__PURE__ */ jsx(Area, {
                            type: "monotone",
                            dataKey: "otherRev",
                            name: "Other + State + Fed",
                            stackId: "1",
                            fill: "#5cb85c",
                            fillOpacity: 0.4,
                            stroke: "#5cb85c"
                          })
                        ]
                      })
                    })
                  }),
                  /* @__PURE__ */ jsx(SectionTitle, {
                    children: "Total Tax Burden by Income Bracket"
                  }),
                  /* @__PURE__ */ jsx("div", {
                    style: {
                      background: "rgba(20,18,16,0.6)",
                      border: "1px solid #2a2520",
                      borderRadius: 8,
                      padding: 16,
                      overflowX: "auto"
                    },
                    children: /* @__PURE__ */ jsxs("table", {
                      style: {
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 12,
                        fontFamily: "'JetBrains Mono', monospace"
                      },
                      children: [
                        /* @__PURE__ */ jsx("thead", {
                          children: /* @__PURE__ */ jsx("tr", {
                            style: { borderBottom: "1px solid #3a342a" },
                            children: [
                              "Bracket",
                              "Federal",
                              "State",
                              "City",
                              "Total Rate",
                              "Share of City Rev"
                            ].map((h) => /* @__PURE__ */ jsx("th", {
                              style: {
                                textAlign: "left",
                                padding: "8px 10px",
                                color: "#8a7e6e",
                                fontWeight: 600,
                                fontSize: 10,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em"
                              },
                              children: h
                            }, h))
                          })
                        }),
                        /* @__PURE__ */ jsxs("tbody", {
                          children: [
                            brackets.map((b, i) => /* @__PURE__ */ jsxs("tr", {
                              style: { borderBottom: "1px solid #1e1b16" },
                              children: [
                                /* @__PURE__ */ jsx("td", {
                                  style: {
                                    padding: "8px 10px",
                                    color: "#c4b5a0",
                                    whiteSpace: "pre-line",
                                    lineHeight: 1.3
                                  },
                                  children: b.label
                                }),
                                /* @__PURE__ */ jsxs("td", {
                                  style: { padding: "8px 10px", color: "#6b6157" },
                                  children: [
                                    b.fedRate,
                                    "%"
                                  ]
                                }),
                                /* @__PURE__ */ jsxs("td", {
                                  style: { padding: "8px 10px", color: "#6b6157" },
                                  children: [
                                    b.stateRate,
                                    "%"
                                  ]
                                }),
                                /* @__PURE__ */ jsxs("td", {
                                  style: {
                                    padding: "8px 10px",
                                    color: b.cityRate > BASELINE.millionaireTaxRate ? "#e85d4a" : "#d4a556",
                                    fontWeight: b.cityRate > BASELINE.millionaireTaxRate ? 700 : 400
                                  },
                                  children: [
                                    b.cityRate.toFixed(2),
                                    "%"
                                  ]
                                }),
                                /* @__PURE__ */ jsxs("td", {
                                  style: {
                                    padding: "8px 10px",
                                    color: "#f0e6d3",
                                    fontWeight: 700
                                  },
                                  children: [
                                    b.totalRate,
                                    "%"
                                  ]
                                }),
                                /* @__PURE__ */ jsxs("td", {
                                  style: { padding: "8px 10px", color: "#d4a556" },
                                  children: [
                                    b.shareOfRevenue,
                                    "%"
                                  ]
                                })
                              ]
                            }, i)),
                            /* @__PURE__ */ jsxs("tr", {
                              style: { borderTop: "1px solid #3a342a" },
                              children: [
                                /* @__PURE__ */ jsx("td", {
                                  style: {
                                    padding: "8px 10px",
                                    color: "#b088d4",
                                    fontWeight: 600
                                  },
                                  children: "Corporations"
                                }),
                                /* @__PURE__ */ jsx("td", {
                                  style: { padding: "8px 10px", color: "#6b6157" },
                                  children: "21%"
                                }),
                                /* @__PURE__ */ jsx("td", {
                                  style: { padding: "8px 10px", color: "#6b6157" },
                                  children: "7.25%"
                                }),
                                /* @__PURE__ */ jsxs("td", {
                                  style: {
                                    padding: "8px 10px",
                                    color: params.corpTaxRate > BASELINE.corpTaxRate ? "#e85d4a" : "#d4a556",
                                    fontWeight: params.corpTaxRate > BASELINE.corpTaxRate ? 700 : 400
                                  },
                                  children: [
                                    params.corpTaxRate.toFixed(2),
                                    "%"
                                  ]
                                }),
                                /* @__PURE__ */ jsxs("td", {
                                  style: {
                                    padding: "8px 10px",
                                    color: "#f0e6d3",
                                    fontWeight: 700
                                  },
                                  children: [
                                    (21 + 7.25 + params.corpTaxRate).toFixed(1),
                                    "%"
                                  ]
                                }),
                                /* @__PURE__ */ jsx("td", {
                                  style: { padding: "8px 10px", color: "#6b6157" },
                                  children: "\u2014"
                                })
                              ]
                            })
                          ]
                        })
                      ]
                    })
                  }),
                  /* @__PURE__ */ jsxs(SectionTitle, {
                    children: [
                      "FY",
                      lastYear.year,
                      " Projected Breakdown"
                    ]
                  }),
                  /* @__PURE__ */ jsxs("div", {
                    style: { display: "flex", gap: 10, flexWrap: "wrap" },
                    children: [
                      /* @__PURE__ */ jsx(StatBox, {
                        label: "Total Budget",
                        value: fmt(lastYear.totalBudget),
                        color: "#e85d4a"
                      }),
                      /* @__PURE__ */ jsx(StatBox, {
                        label: "Total Revenue",
                        value: fmt(lastYear.totalRevenue),
                        color: "#5cb85c"
                      }),
                      /* @__PURE__ */ jsx(StatBox, {
                        label: `FY${lastYear.year} Gap`,
                        value: fmt(finalGap),
                        sub: "annual shortfall",
                        color: finalGap > 0 ? "#e85d4a" : "#5cb85c"
                      }),
                      /* @__PURE__ */ jsx(StatBox, {
                        label: "Cumulative Gap",
                        value: fmt(lastYear.cumulativeGap),
                        sub: `over ${params.yearsToProject} years`,
                        color: lastYear.cumulativeGap > 0 ? "#e85d4a" : "#5cb85c"
                      }),
                      /* @__PURE__ */ jsxs("div", {
                        style: {
                          border: "2px solid #4a9de8",
                          borderRadius: 8,
                          padding: 8,
                          flex: "1 1 100%",
                          background: "rgba(74,157,232,0.04)"
                        },
                        children: [
                          /* @__PURE__ */ jsxs("div", {
                            style: {
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#4a9de8",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              fontFamily: "'JetBrains Mono', monospace",
                              marginBottom: 6,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "baseline"
                            },
                            children: [
                              /* @__PURE__ */ jsxs("span", {
                                children: [
                                  "\u2B24 FIXED COSTS \u2014 ",
                                  fixedCostPctFinal,
                                  "% of budget"
                                ]
                              }),
                              /* @__PURE__ */ jsx("span", {
                                style: {
                                  fontSize: 16,
                                  color: fixedCostPctFinal > 75 ? "#e85d4a" : "#4a9de8"
                                },
                                children: fmt(lastYear.fixedCosts)
                              })
                            ]
                          }),
                          /* @__PURE__ */ jsxs("div", {
                            style: { display: "flex", gap: 8, flexWrap: "wrap" },
                            children: [
                              /* @__PURE__ */ jsx(StatBox, {
                                label: "Compensation",
                                value: fmt(lastYear.salarySpend),
                                sub: `${salaryPctFinal}% of budget`,
                                color: "#6ab0d4"
                              }),
                              /* @__PURE__ */ jsx(StatBox, {
                                label: "Pensions",
                                value: fmt(lastYear.pensionSpend),
                                sub: `${pensionPctFinal}% of budget`,
                                color: "#b088d4"
                              }),
                              /* @__PURE__ */ jsx(StatBox, {
                                label: "Benefits",
                                value: fmt(lastYear.benefitsSpend),
                                sub: `${benefitsPctFinal}% of budget`,
                                color: "#e088a8"
                              }),
                              /* @__PURE__ */ jsx(StatBox, {
                                label: "Debt Service",
                                value: fmt(lastYear.debtService),
                                sub: `${(lastYear.debtService / lastYear.totalBudget * 100).toFixed(1)}% of budget`,
                                color: "#e8a84a"
                              })
                            ]
                          })
                        ]
                      }),
                      /* @__PURE__ */ jsx(StatBox, {
                        label: "All Other Spending",
                        value: fmt(lastYear.otherSpend),
                        sub: `${(lastYear.otherSpend / lastYear.totalBudget * 100).toFixed(1)}% of budget \u2014 parks, transit, housing, services`,
                        color: "#6b6157"
                      }),
                      params.includeNewSpending && lastYear.newSpend > 0 && /* @__PURE__ */ jsx(StatBox, {
                        label: "New Commitments",
                        value: fmt(lastYear.newSpend),
                        sub: `${(lastYear.newSpend / lastYear.totalBudget * 100).toFixed(1)}% of budget \u2014 childcare, buses, housing, class size, etc.`,
                        color: "#e85d4a"
                      }),
                      /* @__PURE__ */ jsx(StatBox, {
                        label: "Property Tax Rev",
                        value: fmt(lastYear.propertyTaxRev),
                        color: "#d4a556"
                      }),
                      /* @__PURE__ */ jsx(StatBox, {
                        label: "Income Tax Rev",
                        value: fmt(lastYear.personalIncomeTaxRev),
                        color: "#6ab0d4"
                      }),
                      /* @__PURE__ */ jsx(StatBox, {
                        label: "Corporate Tax Rev",
                        value: fmt(lastYear.corpRevenue),
                        color: "#b088d4"
                      }),
                      /* @__PURE__ */ jsx(StatBox, {
                        label: "Remaining Millionaires",
                        value: fmtK(lastYear.millionaires),
                        sub: `started at ${fmtK(firstYear.millionaires)}`,
                        color: "#d4a556"
                      }),
                      /* @__PURE__ */ jsx(StatBox, {
                        label: "Millionaire Exodus",
                        value: fmtK(totalMillionaireLoss),
                        sub: `${(totalMillionaireLoss / firstYear.millionaires * 100).toFixed(1)}% of base`,
                        color: totalMillionaireLoss > 0 ? "#e8a84a" : "#5cb85c"
                      })
                    ]
                  }),
                  /* @__PURE__ */ jsxs("div", {
                    style: {
                      marginTop: 28,
                      padding: 14,
                      background: "rgba(20,18,16,0.6)",
                      border: "1px solid #2a2520",
                      borderRadius: 8,
                      fontSize: 10,
                      color: "#6b6157",
                      fontFamily: "'JetBrains Mono', monospace",
                      lineHeight: 1.6
                    },
                    children: [
                      /* @__PURE__ */ jsx("strong", {
                        style: { color: "#8a7e6e" },
                        children: "METHODOLOGY NOTE:"
                      }),
                      " ",
                      "This is a simplified model for illustrative purposes. Migration elasticity is based on academic literature (~1.5% out-migration per 1% tax increase, adjustable). Revenue projections assume Wall Street returns normalize. Pension growth reflects historical NYC actuarial trends. Benefits growth default of 8% reflects the 12.2% premium increase approved for FY2026 blended with long-term trends; the city's unfunded OPEB liability is ~$100B. Federal aid modeled as declining 2%/yr under current policy trajectory. Property tax revenue grows with assessed values at 2%/yr baseline. Starting figures derived from FY2025-2026 NYC budget data, Comptroller reports, CBC reports, and IBO analyses. The model does not account for recession scenarios, one-time federal shocks, or potential state bailouts."
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}
export {
  NYCBudgetSimulator as default
};
