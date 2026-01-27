/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
/*Main Result*/
/*Controls*/
/*Probability Curve*/
/*Strategy Comparison Table*/
/*Monte Carlo Section*/
/*Key Insights*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import {useState, useMemo} from 'https://esm.sh/react';
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine, Area, AreaChart} from 'https://esm.sh/recharts';
export function IntroArticle() {
  const [expanded, setExpanded] = useState(true);
  return _jsxs("div", {
    className: "bg-gray-800/50 rounded-xl border border-gray-700 mb-8 overflow-hidden",
    children: [_jsxs("button", {
      onClick: () => setExpanded(!expanded),
      className: "w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-800/80 transition-colors",
      children: [_jsx("span", {
        className: "text-lg font-medium text-gray-200",
        children: "The Thesis: Luck Is a Probability Distribution"
      }), _jsx("span", {
        className: "text-cyan-400 text-xl",
        children: expanded ? '−' : '+'
      })]
    }), expanded && _jsxs("div", {
      className: "px-6 pb-6 text-gray-300 space-y-4 leading-relaxed",
      children: [_jsxs("p", {
        children: ["\"They just got lucky.\" It's the most common dismissal of success—and it contains a kernel of truth that obscures a deeper reality. Yes, successful outcomes involve chance. But luck isn't a mystical force that arbitrarily blesses some and curses others. ", _jsx("strong", {
          className: "text-cyan-400",
          children: "Luck is outcomes drawn from probability distributions, and you can systematically position yourself within those distributions."
        })]
      }), _jsxs("p", {
        children: ["Consider what \"getting lucky\" actually means: it's having an outcome exceed some threshold—getting funded, landing the job, the investment paying off. Each attempt you make is a draw from a probability distribution. The key insight is that you control two variables: ", _jsx("em", {
          children: "how many times you draw"
        }), ", and ", _jsx("em", {
          children: "what distribution you're drawing from"
        }), "."]
      }), _jsxs("div", {
        className: "bg-gray-900/50 rounded-lg p-4 my-4 border-l-4 border-cyan-500",
        children: [_jsxs("p", {
          className: "text-sm",
          children: [_jsx("strong", {
            className: "text-cyan-400",
            children: "The Core Formula:"
          }), " If you have a probability ", _jsx("em", {
            children: "p"
          }), " of success on any single attempt, your probability of at least one success in ", _jsx("em", {
            children: "n"
          }), " attempts is:"]
        }), _jsxs("p", {
          className: "text-center my-3 font-mono text-cyan-400",
          children: ["P(success) = 1 − (1 − p)", _jsx("sup", {
            children: "n"
          })]
        }), _jsxs("p", {
          className: "text-sm",
          children: ["This approaches 1 as ", _jsx("em", {
            children: "n"
          }), " grows. For ", _jsx("em", {
            children: "any"
          }), " positive probability, enough attempts guarantees success. Luck becomes a matter of time."]
        })]
      }), _jsx("p", {
        children: "But there's more. You don't have to accept the baseline probability. Through positioning—visibility, skill, network, timing—you multiply your odds on each attempt. These multipliers compound: four factors each providing 2× improvement combine to 16×. A 1% baseline becomes 16%. Suddenly you need 13 attempts for 90% confidence instead of 230."
      }), _jsx("p", {
        children: "This reframes the entire conversation about luck and success:"
      }), _jsxs("ul", {
        className: "list-none space-y-2 ml-4",
        children: [_jsxs("li", {
          className: "flex items-start gap-2",
          children: [_jsx("span", {
            className: "text-cyan-400 mt-1",
            children: "→"
          }), _jsxs("span", {
            children: [_jsx("strong", {
              className: "text-gray-200",
              children: "Hard work in visible places"
            }), " increases your multiplier—you're not just working, you're working where decision-makers can see the results."]
          })]
        }), _jsxs("li", {
          className: "flex items-start gap-2",
          children: [_jsx("span", {
            className: "text-cyan-400 mt-1",
            children: "→"
          }), _jsxs("span", {
            children: [_jsx("strong", {
              className: "text-gray-200",
              children: "Taking many shots"
            }), " increases your attempts—entrepreneurship, investing, career moves, side projects all count."]
          })]
        }), _jsxs("li", {
          className: "flex items-start gap-2",
          children: [_jsx("span", {
            className: "text-cyan-400 mt-1",
            children: "→"
          }), _jsxs("span", {
            children: [_jsx("strong", {
              className: "text-gray-200",
              children: "Dollar-cost averaging"
            }), " spreads attempts over time, reducing variance from environmental fluctuations."]
          })]
        }), _jsxs("li", {
          className: "flex items-start gap-2",
          children: [_jsx("span", {
            className: "text-cyan-400 mt-1",
            children: "→"
          }), _jsxs("span", {
            children: [_jsx("strong", {
              className: "text-gray-200",
              children: "Survival"
            }), "—not going bankrupt, not burning out—ensures you get to make all your attempts."]
          })]
        })]
      }), _jsx("p", {
        children: "The person who \"got lucky\" with a successful startup wasn't touched by fortune's arbitrary hand. They positioned themselves with a 3× visibility multiplier (they were in the ecosystem), 2× quality multiplier (they built skills), 2× network multiplier (they knew people who knew people), and 2× timing multiplier (they picked a growing market). That 24× multiplier, combined with making 12 real attempts over a career, gave them a 25%+ probability of success. Add diversified investments and the probability climbs higher."
      }), _jsx("p", {
        children: "The dice roll was real. But they had loaded the dice and rolled enough times that success was probable, not miraculous."
      }), _jsx("p", {
        className: "text-gray-400 italic",
        children: "Use the simulator below to explore this yourself. Adjust the parameters and watch how quickly \"luck\" transforms from a low-probability hope into a near-certainty—not through magic, but through mathematics."
      })]
    })]
  });
}
export function LuckSimulation() {
  const [baseProb, setBaseProb] = useState(1);
  const [visibilityMult, setVisibilityMult] = useState(2);
  const [qualityMult, setQualityMult] = useState(2);
  const [networkMult, setNetworkMult] = useState(1.5);
  const [timingMult, setTimingMult] = useState(1.5);
  const [maxAttempts, setMaxAttempts] = useState(50);
  const [survivalFactor, setSurvivalFactor] = useState(100);
  const [simCount, setSimCount] = useState(1000);
  const [showMonteCarlo, setShowMonteCarlo] = useState(false);
  const effectiveMultiplier = visibilityMult * qualityMult * networkMult * timingMult;
  const effectiveProb = Math.min(baseProb / 100 * effectiveMultiplier, 1);
  const effectiveAttempts = Math.floor(maxAttempts * (survivalFactor / 100));
  const probabilityCurve = useMemo(() => {
    const data = [];
    for (let n = 0; n <= maxAttempts; n++) {
      const pBase = 1 - Math.pow(1 - baseProb / 100, n);
      const pPositioned = 1 - Math.pow(1 - effectiveProb, n);
      data.push({
        attempts: n,
        baseline: (pBase * 100).toFixed(2),
        positioned: (pPositioned * 100).toFixed(2)
      });
    }
    return data;
  }, [baseProb, effectiveProb, maxAttempts]);
  const monteCarloResults = useMemo(() => {
    if (!showMonteCarlo) return null;
    const baselineSuccesses = [];
    const positionedSuccesses = [];
    for (let sim = 0; sim < simCount; sim++) {
      let baseSuccess = 0;
      let posSuccess = 0;
      for (let attempt = 0; attempt < effectiveAttempts; attempt++) {
        if (Math.random() < baseProb / 100) baseSuccess++;
        if (Math.random() < effectiveProb) posSuccess++;
      }
      baselineSuccesses.push(baseSuccess);
      positionedSuccesses.push(posSuccess);
    }
    const maxSuccesses = Math.max(...positionedSuccesses, ...baselineSuccesses, 10);
    const histogram = [];
    for (let i = 0; i <= maxSuccesses; i++) {
      histogram.push({
        successes: i,
        baseline: baselineSuccesses.filter(x => x === i).length,
        positioned: positionedSuccesses.filter(x => x === i).length
      });
    }
    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const baselineAtLeastOne = baselineSuccesses.filter(x => x > 0).length / simCount;
    const positionedAtLeastOne = positionedSuccesses.filter(x => x > 0).length / simCount;
    return {
      histogram,
      stats: {
        baselineAvg: avg(baselineSuccesses).toFixed(2),
        positionedAvg: avg(positionedSuccesses).toFixed(2),
        baselineAtLeastOne: (baselineAtLeastOne * 100).toFixed(1),
        positionedAtLeastOne: (positionedAtLeastOne * 100).toFixed(1)
      }
    };
  }, [showMonteCarlo, simCount, effectiveAttempts, baseProb, effectiveProb]);
  const strategyComparison = useMemo(() => {
    const strategies = [{
      name: 'No positioning',
      mult: 1
    }, {
      name: 'Visibility only',
      mult: visibilityMult
    }, {
      name: 'Quality only',
      mult: qualityMult
    }, {
      name: 'Network only',
      mult: networkMult
    }, {
      name: 'Timing only',
      mult: timingMult
    }, {
      name: 'All combined',
      mult: effectiveMultiplier
    }];
    return strategies.map(s => {
      const p = Math.min(baseProb / 100 * s.mult, 1);
      const pSuccess = 1 - Math.pow(1 - p, effectiveAttempts);
      const attemptsFor90 = p > 0 ? Math.ceil(Math.log(0.1) / Math.log(1 - p)) : Infinity;
      return {
        ...s,
        effectiveProb: (p * 100).toFixed(2),
        successProb: (pSuccess * 100).toFixed(1),
        attemptsFor90: attemptsFor90 > 1000 ? '1000+' : attemptsFor90
      };
    });
  }, [baseProb, visibilityMult, qualityMult, networkMult, timingMult, effectiveMultiplier, effectiveAttempts]);
  const Slider = ({label, value, setValue, min, max, step, unit = ''}) => _jsxs("div", {
    className: "mb-4",
    children: [_jsxs("div", {
      className: "flex justify-between text-sm mb-1",
      children: [_jsx("span", {
        className: "text-gray-300",
        children: label
      }), _jsxs("span", {
        className: "text-cyan-400 font-mono",
        children: [value, unit]
      })]
    }), _jsx("input", {
      type: "range",
      min: min,
      max: max,
      step: step,
      value: value,
      onChange: e => setValue(parseFloat(e.target.value)),
      className: "w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
    })]
  });
  const finalProbability = (1 - Math.pow(1 - effectiveProb, effectiveAttempts)) * 100;
  return _jsx("div", {
    className: "text-gray-100 p-6",
    children: _jsxs("div", {
      className: "max-w-6xl mx-auto",
      children: [_jsx(IntroArticle, {}), _jsx("div", {
        className: "bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700",
        children: _jsxs("div", {
          className: "text-center",
          children: [_jsxs("div", {
            className: "text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400",
            children: [finalProbability.toFixed(1), "%"]
          }), _jsxs("div", {
            className: "text-gray-400 mt-2",
            children: ["Probability of at least one success in ", effectiveAttempts, " attempts"]
          }), _jsxs("div", {
            className: "text-sm text-gray-500 mt-1",
            children: ["Effective probability per attempt: ", (effectiveProb * 100).toFixed(2), "% (", effectiveMultiplier.toFixed(1), "x multiplier on ", baseProb, "% base)"]
          })]
        })
      }), _jsxs("div", {
        className: "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6",
        children: [_jsxs("div", {
          className: "bg-gray-800 rounded-xl p-6 border border-gray-700",
          children: [_jsx("h2", {
            className: "text-lg font-semibold text-cyan-400 mb-4",
            children: "Parameters"
          }), _jsx(Slider, {
            label: "Base probability per attempt",
            value: baseProb,
            setValue: setBaseProb,
            min: 0.1,
            max: 10,
            step: 0.1,
            unit: "%"
          }), _jsxs("div", {
            className: "border-t border-gray-700 my-4 pt-4",
            children: [_jsx("h3", {
              className: "text-sm text-gray-400 mb-3",
              children: "Position Multipliers"
            }), _jsx(Slider, {
              label: "Visibility (being seen)",
              value: visibilityMult,
              setValue: setVisibilityMult,
              min: 1,
              max: 5,
              step: 0.1,
              unit: "x"
            }), _jsx(Slider, {
              label: "Quality (skill/prep)",
              value: qualityMult,
              setValue: setQualityMult,
              min: 1,
              max: 5,
              step: 0.1,
              unit: "x"
            }), _jsx(Slider, {
              label: "Network (access)",
              value: networkMult,
              setValue: setNetworkMult,
              min: 1,
              max: 5,
              step: 0.1,
              unit: "x"
            }), _jsx(Slider, {
              label: "Timing (right field)",
              value: timingMult,
              setValue: setTimingMult,
              min: 1,
              max: 5,
              step: 0.1,
              unit: "x"
            })]
          }), _jsxs("div", {
            className: "border-t border-gray-700 my-4 pt-4",
            children: [_jsx(Slider, {
              label: "Maximum attempts",
              value: maxAttempts,
              setValue: setMaxAttempts,
              min: 1,
              max: 100,
              step: 1
            }), _jsx(Slider, {
              label: "Survival factor",
              value: survivalFactor,
              setValue: setSurvivalFactor,
              min: 10,
              max: 100,
              step: 5,
              unit: "%"
            })]
          })]
        }), _jsxs("div", {
          className: "lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700",
          children: [_jsx("h2", {
            className: "text-lg font-semibold text-cyan-400 mb-4",
            children: "Cumulative Success Probability"
          }), _jsx(ResponsiveContainer, {
            width: "100%",
            height: 300,
            children: _jsxs(AreaChart, {
              data: probabilityCurve,
              children: [_jsx(CartesianGrid, {
                strokeDasharray: "3 3",
                stroke: "#374151"
              }), _jsx(XAxis, {
                dataKey: "attempts",
                stroke: "#9CA3AF",
                label: {
                  value: 'Number of Attempts',
                  position: 'bottom',
                  fill: '#9CA3AF',
                  offset: -5
                }
              }), _jsx(YAxis, {
                stroke: "#9CA3AF",
                domain: [0, 100],
                label: {
                  value: 'P(≥1 success) %',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9CA3AF'
                }
              }), _jsx(Tooltip, {
                contentStyle: {
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151'
                },
                labelStyle: {
                  color: '#9CA3AF'
                }
              }), _jsx(Legend, {}), _jsx(ReferenceLine, {
                y: 90,
                stroke: "#EF4444",
                strokeDasharray: "5 5",
                label: {
                  value: '90%',
                  fill: '#EF4444',
                  position: 'right'
                }
              }), _jsx(Area, {
                type: "monotone",
                dataKey: "baseline",
                name: "Baseline",
                stroke: "#6B7280",
                fill: "#6B728033",
                strokeWidth: 2
              }), _jsx(Area, {
                type: "monotone",
                dataKey: "positioned",
                name: "Positioned",
                stroke: "#06B6D4",
                fill: "#06B6D433",
                strokeWidth: 2
              })]
            })
          }), _jsx("p", {
            className: "text-sm text-gray-500 mt-2 text-center",
            children: "Shaded area shows the gap positioning creates. Red line marks 90% confidence threshold."
          })]
        })]
      }), _jsxs("div", {
        className: "bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700",
        children: [_jsx("h2", {
          className: "text-lg font-semibold text-cyan-400 mb-4",
          children: "Strategy Comparison"
        }), _jsx("div", {
          className: "overflow-x-auto",
          children: _jsxs("table", {
            className: "w-full text-sm",
            children: [_jsx("thead", {
              children: _jsxs("tr", {
                className: "border-b border-gray-700",
                children: [_jsx("th", {
                  className: "text-left py-2 px-3 text-gray-400",
                  children: "Strategy"
                }), _jsx("th", {
                  className: "text-right py-2 px-3 text-gray-400",
                  children: "Multiplier"
                }), _jsx("th", {
                  className: "text-right py-2 px-3 text-gray-400",
                  children: "Prob/Attempt"
                }), _jsxs("th", {
                  className: "text-right py-2 px-3 text-gray-400",
                  children: ["P(success) in ", effectiveAttempts]
                }), _jsx("th", {
                  className: "text-right py-2 px-3 text-gray-400",
                  children: "Attempts for 90%"
                })]
              })
            }), _jsx("tbody", {
              children: strategyComparison.map((s, i) => _jsxs("tr", {
                className: `border-b border-gray-700/50 ${i === strategyComparison.length - 1 ? 'bg-cyan-900/20' : ''}`,
                children: [_jsx("td", {
                  className: "py-2 px-3",
                  children: s.name
                }), _jsxs("td", {
                  className: "text-right py-2 px-3 font-mono",
                  children: [s.mult.toFixed(1), "x"]
                }), _jsxs("td", {
                  className: "text-right py-2 px-3 font-mono",
                  children: [s.effectiveProb, "%"]
                }), _jsxs("td", {
                  className: "text-right py-2 px-3 font-mono text-cyan-400",
                  children: [s.successProb, "%"]
                }), _jsx("td", {
                  className: "text-right py-2 px-3 font-mono",
                  children: s.attemptsFor90
                })]
              }, i))
            })]
          })
        })]
      }), _jsxs("div", {
        className: "bg-gray-800 rounded-xl p-6 border border-gray-700",
        children: [_jsxs("div", {
          className: "flex items-center justify-between mb-4",
          children: [_jsx("h2", {
            className: "text-lg font-semibold text-cyan-400",
            children: "Monte Carlo Simulation"
          }), _jsx("button", {
            onClick: () => setShowMonteCarlo(!showMonteCarlo),
            className: "px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors",
            children: showMonteCarlo ? 'Hide Simulation' : 'Run Simulation'
          })]
        }), showMonteCarlo && _jsxs(_Fragment, {
          children: [_jsx(Slider, {
            label: "Number of simulations",
            value: simCount,
            setValue: setSimCount,
            min: 100,
            max: 5000,
            step: 100
          }), monteCarloResults && _jsxs(_Fragment, {
            children: [_jsxs("div", {
              className: "grid grid-cols-2 md:grid-cols-4 gap-4 my-4",
              children: [_jsxs("div", {
                className: "bg-gray-900 rounded-lg p-3 text-center",
                children: [_jsx("div", {
                  className: "text-2xl font-bold text-gray-400",
                  children: monteCarloResults.stats.baselineAvg
                }), _jsx("div", {
                  className: "text-xs text-gray-500",
                  children: "Baseline Avg Successes"
                })]
              }), _jsxs("div", {
                className: "bg-gray-900 rounded-lg p-3 text-center",
                children: [_jsx("div", {
                  className: "text-2xl font-bold text-cyan-400",
                  children: monteCarloResults.stats.positionedAvg
                }), _jsx("div", {
                  className: "text-xs text-gray-500",
                  children: "Positioned Avg Successes"
                })]
              }), _jsxs("div", {
                className: "bg-gray-900 rounded-lg p-3 text-center",
                children: [_jsxs("div", {
                  className: "text-2xl font-bold text-gray-400",
                  children: [monteCarloResults.stats.baselineAtLeastOne, "%"]
                }), _jsx("div", {
                  className: "text-xs text-gray-500",
                  children: "Baseline ≥1 Success"
                })]
              }), _jsxs("div", {
                className: "bg-gray-900 rounded-lg p-3 text-center",
                children: [_jsxs("div", {
                  className: "text-2xl font-bold text-cyan-400",
                  children: [monteCarloResults.stats.positionedAtLeastOne, "%"]
                }), _jsx("div", {
                  className: "text-xs text-gray-500",
                  children: "Positioned ≥1 Success"
                })]
              })]
            }), _jsx(ResponsiveContainer, {
              width: "100%",
              height: 250,
              children: _jsxs(BarChart, {
                data: monteCarloResults.histogram.slice(0, 20),
                children: [_jsx(CartesianGrid, {
                  strokeDasharray: "3 3",
                  stroke: "#374151"
                }), _jsx(XAxis, {
                  dataKey: "successes",
                  stroke: "#9CA3AF",
                  label: {
                    value: 'Number of Successes',
                    position: 'bottom',
                    fill: '#9CA3AF',
                    offset: -5
                  }
                }), _jsx(YAxis, {
                  stroke: "#9CA3AF",
                  label: {
                    value: 'Frequency',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#9CA3AF'
                  }
                }), _jsx(Tooltip, {
                  contentStyle: {
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151'
                  }
                }), _jsx(Legend, {}), _jsx(Bar, {
                  dataKey: "baseline",
                  name: "Baseline",
                  fill: "#6B7280"
                }), _jsx(Bar, {
                  dataKey: "positioned",
                  name: "Positioned",
                  fill: "#06B6D4"
                })]
              })
            }), _jsxs("p", {
              className: "text-sm text-gray-500 mt-2 text-center",
              children: ["Distribution of total successes across ", simCount, " simulated careers of ", effectiveAttempts, " attempts each"]
            })]
          })]
        })]
      }), _jsxs("div", {
        className: "mt-6 bg-gradient-to-r from-cyan-900/30 to-emerald-900/30 rounded-xl p-6 border border-cyan-800/50",
        children: [_jsx("h2", {
          className: "text-lg font-semibold text-cyan-400 mb-3",
          children: "Key Insights"
        }), _jsxs("div", {
          className: "grid md:grid-cols-2 gap-4 text-sm text-gray-300",
          children: [_jsxs("div", {
            children: [_jsx("strong", {
              className: "text-cyan-400",
              children: "Multipliers compound:"
            }), " Your ", effectiveMultiplier.toFixed(1), "x combined multiplier turns a ", baseProb, "% chance into ", (effectiveProb * 100).toFixed(2), "%—a ", (effectiveProb * 100 / baseProb).toFixed(0), "x improvement."]
          }), _jsxs("div", {
            children: [_jsx("strong", {
              className: "text-cyan-400",
              children: "Attempts matter:"
            }), " Even with positioning, you need ~", Math.ceil(Math.log(0.1) / Math.log(1 - effectiveProb)), " attempts for 90% confidence. Survival (staying in the game) is crucial."]
          }), _jsxs("div", {
            children: [_jsx("strong", {
              className: "text-cyan-400",
              children: "Baseline is brutal:"
            }), " Without positioning, reaching 90% confidence requires ", baseProb > 0 ? Math.ceil(Math.log(0.1) / Math.log(1 - baseProb / 100)) : '∞', " attempts—positioning cuts this dramatically."]
          }), _jsxs("div", {
            children: [_jsx("strong", {
              className: "text-cyan-400",
              children: "Luck is manufactured:"
            }), " At ", finalProbability.toFixed(0), "% success probability, you've moved from \"hoping for luck\" to \"engineering favorable outcomes.\""]
          })]
        })]
      })]
    })
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
    }), "\n", "\n", "\n", _jsx(LuckSimulation, {})]
  });
}
function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, Object.assign({}, props, {
    children: _jsx(_createMdxContent, props)
  })) : _createMdxContent(props);
}
export default MDXContent;
