/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
// ─── Design Tokens ──────────────────────────────────────
// ─── Reusable Components ────────────────────────────────
// ─── Data ───────────────────────────────────────────────
/*─── Masthead ───*/
/*─── Hero Stats ───*/
/*─── I. Where the Money Goes ───*/
/*Budget breakdown pie*/
/*Growth rates chart*/
/*─── II. The Personnel Trap ───*/
/*Pension comparison table*/
/*─── III. Mamdani's Proposal ───*/
/*Tax comparison bars*/
/*New spending phase-in*/
/*─── IV. The Migration Problem ───*/
/*Millionaire decline chart*/
/*─── V. The Structural Trap ───*/
/*Cumulative gap projection*/
/*─── VI. What Would Actually Work ───*/
/*─── VII. The Sim ───*/
/*Footer*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import {useState, useMemo} from 'https://esm.sh/react';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend} from 'https://esm.sh/recharts';
export function NYCBudgetEssay() {
  // ─── Design Tokens ──────────────────────────────────────
  const T = {
    bg: '#0e0c0a',
    surface: '#161412',
    border: '#2a2520',
    borderLight: '#3a342a',
    gold: '#d4a556',
    red: '#e85d4a',
    green: '#5cb85c',
    blue: '#4a9de8',
    purple: '#b088d4',
    pink: '#e088a8',
    text: '#f0e6d3',
    textMuted: '#c4b5a0',
    textDim: '#8a7e6e',
    textFaint: '#6b6157',
    mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    serif: "'Newsreader', 'Georgia', 'Times New Roman', serif"
  };
  // ─── Reusable Components ────────────────────────────────
  const Stat = ({value, label, color = T.gold, sub}) => _jsxs("div", {
    style: {
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderTop: `3px solid ${color}`,
      borderRadius: 6,
      padding: '16px 18px',
      flex: '1 1 180px',
      minWidth: 160
    },
    children: [_jsx("div", {
      style: {
        fontFamily: T.mono,
        fontSize: 28,
        fontWeight: 700,
        color,
        lineHeight: 1.1,
        letterSpacing: '-0.02em'
      },
      children: value
    }), _jsx("div", {
      style: {
        fontFamily: T.mono,
        fontSize: 10,
        color: T.textDim,
        marginTop: 6,
        textTransform: 'uppercase',
        letterSpacing: '0.08em'
      },
      children: label
    }), sub && _jsx("div", {
      style: {
        fontFamily: T.serif,
        fontSize: 12,
        color: T.textFaint,
        marginTop: 4,
        lineHeight: 1.4
      },
      children: sub
    })]
  });
  const Callout = ({children, color = T.gold, label}) => _jsxs("div", {
    style: {
      background: `${color}08`,
      borderLeft: `3px solid ${color}`,
      borderRadius: '0 6px 6px 0',
      padding: '16px 20px',
      margin: '32px 0',
      fontSize: 15,
      fontFamily: T.serif,
      lineHeight: 1.8,
      color: T.textMuted
    },
    children: [label && _jsx("div", {
      style: {
        fontFamily: T.mono,
        fontSize: 9,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: 8,
        fontWeight: 700
      },
      children: label
    }), children]
  });
  const Pull = ({children}) => _jsx("div", {
    style: {
      borderTop: `1px solid ${T.borderLight}`,
      borderBottom: `1px solid ${T.borderLight}`,
      padding: '28px 0',
      margin: '36px 0',
      fontFamily: T.serif,
      fontSize: 22,
      fontWeight: 400,
      fontStyle: 'italic',
      lineHeight: 1.5,
      color: T.gold,
      textAlign: 'center',
      maxWidth: 600,
      marginLeft: 'auto',
      marginRight: 'auto'
    },
    children: children
  });
  const Divider = () => _jsxs("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '48px 0',
      gap: 12
    },
    children: [_jsx("div", {
      style: {
        height: 1,
        flex: 1,
        background: T.border
      }
    }), _jsx("div", {
      style: {
        color: T.textFaint,
        fontFamily: T.mono,
        fontSize: 10,
        letterSpacing: '0.2em'
      },
      children: "◆"
    }), _jsx("div", {
      style: {
        height: 1,
        flex: 1,
        background: T.border
      }
    })]
  });
  const SectionNum = ({n, title}) => _jsxs("div", {
    style: {
      margin: '48px 0 24px 0'
    },
    children: [_jsx("span", {
      style: {
        fontFamily: T.mono,
        fontSize: 11,
        color: T.gold,
        letterSpacing: '0.15em',
        fontWeight: 700
      },
      children: n
    }), _jsx("h2", {
      style: {
        fontFamily: T.serif,
        fontSize: 28,
        fontWeight: 400,
        color: T.text,
        margin: '8px 0 0 0',
        lineHeight: 1.3
      },
      children: title
    })]
  });
  const P = ({children}) => _jsx("p", {
    style: {
      fontFamily: T.serif,
      fontSize: 16,
      lineHeight: 1.85,
      color: T.textMuted,
      margin: '0 0 18px 0'
    },
    children: children
  });
  const ChartWrap = ({children, caption}) => _jsxs("div", {
    style: {
      margin: '32px 0',
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      padding: '20px 12px 12px 12px'
    },
    children: [children, caption && _jsx("div", {
      style: {
        fontFamily: T.mono,
        fontSize: 9,
        color: T.textFaint,
        textAlign: 'center',
        marginTop: 8,
        letterSpacing: '0.04em'
      },
      children: caption
    })]
  });
  const ChartTooltip = ({active, payload, label}) => {
    if (!active || !payload) return null;
    return _jsxs("div", {
      style: {
        background: T.surface,
        border: `1px solid ${T.borderLight}`,
        borderRadius: 4,
        padding: '6px 10px',
        fontFamily: T.mono,
        fontSize: 10
      },
      children: [_jsx("div", {
        style: {
          color: T.gold,
          fontWeight: 700,
          marginBottom: 3
        },
        children: label
      }), payload.map((p, i) => _jsxs("div", {
        style: {
          color: p.color || T.textMuted
        },
        children: [p.name, ":", ' ', typeof p.value === 'number' ? p.value >= 1 ? `$${p.value.toFixed(1)}B` : `${p.value}` : p.value]
      }, i))]
    });
  };
  // ─── Data ───────────────────────────────────────────────
  const budgetBreakdown = [{
    name: 'Compensation',
    value: 46.5,
    color: T.blue
  }, {
    name: 'Pensions',
    value: 10.5,
    color: T.purple
  }, {
    name: 'Benefits',
    value: 10.4,
    color: T.pink
  }, {
    name: 'Debt Service',
    value: 7.5,
    color: '#e8a84a'
  }, {
    name: 'Education (non-personnel)',
    value: 20,
    color: T.textFaint
  }, {
    name: 'Everything Else',
    value: 32.1,
    color: T.border
  }];
  const growthRates = [{
    name: 'Benefits',
    rate: 8.0,
    color: T.pink
  }, {
    name: 'Pensions',
    rate: 5.5,
    color: T.purple
  }, {
    name: 'Comp',
    rate: 3.2,
    color: T.blue
  }, {
    name: 'Revenue',
    rate: 2.8,
    color: T.green
  }, {
    name: 'Inflation',
    rate: 3.0,
    color: T.textFaint
  }];
  const millionaireDecline = [{
    year: '2010',
    share: 12.7
  }, {
    year: '2012',
    share: 12.1
  }, {
    year: '2014',
    share: 11.5
  }, {
    year: '2016',
    share: 10.8
  }, {
    year: '2018',
    share: 9.8
  }, {
    year: '2020',
    share: 9.3
  }, {
    year: '2022',
    share: 8.7
  }];
  const projectedGap = [{
    year: 2026,
    baseline: 0,
    withTax: 0,
    withBoth: 0
  }, {
    year: 2027,
    baseline: 3.8,
    withTax: -2.1,
    withBoth: 0.6
  }, {
    year: 2028,
    baseline: 6.7,
    withTax: 0.8,
    withBoth: 7.9
  }, {
    year: 2029,
    baseline: 9.2,
    withTax: 3.9,
    withBoth: 14.2
  }, {
    year: 2030,
    baseline: 12.1,
    withTax: 7.3,
    withBoth: 20.1
  }, {
    year: 2031,
    baseline: 15.4,
    withTax: 11.0,
    withBoth: 26.7
  }, {
    year: 2032,
    baseline: 19.0,
    withTax: 15.1,
    withBoth: 33.1
  }, {
    year: 2033,
    baseline: 23.0,
    withTax: 19.5,
    withBoth: 39.9
  }, {
    year: 2034,
    baseline: 27.4,
    withTax: 24.3,
    withBoth: 47.1
  }, {
    year: 2035,
    baseline: 32.2,
    withTax: 29.5,
    withBoth: 54.9
  }, {
    year: 2036,
    baseline: 37.5,
    withTax: 35.2,
    withBoth: 63.3
  }];
  const taxBurden = [{
    jurisdiction: 'NYC (proposed)',
    rate: 16.8,
    color: T.red
  }, {
    jurisdiction: 'California',
    rate: 13.3,
    color: T.textMuted
  }, {
    jurisdiction: 'New Jersey',
    rate: 10.75,
    color: T.textMuted
  }, {
    jurisdiction: 'Connecticut',
    rate: 6.99,
    color: T.textMuted
  }, {
    jurisdiction: 'Florida',
    rate: 0,
    color: T.green
  }, {
    jurisdiction: 'Texas',
    rate: 0,
    color: T.green
  }];
  const newSpending = [{
    name: 'Childcare',
    yr1: 1.0,
    yr4: 6.0
  }, {
    name: 'Housing',
    yr1: 0.5,
    yr4: 4.5
  }, {
    name: 'Class size',
    yr1: 0.54,
    yr4: 0.94
  }, {
    name: 'Mental health',
    yr1: 0.3,
    yr4: 1.0
  }, {
    name: 'Free buses',
    yr1: 0,
    yr4: 0.8
  }, {
    name: 'Parks',
    yr1: 0.2,
    yr4: 0.7
  }, {
    name: 'Other',
    yr1: 0.2,
    yr4: 0.44
  }];
  const pensionComparison = [{
    system: 'NYC (Tier 1-4)',
    type: 'Defined Benefit',
    workerOwns: 'No',
    funded: 'Partially',
    portable: 'No',
    taxpayerRisk: '100%'
  }, {
    system: 'Australia',
    type: 'Superannuation',
    workerOwns: 'Yes',
    funded: 'Fully',
    portable: 'Yes',
    taxpayerRisk: '0%'
  }, {
    system: 'Singapore',
    type: 'CPF',
    workerOwns: 'Yes',
    funded: 'Fully',
    portable: 'Yes',
    taxpayerRisk: '0%'
  }, {
    system: 'Netherlands',
    type: 'Collective DC',
    workerOwns: 'Partial',
    funded: 'Mostly',
    portable: 'Partial',
    taxpayerRisk: 'Low'
  }, {
    system: 'US Private',
    type: '401(k)',
    workerOwns: 'Yes',
    funded: 'Fully',
    portable: 'Yes',
    taxpayerRisk: '0%'
  }];
  return _jsxs("div", {
    style: {
      background: T.bg,
      color: T.text,
      minHeight: '100vh',
      padding: '40px 20px'
    },
    children: [_jsx("link", {
      href: "https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,600;1,400&family=JetBrains+Mono:wght@400;600;700&display=swap",
      rel: "stylesheet"
    }), _jsxs("div", {
      style: {
        maxWidth: 720,
        margin: '0 auto'
      },
      children: [_jsxs("div", {
        style: {
          textAlign: 'center',
          marginBottom: 48
        },
        children: [_jsx("div", {
          style: {
            fontFamily: T.mono,
            fontSize: 10,
            color: T.textFaint,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 16
          },
          children: "Analysis · February 2026"
        }), _jsx("h1", {
          style: {
            fontFamily: T.serif,
            fontSize: 38,
            fontWeight: 400,
            lineHeight: 1.2,
            color: T.text,
            margin: '0 0 16px 0'
          },
          children: "The Structural Trap"
        }), _jsx("div", {
          style: {
            fontFamily: T.serif,
            fontSize: 19,
            color: T.textDim,
            fontStyle: 'italic',
            lineHeight: 1.5,
            maxWidth: 540,
            margin: '0 auto 20px auto'
          },
          children: "NYC's $127 billion budget and the impossibility of progressive municipal governance"
        }), _jsx("div", {
          style: {
            fontFamily: T.mono,
            fontSize: 11,
            color: T.textFaint
          },
          children: "Matt Wonlaw"
        })]
      }), _jsxs("div", {
        style: {
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 40
        },
        children: [_jsx(Stat, {
          value: "$127B",
          label: "Annual Budget",
          sub: "More than the state of Florida"
        }), _jsx(Stat, {
          value: "$36K",
          label: "Per Student",
          sub: "2.3× national average",
          color: T.red
        }), _jsx(Stat, {
          value: "6.6%",
          label: "Of Population",
          sub: "Consumes ~60% of budget",
          color: T.blue
        }), _jsx(Stat, {
          value: "$5.4B",
          label: "Budget Gap",
          sub: "After $12B revised down",
          color: T.red
        })]
      }), _jsx(P, {
        children: "New York City spends $127 billion per year. That's more than the entire state of Florida — which has nearly three times the population. It spends $36,000 per student for below-average test scores, $15,000 per capita on city services, and directs 36% of its budget to low-income assistance versus 14% in comparable cities. By any measure, it is the most expensive municipal government in the Western world."
      }), _jsx(P, {
        children: "And it is broke."
      }), _jsx(P, {
        children: "Mayor Zohran Mamdani, the 34-year-old democratic socialist who took office in January 2026, inherited a structural deficit initially pegged at $12 billion, later revised to $5.4 billion after updated revenue projections, agency savings mandates, and a $1.5 billion state aid package from Governor Hochul. His preliminary budget, released February 17, presents what he frames as a binary choice: either Albany approves new taxes on millionaires and corporations, or the city imposes a 9.5% property tax hike on three million residential units."
      }), _jsxs(P, {
        children: ["What Mamdani cannot do — what the structural logic of progressive municipal governance makes ", _jsx("em", {
          children: "impossible"
        }), " — is cut spending. This essay explains why, and what it means."]
      }), _jsx(Divider, {}), _jsx(SectionNum, {
        n: "I.",
        title: "Where the Money Goes"
      }), _jsx(P, {
        children: "To understand why NYC's budget is unfixable by any mayor, you need to understand who gets paid."
      }), _jsx(P, {
        children: "The city employs 302,000 active workers and supports 250,000+ retirees. Total compensation runs $46.5 billion. Pensions cost $10.5 billion. Health benefits cost $10.4 billion. Debt service adds $7.5 billion. These four categories constitute roughly 59% of the total budget and are growing faster than revenue."
      }), _jsx(ChartWrap, {
        caption: "FY2026 BUDGET BREAKDOWN — $127B TOTAL",
        children: _jsxs("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center'
          },
          children: [_jsx(ResponsiveContainer, {
            width: 280,
            height: 280,
            children: _jsxs(PieChart, {
              children: [_jsx(Pie, {
                data: budgetBreakdown,
                cx: "50%",
                cy: "50%",
                innerRadius: 55,
                outerRadius: 120,
                dataKey: "value",
                stroke: T.bg,
                strokeWidth: 2,
                children: budgetBreakdown.map((d, i) => _jsx(Cell, {
                  fill: d.color
                }, i))
              }), _jsx(Tooltip, {
                content: _jsx(ChartTooltip, {})
              })]
            })
          }), _jsx("div", {
            style: {
              fontFamily: T.mono,
              fontSize: 11,
              lineHeight: 2.2
            },
            children: budgetBreakdown.map((d, i) => _jsxs("div", {
              children: [_jsx("span", {
                style: {
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: d.color,
                  marginRight: 8
                }
              }), _jsx("span", {
                style: {
                  color: T.textMuted
                },
                children: d.name
              }), _jsxs("span", {
                style: {
                  color: d.color,
                  fontWeight: 700,
                  marginLeft: 8
                },
                children: ["$", d.value, "B"]
              })]
            }, i))
          })]
        })
      }), _jsx(P, {
        children: "The remaining ~$52 billion covers everything New Yorkers think of as \"city services\": parks, transit, housing, sanitation, education operations, social services, infrastructure. This is what gets squeezed."
      }), _jsx(Callout, {
        color: T.red,
        label: "The 6.6% Problem",
        children: "552,000 people — 302,000 active employees and 250,000+ retirees — represent 6.6% of the city's 8.3 million residents. They consume roughly 60% of the city budget through compensation, pension payouts, and benefits. The other 93.4% of the population shares the remaining 40%."
      }), _jsx(P, {
        children: "The critical dynamic is the growth rates. Compensation grows at 3–3.5% via union contracts (with overtime growing faster — $2.9 billion per year and rising). Pensions have compounded at 4.6% annually since 2014. Benefits grow at roughly 8%, driven by healthcare costs that far outpace inflation. The FY2026 health insurance premium increase alone was 12.2%."
      }), _jsx(ChartWrap, {
        caption: "ANNUAL GROWTH RATES — COSTS vs. REVENUE",
        children: _jsx(ResponsiveContainer, {
          width: "100%",
          height: 200,
          children: _jsxs(BarChart, {
            data: growthRates,
            layout: "vertical",
            margin: {
              left: 70,
              right: 30,
              top: 5,
              bottom: 5
            },
            children: [_jsx(CartesianGrid, {
              strokeDasharray: "3 3",
              stroke: T.border,
              horizontal: false
            }), _jsx(XAxis, {
              type: "number",
              tick: {
                fill: T.textFaint,
                fontSize: 10,
                fontFamily: T.mono
              },
              tickFormatter: v => `${v}%`,
              domain: [0, 10]
            }), _jsx(YAxis, {
              type: "category",
              dataKey: "name",
              tick: {
                fill: T.textMuted,
                fontSize: 11,
                fontFamily: T.mono
              },
              width: 60
            }), _jsx(Tooltip, {
              content: _jsx(ChartTooltip, {})
            }), _jsx(Bar, {
              dataKey: "rate",
              name: "Growth Rate",
              radius: [0, 4, 4, 0],
              barSize: 20,
              children: growthRates.map((d, i) => _jsx(Cell, {
                fill: d.color
              }, i))
            })]
          })
        })
      }), _jsx(Pull, {
        children: "Run these rates forward ten years and fixed costs grow from ~$75 billion to roughly $115 billion — consuming an ever-larger share of a budget that revenue cannot keep pace with."
      }), _jsx(P, {
        children: "This is not corruption. It is not waste in the conventional sense. It is the accumulated product of decades of labor contracts, pension promises, and benefit structures negotiated between politicians who wanted labor peace and union leaders who wanted the best deal for their members. Every individual contract was rational. The aggregate is catastrophic."
      }), _jsx(Divider, {}), _jsx(SectionNum, {
        n: "II.",
        title: "The Personnel Trap"
      }), _jsx(P, {
        children: "New York State's constitution (Article V, §7) protects accrued pension benefits as a contractual obligation. Once promised, they cannot be diminished. Union contracts lock in salary trajectories of 3–3.5% annually. The city's attempt under Adams to shift retirees to Medicare Advantage was blocked by the courts. The unfunded liability for post-employment benefits stands at approximately $100 billion — money the city has promised to pay but set aside nothing for."
      }), _jsx(Callout, {
        color: T.purple,
        label: "The Golden Handcuffs",
        children: "Because pension benefits are heavily back-loaded — the last years of service are worth dramatically more than the first — employees face enormous financial penalties for leaving before retirement eligibility. Workers stay in jobs they've burned out of, agencies can't refresh their workforce, and the system optimizes for time served rather than performance. More subtly, workers under-save privately, becoming entirely dependent on the political system's continued willingness to honor promises made decades ago."
      }), _jsx(P, {
        children: "The defined benefit pension system was designed when government employment was lower-paying than the private sector, and generous pensions were the tradeoff for below-market wages. That equation flipped decades ago. Total compensation for NYC public employees now exceeds comparable private-sector roles — but the pension structure persists, and what was once deferred compensation for a genuine sacrifice became a bonus on top of competitive wages."
      }), _jsx(P, {
        children: "NYC's model is a genuine outlier. Other systems have solved this problem."
      }), _jsxs("div", {
        style: {
          margin: '32px 0',
          overflowX: 'auto'
        },
        children: [_jsxs("table", {
          style: {
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: T.mono,
            fontSize: 11,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 8
          },
          children: [_jsx("thead", {
            children: _jsx("tr", {
              children: ['System', 'Type', 'Worker Owns', 'Funded', 'Portable', 'Taxpayer Risk'].map(h => _jsx("th", {
                style: {
                  padding: '10px 12px',
                  textAlign: 'left',
                  color: T.textDim,
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  borderBottom: `1px solid ${T.borderLight}`
                },
                children: h
              }, h))
            })
          }), _jsx("tbody", {
            children: pensionComparison.map((r, i) => _jsxs("tr", {
              style: {
                borderBottom: `1px solid ${T.border}`
              },
              children: [_jsx("td", {
                style: {
                  padding: '10px 12px',
                  color: i === 0 ? T.red : T.gold,
                  fontWeight: 600
                },
                children: r.system
              }), _jsx("td", {
                style: {
                  padding: '10px 12px',
                  color: T.textMuted
                },
                children: r.type
              }), _jsx("td", {
                style: {
                  padding: '10px 12px',
                  color: r.workerOwns === 'Yes' ? T.green : r.workerOwns === 'No' ? T.red : T.textDim
                },
                children: r.workerOwns
              }), _jsx("td", {
                style: {
                  padding: '10px 12px',
                  color: r.funded === 'Fully' ? T.green : T.red
                },
                children: r.funded
              }), _jsx("td", {
                style: {
                  padding: '10px 12px',
                  color: r.portable === 'Yes' ? T.green : r.portable === 'No' ? T.red : T.textDim
                },
                children: r.portable
              }), _jsx("td", {
                style: {
                  padding: '10px 12px',
                  color: r.taxpayerRisk === '0%' ? T.green : r.taxpayerRisk === '100%' ? T.red : T.textDim,
                  fontWeight: 700
                },
                children: r.taxpayerRisk
              })]
            }, i))
          })]
        }), _jsx("div", {
          style: {
            fontFamily: T.mono,
            fontSize: 9,
            color: T.textFaint,
            marginTop: 6,
            textAlign: 'center'
          },
          children: "PENSION SYSTEMS COMPARED — NYC vs. THE WORLD"
        })]
      }), _jsx(P, {
        children: "Australia's superannuation puts 11.5% of salary into individual, portable, worker-owned accounts. Singapore's CPF mandates 37% contributions into accounts used for retirement, housing, and healthcare. The Netherlands uses collective defined contribution with benefit adjustment based on fund performance. All of them eliminated unfunded liabilities and the dependency dynamic. NYC could have followed any of these models. It chose instead to keep making promises it can't fund."
      }), _jsx(P, {
        children: "The few jurisdictions that have tried to cut pensions — Detroit through bankruptcy, Rhode Island through legislation, San Jose through referendum — demonstrate the pattern: legally constrained, politically radioactive, and when cuts do happen, they fall hardest on lower-income retirees who are least able to absorb them."
      }), _jsx(Divider, {}), _jsx(SectionNum, {
        n: "III.",
        title: "Mamdani's Proposal"
      }), _jsx(P, {
        children: "Facing a budget that can't be cut, Mamdani proposes to grow his way out through taxation."
      }), _jsx(ChartWrap, {
        caption: "TOP MARGINAL STATE+LOCAL INCOME TAX RATE — NYC PROPOSED vs. COMPETITORS",
        children: _jsx(ResponsiveContainer, {
          width: "100%",
          height: 220,
          children: _jsxs(BarChart, {
            data: taxBurden,
            layout: "vertical",
            margin: {
              left: 110,
              right: 30,
              top: 5,
              bottom: 5
            },
            children: [_jsx(CartesianGrid, {
              strokeDasharray: "3 3",
              stroke: T.border,
              horizontal: false
            }), _jsx(XAxis, {
              type: "number",
              tick: {
                fill: T.textFaint,
                fontSize: 10,
                fontFamily: T.mono
              },
              tickFormatter: v => `${v}%`,
              domain: [0, 20]
            }), _jsx(YAxis, {
              type: "category",
              dataKey: "jurisdiction",
              tick: {
                fill: T.textMuted,
                fontSize: 11,
                fontFamily: T.mono
              },
              width: 100
            }), _jsx(Tooltip, {
              content: _jsx(ChartTooltip, {})
            }), _jsx(Bar, {
              dataKey: "rate",
              name: "Rate",
              radius: [0, 4, 4, 0],
              barSize: 22,
              children: taxBurden.map((d, i) => _jsx(Cell, {
                fill: d.color
              }, i))
            })]
          })
        })
      }), _jsx(P, {
        children: "His preferred path requires Albany's approval: raise the city income tax on earnings above $1 million from 3.876% to 5.876%, and the corporate tax from 7.75% to 11.5%. Combined with federal and state rates, this would push the top personal marginal rate to approximately 16.8% and the combined corporate rate to 38.8% — both the highest of any jurisdiction in the United States. Under the SALT deduction cap, these taxes are effectively non-deductible."
      }), _jsx(P, {
        children: "If Albany blocks the income and corporate hikes — as Hochul has said she will — the fallback is a 9.5% property tax increase generating roughly $3.7 billion, hitting three million residential units. Landlords would pass increases to tenants, directly contradicting Mamdani's rent freeze pledge."
      }), _jsx(P, {
        children: "Static revenue estimates put the combined tax package at roughly $9 billion per year. Simultaneously, Mamdani has committed to new programs totaling $14.4 billion annually at full scale."
      }), _jsx(ChartWrap, {
        caption: "NEW SPENDING COMMITMENTS — YEAR 1 vs. FULL SCALE (YR 4+)",
        children: _jsx(ResponsiveContainer, {
          width: "100%",
          height: 250,
          children: _jsxs(BarChart, {
            data: newSpending,
            layout: "vertical",
            margin: {
              left: 90,
              right: 30,
              top: 5,
              bottom: 5
            },
            children: [_jsx(CartesianGrid, {
              strokeDasharray: "3 3",
              stroke: T.border,
              horizontal: false
            }), _jsx(XAxis, {
              type: "number",
              tick: {
                fill: T.textFaint,
                fontSize: 10,
                fontFamily: T.mono
              },
              tickFormatter: v => `$${v}B`
            }), _jsx(YAxis, {
              type: "category",
              dataKey: "name",
              tick: {
                fill: T.textMuted,
                fontSize: 11,
                fontFamily: T.mono
              },
              width: 80
            }), _jsx(Tooltip, {
              content: _jsx(ChartTooltip, {})
            }), _jsx(Legend, {
              wrapperStyle: {
                fontFamily: T.mono,
                fontSize: 10
              }
            }), _jsx(Bar, {
              dataKey: "yr1",
              name: "Year 1",
              fill: T.gold,
              radius: [0, 4, 4, 0],
              barSize: 12
            }), _jsx(Bar, {
              dataKey: "yr4",
              name: "Year 4+",
              fill: T.red,
              radius: [0, 4, 4, 0],
              barSize: 12
            })]
          })
        })
      }), _jsxs("div", {
        style: {
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          margin: '28px 0'
        },
        children: [_jsx(Stat, {
          value: "~$9B",
          label: "New Tax Revenue (static)",
          color: T.green,
          sub: "Before migration & base erosion"
        }), _jsx(Stat, {
          value: "~$14.4B",
          label: "New Spending at Full Scale",
          color: T.red,
          sub: "Growing at 3%+ annually"
        }), _jsx(Stat, {
          value: "-$5.4B",
          label: "Net Shortfall",
          color: T.red,
          sub: "Even taking taxes at face value"
        })]
      }), _jsx(P, {
        children: "The math doesn't work, and it doesn't work for reasons that go beyond the usual budget-hawk objections. Even taking the static revenue estimate at face value — $9 billion — it falls $5.4 billion short of new spending at full scale, on top of the existing structural deficit. And the static estimate is itself a fiction, because it ignores behavioral responses."
      }), _jsx(Divider, {}), _jsx(SectionNum, {
        n: "IV.",
        title: "The Migration Problem"
      }), _jsx(P, {
        children: "New York's millionaire tax base is both enormous and fragile. Approximately 34,000 filers report income above $1 million, and this small group — the top 1% — pays roughly 40% of the city's personal income tax. The city's entire fiscal structure sits on a base of people who have maximal ability and, post-SALT cap, maximal incentive to leave."
      }), _jsx(P, {
        children: "They have been leaving."
      }), _jsx(ChartWrap, {
        caption: "NY STATE'S SHARE OF US MILLIONAIRES — Source: Empire Center / IRS SOI",
        children: _jsx(ResponsiveContainer, {
          width: "100%",
          height: 220,
          children: _jsxs(AreaChart, {
            data: millionaireDecline,
            margin: {
              left: 10,
              right: 30,
              top: 10,
              bottom: 5
            },
            children: [_jsx(CartesianGrid, {
              strokeDasharray: "3 3",
              stroke: T.border
            }), _jsx(XAxis, {
              dataKey: "year",
              tick: {
                fill: T.textFaint,
                fontSize: 11,
                fontFamily: T.mono
              }
            }), _jsx(YAxis, {
              tick: {
                fill: T.textFaint,
                fontSize: 10,
                fontFamily: T.mono
              },
              tickFormatter: v => `${v}%`,
              domain: [6, 14]
            }), _jsx(Tooltip, {
              content: _jsx(ChartTooltip, {})
            }), _jsx(Area, {
              type: "monotone",
              dataKey: "share",
              name: "Share of US Millionaires",
              fill: T.gold,
              fillOpacity: 0.15,
              stroke: T.gold,
              strokeWidth: 2
            })]
          })
        })
      }), _jsx(P, {
        children: "New York's share of US millionaires fell from 12.7% in 2010 to 8.7% in 2022 — a decline that accelerated after the SALT cap was imposed in 2017 and again during COVID. Academic research (Kleven et al., 2019) finds tax elasticities of migration between 1.2 and 1.8 for high earners. The issue for NYC is that the changes being proposed are not moderate. A 2 percentage point city increase, layered on top of already-highest-in-the-nation state rates, with SALT non-deductibility making every dollar of tax a dollar of real cost — this is uncharted territory."
      }), _jsx(Callout, {
        color: T.gold,
        label: "Corporate Base Erosion",
        children: "Firms don't primarily relocate when corporate taxes rise — they engage in profit-shifting through transfer pricing, reduce local activity, and restructure to minimize taxable presence. Giroud and Rauh (2019) find employment elasticities of -0.4 to -0.5 per percentage point. For Mamdani's proposed 3.75pp hike, the literature implies 18–25% erosion of the corporate tax base over five years."
      }), _jsx(Divider, {}), _jsx(SectionNum, {
        n: "V.",
        title: "The Structural Trap"
      }), _jsx(P, {
        children: "A progressive mayor of New York City cannot cut spending because the city's workforce is the political base of progressive governance. Public sector unions are the institutional core of Democratic politics in the city. A democratic socialist mayor asking public employees to accept reduced benefits would be committing political suicide with the very coalition that elected him."
      }), _jsx(P, {
        children: "But he also cannot meaningfully grow revenue through taxation without triggering the behavioral responses that erode the tax base. The people and corporations being asked to pay are precisely those with the most resources and mobility to leave."
      }), _jsx(ChartWrap, {
        caption: "CUMULATIVE BUDGET GAP — THREE SCENARIOS (FY2026–2036)",
        children: _jsx(ResponsiveContainer, {
          width: "100%",
          height: 280,
          children: _jsxs(AreaChart, {
            data: projectedGap,
            margin: {
              left: 10,
              right: 30,
              top: 10,
              bottom: 5
            },
            children: [_jsx(CartesianGrid, {
              strokeDasharray: "3 3",
              stroke: T.border
            }), _jsx(XAxis, {
              dataKey: "year",
              tick: {
                fill: T.textFaint,
                fontSize: 11,
                fontFamily: T.mono
              }
            }), _jsx(YAxis, {
              tick: {
                fill: T.textFaint,
                fontSize: 10,
                fontFamily: T.mono
              },
              tickFormatter: v => `$${v}B`
            }), _jsx(Tooltip, {
              content: _jsx(ChartTooltip, {})
            }), _jsx(Legend, {
              wrapperStyle: {
                fontFamily: T.mono,
                fontSize: 10
              }
            }), _jsx(Area, {
              type: "monotone",
              dataKey: "baseline",
              name: "Do Nothing",
              fill: T.textFaint,
              fillOpacity: 0.1,
              stroke: T.textFaint,
              strokeWidth: 2
            }), _jsx(Area, {
              type: "monotone",
              dataKey: "withTax",
              name: "+ Mamdani Taxes",
              fill: T.gold,
              fillOpacity: 0.1,
              stroke: T.gold,
              strokeWidth: 2
            }), _jsx(Area, {
              type: "monotone",
              dataKey: "withBoth",
              name: "+ Taxes & Spending",
              fill: T.red,
              fillOpacity: 0.15,
              stroke: T.red,
              strokeWidth: 2.5
            })]
          })
        })
      }), _jsx(Pull, {
        children: "The result is a fiscal position that degrades on autopilot. Fixed costs grow at 4–8%. Revenue grows at 2–3%. The gap widens every year. Each year's budget is balanced through one-time measures that make the following year worse."
      }), _jsx(P, {
        children: "This is not unique to Mamdani. De Blasio faced the same dynamic with more favorable tailwinds. Adams faced it with less political capital. The structural trap is a feature of the system, not a bug in any particular administration."
      }), _jsx(Callout, {
        color: T.pink,
        label: "The Intergenerational Transfer",
        children: "Current taxpayers fund retirements promised by politicians who left office twenty years ago, to workers who retired a decade ago, under contracts negotiated by union leaders who are themselves now retired. No one currently at the table made the promise, but everyone is stuck paying for it. This creates a ratchet: each generation of politicians agrees to pension enhancements whose costs materialize decades later. The politician gets the labor peace; the future mayor gets the bill."
      }), _jsx(Divider, {}), _jsx(SectionNum, {
        n: "VI.",
        title: "What Would Actually Work"
      }), _jsx(P, {
        children: "If you take the analysis seriously, the only paths that resolve the structural crisis are ones that no current political actor has the incentive to pursue:"
      }), _jsx("div", {
        style: {
          margin: '24px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        },
        children: [{
          title: 'Pension reform for new hires',
          desc: 'Move to defined contribution or hybrid. Takes 25+ years to fully phase in. No mayor serves that long.',
          feasibility: 'Constitutional',
          time: '25+ yrs'
        }, {
          title: 'Healthcare cost discipline',
          desc: 'Meaningful cost-sharing: deductibles, premium contributions, network constraints. Requires union consent.',
          feasibility: 'Political',
          time: '5-10 yrs'
        }, {
          title: 'Workforce right-sizing',
          desc: 'NYC employs ~36 workers per 1,000 residents vs. ~15 national average. 10-15% reduction through attrition.',
          feasibility: 'Political',
          time: '10 yrs'
        }, {
          title: 'Federal SALT reform',
          desc: 'Restoring deductibility would reduce effective burden 30-40%, cutting migration incentives.',
          feasibility: 'Federal',
          time: 'Unknown'
        }, {
          title: 'State cost assumption',
          desc: 'NYC sends 54.5% of state revenue, gets 40.5% back. Shift Medicaid, pensions, education to state.',
          feasibility: 'Albany',
          time: '3-5 yrs'
        }].map((item, i) => _jsxs("div", {
          style: {
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            padding: '14px 18px',
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start'
          },
          children: [_jsxs("div", {
            style: {
              flex: 1
            },
            children: [_jsx("div", {
              style: {
                fontFamily: T.mono,
                fontSize: 12,
                color: T.gold,
                fontWeight: 700,
                marginBottom: 4
              },
              children: item.title
            }), _jsx("div", {
              style: {
                fontFamily: T.serif,
                fontSize: 14,
                color: T.textMuted,
                lineHeight: 1.6
              },
              children: item.desc
            })]
          }), _jsxs("div", {
            style: {
              textAlign: 'right',
              flexShrink: 0
            },
            children: [_jsx("div", {
              style: {
                fontFamily: T.mono,
                fontSize: 9,
                color: T.red,
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              },
              children: item.feasibility
            }), _jsx("div", {
              style: {
                fontFamily: T.mono,
                fontSize: 10,
                color: T.textFaint,
                marginTop: 2
              },
              children: item.time
            })]
          })]
        }, i))
      }), _jsx(P, {
        children: "None of these are politically viable under current conditions. Which is the point."
      }), _jsx(Divider, {}), _jsx(SectionNum, {
        n: "VII.",
        title: "The Simulator"
      }), _jsx(P, {
        children: "I've built an interactive budget simulator that lets you test these dynamics yourself. Toggle Mamdani's tax proposals and spending commitments independently, adjust migration sensitivity and corporate base erosion rates, and watch the ten-year fiscal trajectory shift in real time."
      }), _jsx(P, {
        children: "The defaults reflect current policy: no new taxes, no new programs, just the existing budget growing at its structural rates. The gap widens every year even doing nothing. Toggle on the taxes and revenue lines jump — then sag as millionaires leave and corporate bases erode. Toggle on spending and the gap explodes. Apply both and you see the structural trap in full: the taxes can't keep up with the spending, and both grow faster than the economy that funds them."
      }), _jsx(P, {
        children: "Every knob has a citation. The model is deliberately simplified — it doesn't account for recessions, federal shocks, or state bailouts — but the structural dynamics it captures are real, documented, and on their current trajectory, inescapable."
      }), _jsxs("div", {
        style: {
          marginTop: 56,
          paddingTop: 24,
          borderTop: `1px solid ${T.border}`,
          textAlign: 'center'
        },
        children: [_jsx("div", {
          style: {
            fontFamily: T.mono,
            fontSize: 9,
            color: T.textFaint,
            lineHeight: 1.8,
            maxWidth: 540,
            margin: '0 auto'
          },
          children: "Source data: NYC Office of Management and Budget, NYC Comptroller, Citizens Budget Commission, Independent Budget Office, Empire Center for Public Policy. Academic citations: Kleven et al. (2019), Giroud & Rauh (2019), Suárez Serrato & Zidar (NBER), Bruce/Deskins/Fox (Berkeley)."
        }), _jsx("div", {
          style: {
            fontFamily: T.serif,
            fontSize: 13,
            color: T.textDim,
            marginTop: 16,
            fontStyle: 'italic'
          },
          children: "Matt Wonlaw writes about systems, structures, and the things they produce at tantaman.substack.com"
        })]
      })]
    })]
  });
}
function _createMdxContent(props) {
  const _components = Object.assign({
    nav: "nav",
    ol: "ol"
  }, props.components);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.nav, {
      className: "toc",
      children: _jsx(_components.ol, {
        className: "toc-level toc-level-1"
      })
    }), "\n", "\n", _jsx(NYCBudgetEssay, {})]
  });
}
function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, Object.assign({}, props, {
    children: _jsx(_createMdxContent, props)
  })) : _createMdxContent(props);
}
export default MDXContent;
