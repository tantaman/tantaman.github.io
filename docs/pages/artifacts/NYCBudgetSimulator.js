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
  budget: 127,
  budgetGrowth: 4.5,
  numMillionaires: 34e3,
  millionaireTaxRate: 3.876,
  corpTaxRate: 7.75,
  propertyTaxRate: 12.28,
  migrationSensitivity: 1.5,
  pensionGrowthRate: 5.5,
  benefitsGrowthRate: 8,
  salaryGrowthRate: 3.2,
  revenueGrowth: 2.8,
  yearsToProject: 10
};
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
var Knob = ({ label, value, onChange, min, max, step, unit, description, logScale }) => {
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
        style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 },
        children: [
          /* @__PURE__ */ jsx("label", {
            style: { fontSize: 11, fontWeight: 600, color: "#c4b5a0", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" },
            children: label
          }),
          /* @__PURE__ */ jsxs("span", {
            style: { fontSize: 14, fontWeight: 700, color: "#f0e6d3", fontFamily: "'JetBrains Mono', monospace" },
            children: [
              typeof value === "number" && value % 1 !== 0 ? value.toFixed(2) : value.toLocaleString(),
              unit
            ]
          })
        ]
      }),
      description && /* @__PURE__ */ jsx("div", {
        style: { fontSize: 10, color: "#8a7e6e", marginBottom: 4, fontStyle: "italic" },
        children: formatDescription(description)
      }),
      /* @__PURE__ */ jsx("input", {
        type: "range",
        min: logScale ? 0 : min,
        max: logScale ? 1e3 : max,
        step: logScale ? 1 : step,
        value: logScale ? sliderVal : value,
        onChange: handleChange,
        style: { width: "100%", accentColor: "#d4a556", height: 3, cursor: "pointer" }
      }),
      /* @__PURE__ */ jsxs("div", {
        style: { display: "flex", justifyContent: "space-between", fontSize: 9, color: "#6b6157" },
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
      style: { fontSize: 10, color: labelColor || "#8a7e6e", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, fontWeight: labelColor ? 700 : 400 },
      children: label
    }),
    /* @__PURE__ */ jsx("div", {
      style: { fontSize: 20, fontWeight: 700, color: color || "#f0e6d3", fontFamily: "'JetBrains Mono', monospace" },
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
    budget,
    budgetGrowth,
    numMillionaires,
    millionaireTaxRate,
    corpTaxRate,
    propertyTaxRate,
    migrationSensitivity,
    pensionGrowthRate,
    benefitsGrowthRate,
    salaryGrowthRate,
    revenueGrowth,
    yearsToProject
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
  const startingSalary = 56.9;
  const startingPension = 10.5;
  const startingBenefits = 10.4;
  const startingDebtService = 7.5;
  const millionaireShareOfIncomeTax = 0.4;
  const avgMillionaireIncome = 4.2;
  const taxDelta = millionaireTaxRate - BASELINE.millionaireTaxRate;
  const corpDelta = corpTaxRate - BASELINE.corpTaxRate;
  const propDelta = propertyTaxRate - BASELINE.propertyTaxRate;
  for (let i = 0; i <= yearsToProject; i++) {
    const year = currentYear + i;
    const t = i;
    const annualMigrationRate = taxDelta > 0 ? migrationSensitivity * taxDelta * 0.012 + (propDelta > 0 ? propDelta * 3e-3 : 0) : Math.max(taxDelta * 5e-3, -0.01);
    if (i > 0) {
      const netMigration = Math.round(currentMillionaires * annualMigrationRate);
      currentMillionaires = Math.max(5e3, currentMillionaires - netMigration);
    }
    const millionaireRatio = currentMillionaires / numMillionaires;
    const incomeFromMillionaires = currentMillionaires * avgMillionaireIncome * (millionaireTaxRate / 100) / 1e3;
    const incomeFromOthers = startingIncomePersonalRev * (1 - millionaireShareOfIncomeTax) * Math.pow(1 + revenueGrowth / 100, t);
    const personalIncomeTaxRev = incomeFromMillionaires + incomeFromOthers;
    const corpRevenue = startingCorpTaxRev * (corpTaxRate / BASELINE.corpTaxRate) * Math.pow(1 + revenueGrowth / 100, t) * (0.85 + 0.15 * millionaireRatio);
    const propertyTaxRev = startingPropertyTaxRev * (propertyTaxRate / BASELINE.propertyTaxRate) * Math.pow(1 + 0.02, t);
    const otherRev = startingOtherRev * Math.pow(1 + revenueGrowth / 100, t);
    const stateAid = startingStateAid * Math.pow(1 + 0.015, t);
    const fedAid = startingFedAid * Math.pow(1 - 0.02, t);
    const totalRevenue = personalIncomeTaxRev + corpRevenue + propertyTaxRev + otherRev + stateAid + fedAid;
    const totalBudget = budget * Math.pow(1 + budgetGrowth / 100, t);
    const salarySpend = startingSalary * Math.pow(1 + salaryGrowthRate / 100, t);
    const pensionSpend = startingPension * Math.pow(1 + pensionGrowthRate / 100, t);
    const benefitsSpend = startingBenefits * Math.pow(1 + benefitsGrowthRate / 100, t);
    const debtService = startingDebtService * Math.pow(1 + 0.03, t);
    const fixedCosts = salarySpend + pensionSpend + benefitsSpend + debtService;
    const otherSpend = totalBudget - fixedCosts;
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
var CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload)
    return null;
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
      payload.map((p, i) => /* @__PURE__ */ jsxs("div", {
        style: { color: p.color, marginBottom: 2 },
        children: [
          p.name,
          ": ",
          typeof p.value === "number" && p.value > 500 ? fmtK(p.value) : fmt(p.value)
        ]
      }, i))
    ]
  });
};
function NYCBudgetSimulator() {
  const [params, setParams] = useState(DEFAULTS);
  const [showMamdani, setShowMamdani] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const set = useCallback((key) => (val) => setParams((p) => ({ ...p, [key]: val })), []);
  const applyMamdani = () => {
    setParams((p) => ({
      ...p,
      millionaireTaxRate: 5.876,
      corpTaxRate: 11.5,
      propertyTaxRate: 13.45
    }));
    setShowMamdani(true);
  };
  const resetDefaults = () => {
    setParams(DEFAULTS);
    setShowMamdani(false);
  };
  const data = useMemo(() => simulate(params), [params]);
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
      { bracket: "Bottom 50%\n(<$50K)", cityRate: 3.078, stateRate: stateRates.bottom50, fedRate: fedRates.bottom50, shareOfRevenue: 0.2 },
      { bracket: "Middle\n($50K-$200K)", cityRate: 3.5, stateRate: stateRates.middle, fedRate: fedRates.middle, shareOfRevenue: 18.5 },
      { bracket: "Top 10%\n($200K-$1M)", cityRate: 3.876, stateRate: stateRates.top10, fedRate: fedRates.top10, shareOfRevenue: 42 },
      { bracket: "Top 1%\n(>$1M)", cityRate, stateRate: stateRates.top1, fedRate: fedRates.top1, shareOfRevenue: 39.3 }
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
            style: { borderBottom: "2px solid #d4a556", paddingBottom: 16, marginBottom: 24 },
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
                style: { fontSize: 12, color: "#8a7e6e", margin: "6px 0 0 0", fontFamily: "'JetBrains Mono', monospace" },
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
                    style: { fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" },
                    children: "WHAT YOU'RE LOOKING AT"
                  }),
                  /* @__PURE__ */ jsx("span", {
                    style: { fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: "#8a7e6e", transform: infoOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" },
                    children: "\u25BC"
                  })
                ]
              }),
              infoOpen && /* @__PURE__ */ jsxs("div", {
                style: { padding: "0 16px 14px 16px", fontSize: 13, lineHeight: 1.7, color: "#c4b5a0" },
                children: [
                  /* @__PURE__ */ jsxs("p", {
                    style: { margin: "0 0 10px 0" },
                    children: [
                      "NYC spends more per capita than almost any city on earth \u2014 comparable to the ",
                      /* @__PURE__ */ jsx("em", {
                        children: "entire state of Florida"
                      }),
                      " with a third the population \u2014 yet delivers middling outcomes. The city spends ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#e85d4a", fontWeight: 600 },
                        children: "$36,000 per student"
                      }),
                      " (2.3\xD7 the national average) for below-average test scores. Tokyo runs a safer, cleaner, better-connected city of 14 million at ~$4K/resident (though Japan handles healthcare and welfare nationally, the gap is still vast)."
                    ]
                  }),
                  /* @__PURE__ */ jsxs("p", {
                    style: { margin: "0 0 10px 0" },
                    children: [
                      "The core problem: ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#e088a8", fontWeight: 600 },
                        children: "salaries"
                      }),
                      ", ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#b088d4", fontWeight: 600 },
                        children: "pensions"
                      }),
                      ", and ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#e088a8", fontWeight: 600 },
                        children: "health benefits"
                      }),
                      " for 302,000 city employees consume an ever-growing share of the budget. These are ",
                      /* @__PURE__ */ jsx("em", {
                        children: "exactly"
                      }),
                      " the costs a socialist coalition built on public-sector unions cannot cut. The unfunded retiree healthcare liability alone is ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#e85d4a", fontWeight: 600 },
                        children: "~$100 billion"
                      }),
                      "."
                    ]
                  }),
                  /* @__PURE__ */ jsxs("p", {
                    style: { margin: "0 0 10px 0" },
                    children: [
                      "Watch the ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#4a9de8", fontWeight: 700 },
                        children: "\u2B24 FIXED COSTS % BUDGET"
                      }),
                      " stat. As personnel costs compound faster than revenue, they crowd out everything else \u2014 parks, transit, housing, actual services. The city increasingly exists to pay its own employees, not to serve residents. Raising taxes on the rich provides a one-time sugar hit, but the spending treadmill outruns it within years, especially as millionaires leave."
                    ]
                  }),
                  /* @__PURE__ */ jsx("p", {
                    style: { margin: 0, fontSize: 12, color: "#8a7e6e", fontStyle: "italic" },
                    children: 'Use the knobs to test different scenarios. Hit "Apply Mamdani Proposal" to see his plan in action.'
                  })
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            style: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
            children: [
              /* @__PURE__ */ jsx("button", {
                onClick: applyMamdani,
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
                children: "APPLY MAMDANI PROPOSAL"
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
                    style: { fontSize: 11, fontWeight: 700, color: "#d4a556", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 16, textTransform: "uppercase" },
                    children: "Controls"
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Total Budget",
                    value: params.budget,
                    onChange: set("budget"),
                    min: 100,
                    max: 180,
                    step: 1,
                    unit: "B",
                    description: "FY2026 starting budget"
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Budget YoY Growth",
                    value: params.budgetGrowth,
                    onChange: set("budgetGrowth"),
                    min: 0,
                    max: 10,
                    step: 0.1,
                    unit: "%",
                    description: "Annual spending growth rate"
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Millionaires",
                    value: params.numMillionaires,
                    onChange: set("numMillionaires"),
                    min: 1e4,
                    max: 6e4,
                    step: 1e3,
                    unit: "",
                    description: "Starting millionaire tax filers"
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
                    description: `Current: 3.876% \xB7 Mamdani: 5.876%`
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
                    description: `Current: 7.75% \xB7 Mamdani: 11.5%`
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
                    description: `Current: 12.28% \xB7 Mamdani: 13.45%`
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Migration Sensitivity",
                    value: params.migrationSensitivity,
                    onChange: set("migrationSensitivity"),
                    min: 0,
                    max: 5,
                    step: 0.1,
                    unit: "x",
                    description: "Elasticity of out-migration to tax hikes"
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Pension Growth",
                    value: params.pensionGrowthRate,
                    onChange: set("pensionGrowthRate"),
                    min: 1,
                    max: 10,
                    step: 0.1,
                    unit: "%",
                    description: "Annual pension obligation growth"
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Benefits Growth",
                    value: params.benefitsGrowthRate,
                    onChange: set("benefitsGrowthRate"),
                    min: 1,
                    max: 15,
                    step: 0.1,
                    unit: "%",
                    description: "Health insurance & OPEB growth (12.2% approved for FY26)"
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Salary Growth",
                    value: params.salaryGrowthRate,
                    onChange: set("salaryGrowthRate"),
                    min: 0,
                    max: 8,
                    step: 0.1,
                    unit: "%",
                    description: "Annual salary/wage growth for 302K employees"
                  }),
                  /* @__PURE__ */ jsx(Knob, {
                    label: "Base Revenue Growth",
                    value: params.revenueGrowth,
                    onChange: set("revenueGrowth"),
                    min: 0,
                    max: 6,
                    step: 0.1,
                    unit: "%",
                    description: "Non-tax revenue annual growth"
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
                  /* @__PURE__ */ jsxs("div", {
                    style: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 },
                    children: [
                      /* @__PURE__ */ jsx(StatBox, {
                        label: "FY2036 Gap",
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
                          flex: 3,
                          minWidth: 320,
                          background: "rgba(74,157,232,0.04)"
                        },
                        children: [
                          /* @__PURE__ */ jsxs("div", {
                            style: { fontSize: 10, fontWeight: 700, color: "#4a9de8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "baseline" },
                            children: [
                              /* @__PURE__ */ jsxs("span", {
                                children: [
                                  "\u2B24 FIXED COSTS \u2014 ",
                                  fixedCostPctFinal,
                                  "% of budget"
                                ]
                              }),
                              /* @__PURE__ */ jsx("span", {
                                style: { fontSize: 16, color: fixedCostPctFinal > 75 ? "#e85d4a" : "#4a9de8" },
                                children: fmt(lastYear.fixedCosts)
                              })
                            ]
                          }),
                          /* @__PURE__ */ jsxs("div", {
                            style: { display: "flex", gap: 8, flexWrap: "wrap" },
                            children: [
                              /* @__PURE__ */ jsx(StatBox, {
                                label: "Salaries",
                                value: `${salaryPctFinal}%`,
                                sub: fmt(lastYear.salarySpend),
                                color: "#6ab0d4"
                              }),
                              /* @__PURE__ */ jsx(StatBox, {
                                label: "Pensions",
                                value: `${pensionPctFinal}%`,
                                sub: fmt(lastYear.pensionSpend),
                                color: "#b088d4"
                              }),
                              /* @__PURE__ */ jsx(StatBox, {
                                label: "Benefits",
                                value: `${benefitsPctFinal}%`,
                                sub: fmt(lastYear.benefitsSpend),
                                color: "#e088a8"
                              }),
                              /* @__PURE__ */ jsx(StatBox, {
                                label: "Debt Service",
                                value: `${(lastYear.debtService / lastYear.totalBudget * 100).toFixed(1)}%`,
                                sub: fmt(lastYear.debtService),
                                color: "#e8a84a"
                              })
                            ]
                          })
                        ]
                      }),
                      /* @__PURE__ */ jsx(StatBox, {
                        label: "Millionaire Exodus",
                        value: fmtK(totalMillionaireLoss),
                        sub: `${(totalMillionaireLoss / firstYear.millionaires * 100).toFixed(1)}% of base`,
                        color: totalMillionaireLoss > 0 ? "#e8a84a" : "#5cb85c"
                      })
                    ]
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
                            style: { fontSize: 10, color: "#8a7e6e", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" },
                            children: "Population breakdown \u2014 8.3M residents"
                          }),
                          /* @__PURE__ */ jsxs("div", {
                            style: { display: "flex", height: 36, borderRadius: 4, overflow: "hidden", border: "1px solid #2a2520" },
                            children: [
                              /* @__PURE__ */ jsx("div", {
                                style: {
                                  width: `${(302e3 / 83e5 * 100).toFixed(1)}%`,
                                  minWidth: 48,
                                  background: "#4a9de8",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 9,
                                  fontWeight: 700,
                                  fontFamily: "'JetBrains Mono', monospace",
                                  color: "#141210"
                                },
                                children: "302K"
                              }),
                              /* @__PURE__ */ jsx("div", {
                                style: {
                                  width: `${(1e6 / 83e5 * 100).toFixed(1)}%`,
                                  minWidth: 48,
                                  background: "#b088d4",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 9,
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
                                children: "7M other residents"
                              })
                            ]
                          }),
                          /* @__PURE__ */ jsxs("div", {
                            style: { display: "flex", gap: 16, marginTop: 6, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" },
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
                                    children: "City employees (3.6%)"
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
                                    children: "Public school students (~1M)"
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
                          const perEmployee = lastYear.fixedCosts / 0.302 * 1e3;
                          const perResident = lastYear.totalBudget / 8.3 * 1e3;
                          const perStudent = lastYear.totalBudget * 0.22 / 1 * 1e3;
                          const fmtDollar = (d) => d >= 1e6 ? `$${(d / 1e6).toFixed(1)}M` : d >= 1e3 ? `$${(d / 1e3).toFixed(0)}K` : `$${d.toFixed(0)}`;
                          return /* @__PURE__ */ jsxs(Fragment, {
                            children: [
                              /* @__PURE__ */ jsxs("div", {
                                style: { flex: 1, minWidth: 150, background: "rgba(74,157,232,0.08)", border: "1px solid #4a9de8", borderRadius: 6, padding: "10px 12px" },
                                children: [
                                  /* @__PURE__ */ jsx("div", {
                                    style: { fontSize: 10, color: "#4a9de8", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 },
                                    children: "Per City Employee"
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: { fontSize: 22, fontWeight: 700, color: "#4a9de8", fontFamily: "'JetBrains Mono', monospace" },
                                    children: fmtDollar(perEmployee)
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: { fontSize: 10, color: "#6b6157", marginTop: 2 },
                                    children: "fixed costs \xF7 302K workers"
                                  })
                                ]
                              }),
                              /* @__PURE__ */ jsxs("div", {
                                style: { flex: 1, minWidth: 150, background: "rgba(30,27,22,0.7)", border: "1px solid #3a342a", borderRadius: 6, padding: "10px 12px" },
                                children: [
                                  /* @__PURE__ */ jsx("div", {
                                    style: { fontSize: 10, color: "#8a7e6e", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 },
                                    children: "Per Resident"
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: { fontSize: 22, fontWeight: 700, color: "#f0e6d3", fontFamily: "'JetBrains Mono', monospace" },
                                    children: fmtDollar(perResident)
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: { fontSize: 10, color: "#6b6157", marginTop: 2 },
                                    children: "total budget \xF7 8.3M people"
                                  })
                                ]
                              }),
                              /* @__PURE__ */ jsxs("div", {
                                style: { flex: 1, minWidth: 150, background: "rgba(176,136,212,0.08)", border: "1px solid #b088d4", borderRadius: 6, padding: "10px 12px" },
                                children: [
                                  /* @__PURE__ */ jsx("div", {
                                    style: { fontSize: 10, color: "#b088d4", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 },
                                    children: "Per Student"
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: { fontSize: 22, fontWeight: 700, color: "#b088d4", fontFamily: "'JetBrains Mono', monospace" },
                                    children: fmtDollar(perStudent)
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: { fontSize: 10, color: "#6b6157", marginTop: 2 },
                                    children: "22% of budget \xF7 ~1M students \xB7 middling outcomes"
                                  })
                                ]
                              }),
                              /* @__PURE__ */ jsxs("div", {
                                style: { flex: 1, minWidth: 150, background: "rgba(30,27,22,0.7)", border: "1px dashed #3a342a", borderRadius: 6, padding: "10px 12px" },
                                children: [
                                  /* @__PURE__ */ jsx("div", {
                                    style: { fontSize: 10, color: "#6b6157", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 },
                                    children: "Tokyo comparison*"
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: { fontSize: 22, fontWeight: 700, color: "#6b6157", fontFamily: "'JetBrains Mono', monospace" },
                                    children: "~$4K"
                                  }),
                                  /* @__PURE__ */ jsx("div", {
                                    style: { fontSize: 10, color: "#6b6157", marginTop: 2, lineHeight: 1.4 },
                                    children: "TMG budget \xF7 14M people \xB7 *Healthcare, pensions & welfare are national-level in Japan; NYC handles them locally, inflating the comparison \u2014 but the gap is still enormous"
                                  })
                                ]
                              })
                            ]
                          });
                        })()
                      })
                    ]
                  }),
                  /* @__PURE__ */ jsxs(SectionTitle, {
                    children: [
                      "Budget vs Revenue \xB7 ",
                      /* @__PURE__ */ jsx("span", {
                        style: { color: "#4a9de8" },
                        children: "Fixed Costs"
                      }),
                      " Overlay"
                    ]
                  }),
                  /* @__PURE__ */ jsx("div", {
                    style: { background: "rgba(20,18,16,0.6)", border: "1px solid #2a2520", borderRadius: 8, padding: "16px 8px" },
                    children: /* @__PURE__ */ jsx(ResponsiveContainer, {
                      width: "100%",
                      height: 320,
                      children: /* @__PURE__ */ jsxs(ComposedChart, {
                        data,
                        margin: chartMargin,
                        children: [
                          /* @__PURE__ */ jsx(CartesianGrid, {
                            strokeDasharray: "3 3",
                            stroke: "#2a2520"
                          }),
                          /* @__PURE__ */ jsx(XAxis, {
                            dataKey: "year",
                            tick: { fill: "#6b6157", fontSize: 11, fontFamily: "JetBrains Mono" }
                          }),
                          /* @__PURE__ */ jsx(YAxis, {
                            tick: { fill: "#6b6157", fontSize: 10, fontFamily: "JetBrains Mono" },
                            tickFormatter: (v) => `${v}B`
                          }),
                          /* @__PURE__ */ jsx(Tooltip, {
                            content: /* @__PURE__ */ jsx(CustomTooltip, {})
                          }),
                          /* @__PURE__ */ jsx(Legend, {
                            wrapperStyle: { fontSize: 10, fontFamily: "JetBrains Mono" }
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
                            name: "Salaries",
                            fill: "#6ab0d4",
                            fillOpacity: 0.2,
                            stroke: "#6ab0d4",
                            strokeWidth: 1.5
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
                          })
                        ]
                      })
                    })
                  }),
                  /* @__PURE__ */ jsx(SectionTitle, {
                    children: "Annual Budget Gap"
                  }),
                  /* @__PURE__ */ jsx("div", {
                    style: { background: "rgba(20,18,16,0.6)", border: "1px solid #2a2520", borderRadius: 8, padding: "16px 8px" },
                    children: /* @__PURE__ */ jsx(ResponsiveContainer, {
                      width: "100%",
                      height: 200,
                      children: /* @__PURE__ */ jsxs(BarChart, {
                        data,
                        margin: chartMargin,
                        children: [
                          /* @__PURE__ */ jsx(CartesianGrid, {
                            strokeDasharray: "3 3",
                            stroke: "#2a2520"
                          }),
                          /* @__PURE__ */ jsx(XAxis, {
                            dataKey: "year",
                            tick: { fill: "#6b6157", fontSize: 11, fontFamily: "JetBrains Mono" }
                          }),
                          /* @__PURE__ */ jsx(YAxis, {
                            tick: { fill: "#6b6157", fontSize: 10, fontFamily: "JetBrains Mono" },
                            tickFormatter: (v) => `${v}B`
                          }),
                          /* @__PURE__ */ jsx(Tooltip, {
                            content: /* @__PURE__ */ jsx(CustomTooltip, {})
                          }),
                          /* @__PURE__ */ jsx(ReferenceLine, {
                            y: 0,
                            stroke: "#3a342a"
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
                    style: { background: "rgba(20,18,16,0.6)", border: "1px solid #2a2520", borderRadius: 8, padding: "16px 8px" },
                    children: /* @__PURE__ */ jsx(ResponsiveContainer, {
                      width: "100%",
                      height: 220,
                      children: /* @__PURE__ */ jsxs(ComposedChart, {
                        data,
                        margin: chartMargin,
                        children: [
                          /* @__PURE__ */ jsx(CartesianGrid, {
                            strokeDasharray: "3 3",
                            stroke: "#2a2520"
                          }),
                          /* @__PURE__ */ jsx(XAxis, {
                            dataKey: "year",
                            tick: { fill: "#6b6157", fontSize: 11, fontFamily: "JetBrains Mono" }
                          }),
                          /* @__PURE__ */ jsx(YAxis, {
                            yAxisId: "left",
                            tick: { fill: "#6b6157", fontSize: 10, fontFamily: "JetBrains Mono" },
                            tickFormatter: (v) => `${(v / 1e3).toFixed(0)}K`
                          }),
                          /* @__PURE__ */ jsx(YAxis, {
                            yAxisId: "right",
                            orientation: "right",
                            tick: { fill: "#6b6157", fontSize: 10, fontFamily: "JetBrains Mono" },
                            tickFormatter: (v) => `${v}B`
                          }),
                          /* @__PURE__ */ jsx(Tooltip, {
                            content: /* @__PURE__ */ jsx(CustomTooltip, {})
                          }),
                          /* @__PURE__ */ jsx(Legend, {
                            wrapperStyle: { fontSize: 10, fontFamily: "JetBrains Mono" }
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
                    children: "Revenue Composition"
                  }),
                  /* @__PURE__ */ jsx("div", {
                    style: { background: "rgba(20,18,16,0.6)", border: "1px solid #2a2520", borderRadius: 8, padding: "16px 8px" },
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
                            tick: { fill: "#6b6157", fontSize: 11, fontFamily: "JetBrains Mono" }
                          }),
                          /* @__PURE__ */ jsx(YAxis, {
                            tick: { fill: "#6b6157", fontSize: 10, fontFamily: "JetBrains Mono" },
                            tickFormatter: (v) => `${v}B`
                          }),
                          /* @__PURE__ */ jsx(Tooltip, {
                            content: /* @__PURE__ */ jsx(CustomTooltip, {})
                          }),
                          /* @__PURE__ */ jsx(Legend, {
                            wrapperStyle: { fontSize: 10, fontFamily: "JetBrains Mono" }
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
                    style: { background: "rgba(20,18,16,0.6)", border: "1px solid #2a2520", borderRadius: 8, padding: 16, overflowX: "auto" },
                    children: /* @__PURE__ */ jsxs("table", {
                      style: { width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" },
                      children: [
                        /* @__PURE__ */ jsx("thead", {
                          children: /* @__PURE__ */ jsx("tr", {
                            style: { borderBottom: "1px solid #3a342a" },
                            children: ["Bracket", "Federal", "State", "City", "Total Rate", "Share of City Rev"].map((h) => /* @__PURE__ */ jsx("th", {
                              style: { textAlign: "left", padding: "8px 10px", color: "#8a7e6e", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" },
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
                                  style: { padding: "8px 10px", color: "#c4b5a0", whiteSpace: "pre-line", lineHeight: 1.3 },
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
                                  style: { padding: "8px 10px", color: b.cityRate > BASELINE.millionaireTaxRate ? "#e85d4a" : "#d4a556", fontWeight: b.cityRate > BASELINE.millionaireTaxRate ? 700 : 400 },
                                  children: [
                                    b.cityRate.toFixed(2),
                                    "%"
                                  ]
                                }),
                                /* @__PURE__ */ jsxs("td", {
                                  style: { padding: "8px 10px", color: "#f0e6d3", fontWeight: 700 },
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
                                  style: { padding: "8px 10px", color: "#b088d4", fontWeight: 600 },
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
                                  style: { padding: "8px 10px", color: params.corpTaxRate > BASELINE.corpTaxRate ? "#e85d4a" : "#d4a556", fontWeight: params.corpTaxRate > BASELINE.corpTaxRate ? 700 : 400 },
                                  children: [
                                    params.corpTaxRate.toFixed(2),
                                    "%"
                                  ]
                                }),
                                /* @__PURE__ */ jsxs("td", {
                                  style: { padding: "8px 10px", color: "#f0e6d3", fontWeight: 700 },
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
                            style: { fontSize: 10, fontWeight: 700, color: "#4a9de8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "baseline" },
                            children: [
                              /* @__PURE__ */ jsxs("span", {
                                children: [
                                  "\u2B24 FIXED COSTS \u2014 ",
                                  fixedCostPctFinal,
                                  "% of budget"
                                ]
                              }),
                              /* @__PURE__ */ jsx("span", {
                                style: { fontSize: 16, color: fixedCostPctFinal > 75 ? "#e85d4a" : "#4a9de8" },
                                children: fmt(lastYear.fixedCosts)
                              })
                            ]
                          }),
                          /* @__PURE__ */ jsxs("div", {
                            style: { display: "flex", gap: 8, flexWrap: "wrap" },
                            children: [
                              /* @__PURE__ */ jsx(StatBox, {
                                label: "Salaries",
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
                        sub: `${(lastYear.otherSpend / lastYear.totalBudget * 100).toFixed(1)}% of budget \u2014 this is parks, transit, housing, services`,
                        color: "#6b6157"
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
                      " This is a simplified model for illustrative purposes. Migration elasticity is based on academic literature (~1.5% out-migration per 1% tax increase, adjustable). Revenue projections assume Wall Street returns normalize. Pension growth reflects historical NYC actuarial trends. Benefits growth default of 8% reflects the 12.2% premium increase approved for FY2026 blended with long-term trends; the city's unfunded OPEB liability is ~$100B. Federal aid modeled as declining 2%/yr under current policy trajectory. Property tax revenue grows with assessed values at 2%/yr baseline. Starting figures derived from FY2025-2026 NYC budget data, Comptroller reports, CBC reports, and IBO analyses. The model does not account for recession scenarios, one-time federal shocks, or potential state bailouts."
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
