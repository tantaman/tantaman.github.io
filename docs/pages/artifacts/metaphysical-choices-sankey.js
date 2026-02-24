// content/pages/artifacts/metaphysical-choices-sankey.jsx
import { useState } from "https://esm.sh/react";
import SankeyDiagram from "/dist/components/SankeyDiagram.js";

// content/pages/artifacts/metaphysical-choices-sankey/gravity-intro.jsx
import { jsx, jsxs } from "https://esm.sh/react/jsx-runtime";
function GravityIntro() {
  const p = { style: { margin: "0 0 1.2em", lineHeight: 1.75 } };
  const em = (text) => /* @__PURE__ */ jsx("em", {
    children: text
  });
  const b = (text) => /* @__PURE__ */ jsx("strong", {
    style: { color: "#e8e4da" },
    children: text
  });
  return /* @__PURE__ */ jsxs("div", {
    style: {
      maxWidth: 720,
      margin: "0 auto",
      padding: "48px 24px 80px",
      fontFamily: "'Crimson Pro', Georgia, serif",
      fontSize: "18px",
      color: "#c8c4b8",
      lineHeight: 1.75
    },
    children: [
      /* @__PURE__ */ jsx("h1", {
        style: {
          fontFamily: "'Crimson Pro', Georgia, serif",
          fontSize: "42px",
          fontWeight: 400,
          color: "#e8e4da",
          margin: "0 0 32px",
          letterSpacing: "0.02em"
        },
        children: "Gravity"
      }),
      /* @__PURE__ */ jsx("hr", {
        style: {
          border: "none",
          borderTop: "1px solid #2a2a28",
          margin: "0 0 36px"
        }
      }),
      /* @__PURE__ */ jsx("p", {
        ...p,
        children: "Poor metaphysical choices are being made in every field. Across every domain of human inquiry. The map is being mistaken for the territory, the tool for the thing itself."
      }),
      /* @__PURE__ */ jsx("p", {
        ...p,
        children: "The pattern is:"
      }),
      /* @__PURE__ */ jsxs("ol", {
        style: {
          margin: "0 0 1.4em",
          paddingLeft: "1.4em",
          lineHeight: 1.75,
          color: "#c8c4b8"
        },
        children: [
          /* @__PURE__ */ jsx("li", {
            style: { margin: "0 0 0.5em" },
            children: "A methodological reduction is made for practical purposes (bracket depth, study surfaces)"
          }),
          /* @__PURE__ */ jsx("li", {
            style: { margin: "0 0 0.5em" },
            children: "The method produces genuine results at the surface level"
          }),
          /* @__PURE__ */ jsx("li", {
            style: { margin: "0 0 0.5em" },
            children: "The success of the method is taken as evidence that the bracketed dimension doesn't exist"
          }),
          /* @__PURE__ */ jsx("li", {
            style: { margin: "0 0 0.5em" },
            children: "The reduction hardens into dogma"
          }),
          /* @__PURE__ */ jsx("li", {
            style: { margin: "0 0 0.5em" },
            children: "Anyone who points to the missing dimension is dismissed as prescientific or mystical"
          })
        ]
      }),
      /* @__PURE__ */ jsxs("p", {
        ...p,
        children: [
          b("In science:"),
          ` Bacon and Descartes made a methodological choice \u2014 let's bracket final causes and study only efficient causes, because efficient causes are the ones we can manipulate. This was brilliant as method. It produced the scientific revolution. But somewhere between 1600 and 1900 the methodological bracket hardened into a metaphysical claim: there are no final causes, no intrinsic meaning, no participation \u2014 only mechanism. The tool for ignoring depth got confused with proof that depth doesn't exist. Whitehead saw this clearly \u2014 he called it "the fallacy of misplaced concreteness." You mistake your abstraction for the concrete reality.`
        ]
      }),
      /* @__PURE__ */ jsxs("p", {
        ...p,
        children: [
          b("In economics:"),
          " Marginal utility theory was a genuine technical advance \u2014 it lets you model price formation with calculus. But the methodological choice to treat humans as utility-maximizing rational agents hardened into the metaphysical claim that humans ",
          em("are"),
          " ",
          `utility-maximizing rational agents, and that value is price. The math worked, so the reduction must be true. Meanwhile everything the math couldn't capture \u2014 dignity, meaning, community, the common good \u2014 got filed under "externalities," which is economics-speak for "real things our model isn't built to see."`
        ]
      }),
      /* @__PURE__ */ jsxs("p", {
        ...p,
        children: [
          b("In psychology:"),
          ' Behaviorism made genuine discoveries about conditioning. The cognitive revolution made genuine discoveries about information processing. But "we can model some aspects of behavior without reference to inner life" became "there ',
          em("is"),
          ' no inner life," and then "we can model some aspects of cognition as computation" became "cognition ',
          em("is"),
          ' computation." Each time, methodological success got laundered into metaphysical elimination.'
        ]
      }),
      /* @__PURE__ */ jsxs("p", {
        ...p,
        children: [
          b("In education:"),
          ' Standardized testing genuinely does measure certain cognitive skills more reliably than subjective assessment. But "we can measure these specific skills" became "these specific skills are what education is ',
          em("for"),
          `," which became "anything we can't measure doesn't count." `,
          em("Paideia"),
          " \u2014 the formation of a whole human being \u2014 got eliminated not because anyone proved it was wrong, but because it couldn't be put on a spreadsheet."
        ]
      }),
      /* @__PURE__ */ jsx("p", {
        ...p,
        children: "The knowledge gains are real. The metaphysical conclusion drawn from them \u2014 that the participatory, depth dimension of reality is illusory \u2014 is a non sequitur. It's like concluding from the success of your map that the territory doesn't exist."
      }),
      /* @__PURE__ */ jsx("hr", {
        style: {
          border: "none",
          borderTop: "1px solid #2a2a28",
          margin: "36px 0"
        }
      }),
      /* @__PURE__ */ jsxs("p", {
        ...p,
        children: [
          "Read these diagrams from top to bottom. The vertical axis is not a ranking of sophistication. It is a map of ",
          b("metaphysical commitment"),
          ". At the top: traditions that understand knowing as participation, the knower as transformed, reality as inexhaustible, and meaning as intrinsic. At the bottom: traditions that understand knowing as extraction, the knower as unchanged, reality as a resource, and meaning as instrumental."
        ]
      }),
      /* @__PURE__ */ jsxs("p", {
        style: { margin: 0, lineHeight: 1.75 },
        children: [
          "Read them from left to right. The horizontal axis is not progress. It is the operation of gravity over time. Each column is a sedimentation. The green flows are traditions that have, against the odds, maintained the participatory commitment. The red flows are what happens when gravity wins \u2014 not destruction, but ",
          em("inversion"),
          ". The corrupt form of the best thing is the worst thing. ",
          em("Corruptio optimi pessima.")
        ]
      })
    ]
  });
}

// content/pages/artifacts/metaphysical-choices-sankey/data/science.json
var science_default = {
  streamColors: {
    ancient: { start: "#c9a84c", end: "#b8924a" },
    participatory: { start: "#3ac5b5", end: "#2a9a8a" },
    aristotelian: { start: "#8aaa6a", end: "#7a9a5a" },
    platonic: { start: "#3ac5b5", end: "#2ee8d0" },
    islamic: { start: "#8B72BE", end: "#7a6aad" },
    medieval: { start: "#b8924a", end: "#a07a3a" },
    bacon: { start: "#d48a4e", end: "#c4703e" },
    descartes: { start: "#cc6644", end: "#b85a3e" },
    newton: { start: "#d48a4e", end: "#cc6644" },
    mechanist: { start: "#cc5544", end: "#aa4a3a" },
    romantic: { start: "#3ac5b5", end: "#2aaa9a" },
    darwin: { start: "#b8924a", end: "#9a7a4a" },
    positivist: { start: "#cc5544", end: "#d48a4e" },
    pure: { start: "#3ac5b5", end: "#7a6aad" },
    quantum: { start: "#8B72BE", end: "#3ac5b5" },
    ecology: { start: "#8aaa6a", end: "#3ac5b5" },
    industrial: { start: "#993a3a", end: "#8a2a2a" },
    military: { start: "#e84450", end: "#d4344a" },
    techOpt: { start: "#dd3a4a", end: "#cc2a3a" },
    pharma: { start: "#aa5a4a", end: "#9a4a3a" },
    complexity: { start: "#2ee8d0", end: "#3ac5b5" },
    reductionist: { start: "#e06050", end: "#d45a4a" }
  },
  nodes: [
    { id: "ancient", label: "Ancient Natural Philosophy", sub: "Thales \u2192 Aristotle \xB7 thaumazein", col: 0, h: 240, color: "#c9a84c", score: 75, note: "Science begins in wonder \u2014 knowing as participation in the intelligibility of the cosmos" },
    { id: "platonic", label: "Neoplatonic Science", sub: "Plotinus, Proclus \xB7 cosmos as emanation", col: 1, h: 65, color: "#3ac5b5", score: 85, glow: true, note: "Nature as theophany \u2014 studying the world IS knowing the divine mind" },
    { id: "islamicScience", label: "Islamic Golden Age", sub: "Al-Khwarizmi, Ibn Sina, Alhazen", col: 1, h: 75, color: "#8B72BE", score: 60, note: "Preserved and extended Greek participatory science within monotheism" },
    { id: "medievalNatPhil", label: "Medieval Natural Philosophy", sub: "Grosseteste, Roger Bacon, Aquinas", col: 1, h: 80, color: "#b8924a", score: 55, note: "Nature as Book of God \u2014 investigation as a form of devotion" },
    { id: "nominalistSci", label: "Nominalist Turn", sub: "Ockham's razor \xB7 14th c.", col: 1, h: 75, color: "#d48a4e", score: 22, note: "Universals don't exist \u2014 only particular measurable things are real" },
    { id: "kepler", label: "Kepler / Copernicus", sub: "Cosmic harmony \xB7 16th\u201317th c.", col: 2, h: 55, color: "#8aaa6a", score: 65, note: "Still participatory \u2014 Kepler sought God's geometrical mind in the heavens" },
    { id: "bacon", label: "Francis Bacon", sub: "'Knowledge is power' \xB7 1620", col: 2, h: 70, color: "#d48a4e", score: 15, note: "THE FORK \u2014 science redefined as control over nature, not participation in it" },
    { id: "descartes", label: "Descartes", sub: "Res cogitans / res extensa \xB7 1637", col: 2, h: 75, color: "#cc6644", score: 12, note: "Mind-body split \u2014 nature becomes dead matter, mind becomes spectator" },
    { id: "newton", label: "Newton", sub: "Principia \xB7 1687", col: 2, h: 80, color: "#b8924a", score: 40, note: "Genuinely both \u2014 occult alchemist AND mechanist; the tension is the man" },
    { id: "romanticSci", label: "Romantic Science", sub: "Goethe, Humboldt, Schelling", col: 3, h: 50, color: "#3ac5b5", score: 80, glow: true, note: "Nature as living whole \u2014 the scientist participates in what she studies" },
    { id: "mechanistPhysics", label: "Mechanist Physics", sub: "Laplace, determinism \xB7 18th c.", col: 3, h: 65, color: "#cc5544", score: 10, note: "'I have no need of that hypothesis' \u2014 the cosmos as clockwork, God expelled" },
    { id: "darwin", label: "Darwin / Evolutionary", sub: "Origin of Species \xB7 1859", col: 3, h: 55, color: "#b8924a", score: 45, note: "Ambiguous \u2014 nature has depth and creativity, but no telos; disenchanting" },
    { id: "positivism", label: "Positivism", sub: "Comte, Mach \xB7 only measurables exist", col: 3, h: 55, color: "#d48a4e", score: 8, note: "The methodological bracket becomes dogma \u2014 if you can't measure it, it isn't real" },
    { id: "industrialSci", label: "Industrial Science", sub: "Applied R&D \xB7 19th c. \u2192", col: 3, h: 55, color: "#993a3a", score: 6, note: "Science in service of production \u2014 the factory consumes natural philosophy" },
    { id: "quantum", label: "Quantum / Relativity", sub: "Bohr, Heisenberg, Einstein", col: 4, h: 45, color: "#8B72BE", score: 68, glow: true, note: "The observer re-enters \u2014 mechanism breaks down at the fundamental level" },
    { id: "pureMath", label: "Pure Mathematics", sub: "G\xF6del, Grothendieck, Ramanujan", col: 4, h: 35, color: "#3ac5b5", score: 85, glow: true, note: "Knowing for its own sake \u2014 participation in abstract structure, sunder warumbe" },
    { id: "ecology", label: "Ecology / Systems", sub: "Carson, Lovelock, Bateson", col: 4, h: 45, color: "#8aaa6a", score: 65, glow: true, note: "Nature as web of relations \u2014 the knower is inside the system, not above it" },
    { id: "bigScience", label: "Big Science", sub: "Manhattan Project, CERN, NASA", col: 4, h: 60, color: "#cc5544", score: 15, note: "State-funded megaprojects \u2014 science as national power, not wonder" },
    { id: "reductionism", label: "Molecular Reductionism", sub: "DNA, neuroscience \xB7 genes as code", col: 4, h: 60, color: "#e06050", score: 10, note: "Life is 'just' chemistry \u2014 the organism disappears into components" },
    { id: "militaryIndustrial", label: "Military-Industrial R&D", sub: "DARPA, defense contracts", col: 4, h: 50, color: "#e84450", score: 3, note: "Science as weapons development \u2014 knowledge for domination" },
    { id: "complexitySci", label: "Complexity / Emergence", sub: "Santa Fe, Kauffman, Prigogine", col: 5, h: 40, color: "#2ee8d0", score: 72, glow: true, yOverride: 215, note: "Wholes irreducible to parts \u2014 participation and novelty re-enter science" },
    { id: "contemplativeSci", label: "Contemplative Science", sub: "Varela, McGilchrist, enactivism", col: 5, h: 35, color: "#3ac5b5", score: 80, glow: true, yOverride: 160, note: "The knower participates in the known \u2014 first-person science, embodied cognition" },
    { id: "deepEcology", label: "Deep Ecology", sub: "Naess, Abram \xB7 ~3M practitioners", col: 5, h: 35, color: "#8aaa6a", score: 75, glow: true, yOverride: 270, note: "Nature has intrinsic value \u2014 science as encounter, not extraction" },
    { id: "pharmaTech", label: "Pharma / Biotech", sub: "Drug pipelines, patents \xB7 $1.5T", col: 5, h: 50, color: "#aa5a4a", score: 6, yOverride: 530, note: "Science as IP pipeline \u2014 discover, patent, monetize, repeat" },
    { id: "moveFast", label: "'Move Fast & Break Things'", sub: "Silicon Valley R&D \xB7 disruption", col: 5, h: 50, color: "#e84450", score: 3, yOverride: 600, note: "Science as competitive advantage \u2014 ship it before you understand it" },
    { id: "surveillance", label: "Surveillance Science", sub: "Behavioral prediction, ad-tech", col: 5, h: 45, color: "#dd3a4a", score: 2, yOverride: 670, note: "Knowledge of humans as instrument of manipulation \u2014 Bacon's endgame" },
    { id: "weaponsAI", label: "Autonomous Weapons / AI Race", sub: "Killer drones, arms race logic", col: 5, h: 45, color: "#993a3a", score: 1, yOverride: 735, note: "Knowledge for annihilation \u2014 the ultimate inversion of thaumazein" },
    { id: "replicationCrisis", label: "Replication Crisis", sub: "P-hacking, publish-or-perish", col: 5, h: 40, color: "#cc5544", score: 8, yOverride: 460, note: "Science eating itself \u2014 incentive structure corrupts the method" }
  ],
  links: [
    { from: "ancient", to: "platonic", value: 15, stream: "platonic" },
    { from: "ancient", to: "islamicScience", value: 12, stream: "islamic" },
    { from: "ancient", to: "medievalNatPhil", value: 18, stream: "medieval" },
    { from: "ancient", to: "nominalistSci", value: 14, stream: "bacon" },
    { from: "platonic", to: "kepler", value: 10, stream: "platonic" },
    { from: "platonic", to: "newton", value: 3, stream: "platonic" },
    { from: "islamicScience", to: "kepler", value: 4, stream: "islamic" },
    { from: "islamicScience", to: "bacon", value: 4, stream: "islamic" },
    { from: "medievalNatPhil", to: "kepler", value: 5, stream: "medieval" },
    { from: "medievalNatPhil", to: "bacon", value: 6, stream: "bacon" },
    { from: "medievalNatPhil", to: "newton", value: 5, stream: "medieval" },
    { from: "nominalistSci", to: "bacon", value: 8, stream: "bacon" },
    { from: "nominalistSci", to: "descartes", value: 10, stream: "descartes" },
    { from: "kepler", to: "romanticSci", value: 6, stream: "participatory" },
    { from: "kepler", to: "newton", value: 6, stream: "ancient" },
    { from: "bacon", to: "mechanistPhysics", value: 8, stream: "mechanist" },
    { from: "bacon", to: "industrialSci", value: 6, stream: "industrial" },
    { from: "bacon", to: "positivism", value: 4, stream: "positivist" },
    { from: "descartes", to: "mechanistPhysics", value: 12, stream: "mechanist" },
    { from: "descartes", to: "positivism", value: 5, stream: "positivist" },
    { from: "newton", to: "mechanistPhysics", value: 8, stream: "mechanist" },
    { from: "newton", to: "romanticSci", value: 3, stream: "romantic" },
    { from: "newton", to: "darwin", value: 5, stream: "ancient" },
    { from: "romanticSci", to: "ecology", value: 6, stream: "ecology" },
    { from: "romanticSci", to: "quantum", value: 3, stream: "participatory" },
    { from: "romanticSci", to: "pureMath", value: 2, stream: "pure" },
    { from: "mechanistPhysics", to: "quantum", value: 5, stream: "quantum" },
    { from: "mechanistPhysics", to: "bigScience", value: 8, stream: "mechanist" },
    { from: "mechanistPhysics", to: "reductionism", value: 8, stream: "reductionist" },
    { from: "darwin", to: "ecology", value: 5, stream: "ecology" },
    { from: "darwin", to: "reductionism", value: 6, stream: "reductionist" },
    { from: "positivism", to: "bigScience", value: 5, stream: "positivist" },
    { from: "positivism", to: "reductionism", value: 4, stream: "reductionist" },
    { from: "industrialSci", to: "bigScience", value: 5, stream: "industrial" },
    { from: "industrialSci", to: "militaryIndustrial", value: 8, stream: "military" },
    { from: "quantum", to: "complexitySci", value: 4, stream: "complexity" },
    { from: "quantum", to: "contemplativeSci", value: 3, stream: "participatory" },
    { from: "pureMath", to: "complexitySci", value: 3, stream: "pure" },
    { from: "pureMath", to: "contemplativeSci", value: 2, stream: "pure" },
    { from: "ecology", to: "deepEcology", value: 5, stream: "ecology" },
    { from: "ecology", to: "complexitySci", value: 4, stream: "complexity" },
    { from: "bigScience", to: "pharmaTech", value: 5, stream: "industrial" },
    { from: "bigScience", to: "replicationCrisis", value: 4, stream: "positivist" },
    { from: "bigScience", to: "moveFast", value: 3, stream: "techOpt" },
    { from: "reductionism", to: "pharmaTech", value: 6, stream: "pharma" },
    { from: "reductionism", to: "surveillance", value: 4, stream: "techOpt" },
    { from: "reductionism", to: "replicationCrisis", value: 4, stream: "reductionist" },
    { from: "militaryIndustrial", to: "weaponsAI", value: 7, stream: "military" },
    { from: "militaryIndustrial", to: "surveillance", value: 4, stream: "military" },
    { from: "militaryIndustrial", to: "moveFast", value: 3, stream: "military" }
  ],
  eraLabels: ["ANCIENT", "MEDIEVAL", "REVOLUTION", "18TH\u201319TH C.", "20TH C.", "CONTEMPORARY"],
  title: "The Disenchantment of Wonder",
  description: 'From thaumazein to "move fast and break things" \u2014 how science lost participation and became instrumentation. The methodological bracket that ate the world. Hover for notes.',
  legendLabels: [
    "Participatory (70\u2013100)",
    "Moderate (50\u201369)",
    "Mixed (35\u201349)",
    "Thinned (20\u201334)",
    "Instrumental (10\u201319)",
    "Fully extractive (0\u20139)"
  ],
  invertedBracket: {
    xOffset: 200,
    y1: 525,
    y2: 785,
    scoreLabel: "ALL SCORE \u2264 8",
    description: "fully instrumentalized"
  },
  yAxis: {
    top: {
      label: "WONDER",
      subLabels: ["thaumazein", "participation", "knowing as being", "intrinsic value"]
    },
    bottom: {
      label: "CONTROL",
      subLabels: ["extraction", "domination", "knowledge as power", "instrumental value"]
    }
  },
  explanatoryNote: {
    heading: "The methodological bracket that ate the world:",
    text: "Bacon and Descartes made a practical choice \u2014 study only what you can measure and manipulate. This produced genuine knowledge. But the bracket hardened into dogma: if you can\u2019t measure it, it doesn\u2019t exist. Newton at 40 genuinely held both \u2014 alchemist and mechanist \u2014 paralleling Catholicism. Quantum mechanics at 68 broke the mechanist framework from within: the observer re-entered. The thin teal stream \u2014 complexity science, deep ecology, enactivism \u2014 represents science recovering participation. The red zone is Bacon\u2019s vision fully realized: knowledge as domination, nature as resource, the human as object."
  }
};

// content/pages/artifacts/metaphysical-choices-sankey/data/education.json
var education_default = {
  streamColors: {
    ancient: { start: "#c9a84c", end: "#b8924a" },
    paideia: { start: "#3ac5b5", end: "#2a9a8a" },
    monastic: { start: "#8B72BE", end: "#7a6aad" },
    liberal: { start: "#3ac5b5", end: "#2ee8d0" },
    bildung: { start: "#2ee8d0", end: "#3ac5b5" },
    humanist: { start: "#8aaa6a", end: "#7a9a5a" },
    catechism: { start: "#b8924a", end: "#a07a3a" },
    prussian: { start: "#d48a4e", end: "#c4703e" },
    industrial: { start: "#cc6644", end: "#b85a3e" },
    progressive: { start: "#8aaa6a", end: "#3ac5b5" },
    montessori: { start: "#3ac5b5", end: "#2aaa9a" },
    waldorf: { start: "#8B72BE", end: "#3ac5b5" },
    dewey: { start: "#8aaa6a", end: "#7a9a5a" },
    taylorist: { start: "#cc5544", end: "#aa4a3a" },
    testing: { start: "#e06050", end: "#d45a4a" },
    classical: { start: "#3ac5b5", end: "#8B72BE" },
    greatBooks: { start: "#7a9aaa", end: "#6a8a9a" },
    credential: { start: "#993a3a", end: "#8a2a2a" },
    mooc: { start: "#e84450", end: "#d4344a" },
    corporate: { start: "#dd3a4a", end: "#cc2a3a" },
    unschool: { start: "#2ee8d0", end: "#3ac5b5" },
    stem: { start: "#aa5a4a", end: "#9a4a3a" }
  },
  nodes: [
    { id: "ancient", label: "Ancient Paideia", sub: "Plato's Academy, Aristotle's Lyceum", col: 0, h: 240, color: "#c9a84c", score: 85, note: "Education as formation of the whole soul \u2014 truth, beauty, goodness" },
    { id: "monastic", label: "Monastic Education", sub: "Lectio divina, trivium, quadrivium", col: 1, h: 70, color: "#8B72BE", score: 75, glow: true, note: "Learning as spiritual practice \u2014 reading as encounter, not information" },
    { id: "medieval", label: "Medieval University", sub: "Paris, Bologna, Oxford \xB7 12th c.", col: 1, h: 80, color: "#b8924a", score: 55, note: "Mixed \u2014 genuine inquiry + credentialing clerics; disputatio as formation" },
    { id: "humanistRen", label: "Renaissance Humanism", sub: "Erasmus, Vittorino, studia humanitatis", col: 1, h: 70, color: "#3ac5b5", score: 80, glow: true, note: "Recovery of classical paideia \u2014 the educated person as fully human" },
    { id: "catechism", label: "Catechetical / Confessional", sub: "Luther's catechism, Jesuit Ratio", col: 1, h: 70, color: "#d48a4e", score: 30, note: "Education as doctrinal transmission \u2014 correct propositions into young minds" },
    { id: "bildung", label: "Bildung", sub: "Humboldt, Schiller, Goethe \xB7 1800s", col: 2, h: 60, color: "#2ee8d0", score: 90, glow: true, note: "Self-cultivation through encounter with culture \u2014 the whole person unfolds" },
    { id: "prussian", label: "Prussian Model", sub: "State-run, compulsory \xB7 1763 \u2192", col: 2, h: 80, color: "#d48a4e", score: 15, note: "THE FORK \u2014 education as state manufacture of obedient, literate citizens" },
    { id: "liberalArts", label: "Liberal Arts Tradition", sub: "Newman, Arnold \xB7 cultivation of mind", col: 2, h: 60, color: "#8aaa6a", score: 65, note: "Knowledge as its own end \u2014 the gentleman's education, broad and deep" },
    { id: "rousseau", label: "Rousseau / Natural Education", sub: "\xC9mile \xB7 1762", col: 2, h: 50, color: "#8aaa6a", score: 60, note: "The child has innate development \u2014 don't pour in content, let it unfold" },
    { id: "montessori", label: "Montessori", sub: "Prepared environment \xB7 1907 \u2192", col: 3, h: 45, color: "#3ac5b5", score: 78, glow: true, note: "Follow the child \u2014 self-directed encounter with materials, inner formation" },
    { id: "waldorf", label: "Waldorf / Steiner", sub: "Imagination, rhythm, will \xB7 1919 \u2192", col: 3, h: 40, color: "#8B72BE", score: 75, glow: true, note: "Head, heart, hands \u2014 education addresses the whole human being" },
    { id: "dewey", label: "Dewey / Progressive", sub: "Learning by doing \xB7 1890s \u2192", col: 3, h: 50, color: "#8aaa6a", score: 55, note: "Ambiguous \u2014 genuine experience-based learning but instrumentalized toward democracy" },
    { id: "factorySchool", label: "Factory Model School", sub: "Bells, rows, grades, age-sorting", col: 3, h: 70, color: "#cc5544", score: 8, note: "The Prussian model industrialized \u2014 school as assembly line for workers" },
    { id: "greatBooks", label: "Great Books", sub: "Hutchins, Adler, St. John's \xB7 1930s", col: 3, h: 45, color: "#7a9aaa", score: 68, note: "Encounter with primary texts \u2014 the seminar as Socratic dialogue" },
    { id: "landGrant", label: "Land-Grant / Practical", sub: "Morrill Act \xB7 1862", col: 3, h: 50, color: "#b8924a", score: 30, note: "Education for agricultural and mechanical arts \u2014 useful but narrow" },
    { id: "classicalRenewal", label: "Classical Schools", sub: "Dorothy Sayers, trivium revival", col: 4, h: 35, color: "#3ac5b5", score: 72, glow: true, note: "Recovery of grammar-logic-rhetoric \u2014 formation over information" },
    { id: "unschooling", label: "Unschooling / Free Schools", sub: "Holt, Illich, Sudbury", col: 4, h: 35, color: "#2ee8d0", score: 70, glow: true, note: "Radical trust in intrinsic motivation \u2014 deschooling society" },
    { id: "standardizedTesting", label: "Standardized Testing", sub: "SAT, No Child Left Behind \xB7 NCLB", col: 4, h: 60, color: "#e06050", score: 6, note: "If you can't measure it, it doesn't count \u2014 the test becomes the telos" },
    { id: "credential", label: "Credentialism", sub: "College as prerequisite \xB7 degree inflation", col: 4, h: 55, color: "#993a3a", score: 5, note: "The diploma as ticket \u2014 content irrelevant, only the credential matters" },
    { id: "stemPush", label: "STEM Ideology", sub: "'Learn to code' as sole value", col: 4, h: 50, color: "#aa5a4a", score: 10, note: "Only instrumental knowledge counts \u2014 humanities as luxury or waste" },
    { id: "libArtsModern", label: "Liberal Arts Colleges", sub: "Small, residential \xB7 ~200 schools", col: 4, h: 40, color: "#8aaa6a", score: 55, note: "Surviving reservoir \u2014 shrinking enrollments, existential financial pressure" },
    { id: "contemplativeEd", label: "Contemplative Education", sub: "Waldorf, classical, forest schools \xB7 ~2M", col: 5, h: 40, color: "#3ac5b5", score: 75, glow: true, yOverride: 195, note: "Thin stream \u2014 whole-child formation, inner life, beauty as pedagogy" },
    { id: "homeschoolClassical", label: "Classical Homeschool", sub: "Charlotte Mason, Well-Trained Mind", col: 5, h: 35, color: "#8aaa6a", score: 65, yOverride: 260, note: "Parent-led recovery of liberal arts \u2014 living books, narration, wonder" },
    { id: "seminar", label: "Great Books / Seminar", sub: "St. John's, Gutenberg, Catherine Project", col: 5, h: 35, color: "#7a9aaa", score: 70, glow: true, yOverride: 320, note: "Primary text encounter \u2014 small, fragile, irreplaceable" },
    { id: "mooc", label: "MOOCs / EdTech", sub: "Coursera, Khan Academy \xB7 content delivery", col: 5, h: 50, color: "#e84450", score: 5, yOverride: 510, note: "Education as content pipeline \u2014 watch videos, pass quizzes, get certificate" },
    { id: "bootcamp", label: "Coding Bootcamps", sub: "12 weeks to job-ready \xB7 $15B market", col: 5, h: 45, color: "#dd3a4a", score: 3, yOverride: 580, note: "Pure skill extraction \u2014 the human as code-producing unit" },
    { id: "corporateTraining", label: "Corporate Training", sub: "Upskilling, compliance, LMS", col: 5, h: 45, color: "#993a3a", score: 2, yOverride: 645, note: "Learning in service of employer \u2014 you are human capital to be developed" },
    { id: "aiTutor", label: "AI Tutoring / Personalized", sub: "Adaptive algorithms \xB7 Khanmigo", col: 5, h: 45, color: "#cc5544", score: 8, yOverride: 440, note: "Optimization of content delivery \u2014 efficient but disembodied" },
    { id: "microCredential", label: "Micro-credentials / Badges", sub: "Stackable certificates \xB7 LinkedIn", col: 5, h: 40, color: "#e84450", score: 2, yOverride: 720, note: "Education atomized into resume tokens \u2014 the credential without the formation" }
  ],
  links: [
    { from: "ancient", to: "monastic", value: 12, stream: "monastic" },
    { from: "ancient", to: "medieval", value: 18, stream: "ancient" },
    { from: "ancient", to: "humanistRen", value: 15, stream: "paideia" },
    { from: "ancient", to: "catechism", value: 10, stream: "catechism" },
    { from: "monastic", to: "bildung", value: 5, stream: "bildung" },
    { from: "monastic", to: "liberalArts", value: 5, stream: "liberal" },
    { from: "humanistRen", to: "bildung", value: 10, stream: "bildung" },
    { from: "humanistRen", to: "liberalArts", value: 5, stream: "liberal" },
    { from: "humanistRen", to: "rousseau", value: 4, stream: "progressive" },
    { from: "medieval", to: "liberalArts", value: 6, stream: "liberal" },
    { from: "medieval", to: "prussian", value: 8, stream: "prussian" },
    { from: "catechism", to: "prussian", value: 8, stream: "prussian" },
    { from: "catechism", to: "liberalArts", value: 2, stream: "catechism" },
    { from: "bildung", to: "montessori", value: 4, stream: "montessori" },
    { from: "bildung", to: "waldorf", value: 4, stream: "waldorf" },
    { from: "bildung", to: "greatBooks", value: 4, stream: "greatBooks" },
    { from: "rousseau", to: "montessori", value: 4, stream: "montessori" },
    { from: "rousseau", to: "dewey", value: 5, stream: "dewey" },
    { from: "liberalArts", to: "greatBooks", value: 5, stream: "greatBooks" },
    { from: "liberalArts", to: "dewey", value: 3, stream: "progressive" },
    { from: "liberalArts", to: "landGrant", value: 3, stream: "humanist" },
    { from: "prussian", to: "factorySchool", value: 16, stream: "industrial" },
    { from: "prussian", to: "landGrant", value: 4, stream: "prussian" },
    { from: "montessori", to: "unschooling", value: 3, stream: "unschool" },
    { from: "montessori", to: "classicalRenewal", value: 2, stream: "classical" },
    { from: "waldorf", to: "classicalRenewal", value: 3, stream: "classical" },
    { from: "waldorf", to: "unschooling", value: 2, stream: "unschool" },
    { from: "greatBooks", to: "classicalRenewal", value: 4, stream: "classical" },
    { from: "greatBooks", to: "libArtsModern", value: 4, stream: "greatBooks" },
    { from: "dewey", to: "libArtsModern", value: 3, stream: "progressive" },
    { from: "dewey", to: "standardizedTesting", value: 3, stream: "testing" },
    { from: "factorySchool", to: "standardizedTesting", value: 12, stream: "testing" },
    { from: "factorySchool", to: "credential", value: 10, stream: "credential" },
    { from: "factorySchool", to: "stemPush", value: 6, stream: "stem" },
    { from: "landGrant", to: "stemPush", value: 4, stream: "stem" },
    { from: "landGrant", to: "credential", value: 3, stream: "credential" },
    { from: "classicalRenewal", to: "contemplativeEd", value: 4, stream: "classical" },
    { from: "classicalRenewal", to: "homeschoolClassical", value: 4, stream: "classical" },
    { from: "unschooling", to: "contemplativeEd", value: 3, stream: "unschool" },
    { from: "libArtsModern", to: "seminar", value: 4, stream: "greatBooks" },
    { from: "libArtsModern", to: "homeschoolClassical", value: 2, stream: "liberal" },
    { from: "standardizedTesting", to: "mooc", value: 6, stream: "mooc" },
    { from: "standardizedTesting", to: "aiTutor", value: 5, stream: "testing" },
    { from: "standardizedTesting", to: "microCredential", value: 4, stream: "credential" },
    { from: "credential", to: "bootcamp", value: 6, stream: "corporate" },
    { from: "credential", to: "corporateTraining", value: 5, stream: "corporate" },
    { from: "credential", to: "microCredential", value: 5, stream: "credential" },
    { from: "credential", to: "mooc", value: 4, stream: "mooc" },
    { from: "stemPush", to: "bootcamp", value: 5, stream: "stem" },
    { from: "stemPush", to: "aiTutor", value: 3, stream: "stem" }
  ],
  eraLabels: ["ANCIENT", "MEDIEVAL", "ENLIGHTENMENT", "19TH\u2013EARLY 20TH", "LATE 20TH C.", "CONTEMPORARY"],
  title: "The Flattening of Formation",
  description: "From paideia to micro-credentials \u2014 how education moved from forming whole persons to producing human capital. Hover for diagnostic notes.",
  legendLabels: [
    "Formative (70\u2013100)",
    "Moderate (50\u201369)",
    "Mixed (35\u201349)",
    "Thinned (20\u201334)",
    "Instrumental (10\u201319)",
    "Fully extractive (0\u20139)"
  ],
  invertedBracket: {
    xOffset: 200,
    y1: 505,
    y2: 765,
    scoreLabel: "ALL SCORE \u2264 8",
    description: "formation eliminated"
  },
  yAxis: {
    top: {
      label: "FORMATION",
      subLabels: ["whole person", "encounter with truth", "inner transformation", "beauty & goodness"]
    },
    bottom: {
      label: "EXTRACTION",
      subLabels: ["human capital", "content delivery", "credential production", "skill as commodity"]
    }
  },
  explanatoryNote: {
    heading: "From souls to skills:",
    text: "Bildung at 90 is the Eckhart of education \u2014 self-cultivation as encounter with culture, the person unfolding into wholeness. The Prussian model at 15 is the fork \u2014 compulsory state schooling designed to produce obedient citizens and factory workers. Dewey at 55 is this diagram\u2019s Catholicism \u2014 genuinely tried to hold both formation and function, with mixed results. The contemporary teal stream \u2014 classical schools, Great Books seminars, Charlotte Mason homeschoolers \u2014 is the contemplative remnant: small, underfunded, and irreplaceable. The red zone is education with the education removed \u2014 credential production, content delivery, and human capital development."
  }
};

// content/pages/artifacts/metaphysical-choices-sankey/data/theology.json
var theology_default = {
  streamColors: { orthodox: { start: "#8B72BE", end: "#7a6aad" }, catholic: { start: "#b8924a", end: "#a07a3a" }, mystical: { start: "#3ac5b5", end: "#2a9a8a" }, nominalist: { start: "#d48a4e", end: "#c4703e" }, reformation: { start: "#d48a4e", end: "#c46a3e" }, reformed: { start: "#cc6644", end: "#b85a3e" }, pietist: { start: "#d4a06e", end: "#c48a5e" }, mainline: { start: "#8aaa6a", end: "#7a9a5a" }, contemplative: { start: "#3ac5b5", end: "#2aaa9a" }, pentecostal: { start: "#e06050", end: "#d45a4a" }, fundamentalist: { start: "#cc5544", end: "#aa4a3a" }, amEvang: { start: "#d48a4e", end: "#cc6644" }, prosperity: { start: "#e84450", end: "#d4344a" }, dispensationalism: { start: "#cc6654", end: "#ba5a4a" }, nationalism: { start: "#993a3a", end: "#8a2a2a" }, dominion: { start: "#aa5a4a", end: "#9a4a3a" }, wordOfFaith: { start: "#dd3a4a", end: "#cc2a3a" } },
  nodes: [
    { id: "early", label: "Early Church", sub: "1st\u20134th c.", col: 0, h: 220, color: "#c9a84c", score: 60, note: "Desert Fathers practiced radical interiority and unknowing; Origen and Gregory of Nyssa developed apophatic theology. But simultaneously, councils codified doctrine into propositions and bishops consolidated institutional authority. Score reflects genuine coexistence of contemplative and institutional streams." },
    { id: "orthodox", label: "Eastern Orthodox", sub: "220M", col: 1, h: 75, color: "#7a6aad", score: 75, note: "Theosis (divinization): humans participate in God's uncreated energies, becoming by grace what God is by nature. Apophatic theology insists God is known through what God is not. Hesychasm cultivates interior stillness. The essence/energies distinction preserves genuine participation without collapsing Creator and creature. Highest-scoring institutional church." },
    { id: "western", label: "Western Church", sub: "5th\u201313th c.", col: 1, h: 200, color: "#b8924a", score: 55, note: "Aquinas's analogia entis is genuinely participatory \u2014 all beings participate in God's being, and knowing is participation in divine intellect. But growing emphasis on canon law, merit theology, and sacramental gatekeeping pulls toward institutional control. Score reflects the real tension between Thomistic participation and legalistic practice." },
    { id: "mystical", label: "Mystical / Participatory", sub: "Eckhart, Rhineland Mystics", col: 2, h: 65, color: "#3ac5b5", score: 95, glow: true, note: "Eckhart's Gelassenheit (releasement/letting-be), sunder warumbe (living without why), and Grunt (the ground where soul and God are one). The Rhineland mystics \u2014 Tauler, Suso \u2014 continued this. This is the reference point of the entire diagram: radical interiority, detachment from all images of God, poverty of spirit, participation in the ground of being rather than relation to a supreme being." },
    { id: "nominalist", label: "Nominalist / Voluntarist", sub: "Ockham, Scotus \u2014 14th c.", col: 2, h: 105, color: "#d48a4e", score: 12, note: "Ockham denies real universals \u2014 only individual things exist, so participation in shared being is impossible. Scotus makes God's will primary over God's intellect, so God becomes an arbitrary sovereign who could have commanded the opposite. Together they destroy the metaphysical framework that made contemplative theology coherent. God is no longer the ground of being but a supreme agent issuing commands. This is the critical fork." },
    { id: "cathContinue", label: "Catholic Church", sub: "1.4B", col: 2, h: 170, color: "#b8924a", score: 55, note: "Officially retains Thomistic participation, sacramental real presence, and a living mystical tradition. But also: merit-based soteriology, indulgences, institutional authority claims, and legalistic moral theology. The theology is ~70% participatory (Aquinas, mystics, liturgy), but lived practice is ~40% (rule-following, guilt, transactional piety). Score reflects that it genuinely holds both streams." },
    { id: "contemplative", label: "Contemplative Tradition", sub: "John of Cross, Teresa, Cloud", col: 3, h: 45, color: "#3ac5b5", score: 90, glow: true, note: "John of the Cross: the dark night strips away all consolation until nothing remains but naked faith in unknowing. Teresa of \xC1vila: the Interior Castle maps progressive interiority toward union. The Cloud of Unknowing: God is reached by love, not by thought. These preserve Eckhart's core: apophatic unknowing, radical detachment, and the soul's ground as God's ground." },
    { id: "reformation", label: "Reformation", sub: "1517 \u2192", col: 3, h: 70, color: "#cc6644", score: 18, note: "Luther (trained as an Ockhamist) adopted forensic justification: you are declared righteous, not made righteous \u2014 breaking the participatory logic of theosis. Sola scriptura shifts authority from mystical encounter to textual interpretation. Faith becomes assent to correct propositions rather than participation in divine life. Built directly on nominalist foundations." },
    { id: "reformed", label: "Reformed / Calvinist", sub: "75M", col: 3, h: 55, color: "#b85a3e", score: 12, note: "TULIP: Total depravity (no capacity for God), Unconditional election (God arbitrarily chooses), Limited atonement, Irresistible grace, Perseverance. God is absolute sovereign will who decrees some to salvation and others to damnation before creation. The creature has zero participatory capacity \u2014 grace is imposed, not participated in. Pure voluntarism." },
    { id: "pietist", label: "Pietist / Methodist", sub: "80M", col: 3, h: 50, color: "#c48a5e", score: 30, note: `Wesley's "heart strangely warmed" and emphasis on personal holiness recover some interiority \u2014 this is "heart religion," not head religion. But the interiority is experiential and emotional rather than apophatic and contemplative. Still operates within the forensic justification framework. Better than pure Reformed, but experience of God is not the same as participation in God's ground.` },
    { id: "mainline", label: "Mainline Protestant", sub: "80M", col: 3, h: 50, color: "#8aaa6a", score: 35, note: `Liberal theology partially recovered mystical elements \u2014 Schleiermacher's "feeling of absolute dependence," Tillich's "ground of being" (explicitly Eckhartian). Social gospel reoriented faith toward justice rather than transaction. Less obsessed with forensic atonement. But often more cultural than contemplative \u2014 participation in a tradition rather than in the ground of being.` },
    { id: "modContemp", label: "Modern Contemplatives", sub: "Merton, Keating, Rohr \xB7 ~10M", col: 4, h: 32, color: "#3ac5b5", score: 88, glow: true, note: "Thomas Merton recovered contemplative prayer and East-West mystical dialogue. Thomas Keating developed centering prayer as accessible apophatic practice. Richard Rohr teaches non-dual Christianity and Eckhart explicitly. This is the conscious, intentional recovery of the participatory stream \u2014 interiority, unknowing, letting-go, the false self dissolving into the ground." },
    { id: "amEvang", label: "American Evangelicalism", sub: "Great Awakenings \u2192 incl. McLean Bible", col: 4, h: 68, color: "#d48a4e", score: 14, note: `Faith as intellectual assent to correct propositions ("Do you believe Jesus died for your sins?"). Penal substitutionary atonement: God's wrath requires payment, Jesus pays it \u2014 a legal/commercial transaction. "Accepting Jesus as personal savior" is a one-time decision, not ongoing participation. Knowledge of God is propositional, not experiential or apophatic. Interiority is absent.` },
    { id: "pentecostal", label: "Pentecostalism", sub: "300M", col: 4, h: 75, color: "#e06050", score: 10, note: "Emphasis on spiritual gifts (tongues, healing, prophecy), spiritual warfare, and demonic encounters. Highly experiential, but the experience is exteriorized \u2014 the Spirit is power to be deployed, not ground to rest in. God is an interventionist agent who acts on you (slain in the Spirit, baptism of fire), not the ground you participate in. Power replaces participation." },
    { id: "fundamentalism", label: "Fundamentalism", sub: "~100M", col: 4, h: 65, color: "#cc5544", score: 6, note: "Biblical inerrancy as epistemological foundation \u2014 the text is a perfect propositional system. Certainty replaces apophatic unknowing entirely. To know God is to know correct doctrine. Anti-intellectual in practice but hyper-rationalist in method: proof-texting, systematic theology as a closed logical system. Eckhart's Cloud of Unknowing is replaced by a fortress of knowing." },
    { id: "prosperity", label: "Prosperity Gospel", sub: "Osteen, Copeland \xB7 ~300M", col: 5, h: 65, color: "#e84450", score: 2, yOverride: 470, note: "God wants you wealthy and healthy; financial giving triggers divine return on investment. Eckhart's Gelassenheit (letting-go of all things) is directly inverted into grasping for all things. Poverty of spirit \u2014 the core of Eckhart and Jesus \u2014 is replaced by prosperity of wallet. The most direct, point-for-point inversion of contemplative Christianity." },
    { id: "wordOfFaith", label: "Word of Faith", sub: "name it, claim it \xB7 ~150M", col: 5, h: 55, color: "#dd3a4a", score: 3, yOverride: 555, note: `"Name it and claim it" \u2014 spoken declarations create reality through a force called "faith." Positive confession theology treats words as causal mechanisms. The contemplative's silence before ineffable mystery is replaced by verbal technique for manipulating reality. Faith is not surrender into unknowing but a tool you wield.` },
    { id: "dispensationalism", label: "Dispensationalism", sub: "Darby \u2192 Scofield \xB7 ~50M", col: 5, h: 48, color: "#cc6654", score: 5, yOverride: 630, note: "History divided into discrete divine dispensations; obsessive focus on end-times chronology, rapture timing, and Israel prophecy charts. Eckhart's nunc stans (the eternal now, where all time is present in God's ground) is replaced by anxious future-scanning. God's relationship to time becomes a puzzle to decode, not a ground to inhabit." },
    { id: "nationalism", label: "Christian Nationalism", sub: "dominion + identity \xB7 ~35M", col: 5, h: 48, color: "#993a3a", score: 3, yOverride: 698, note: `Christian identity fused with national and ethnic identity. Faith as cultural and political power rather than interior transformation. "Taking the nation back for God" inverts the contemplative's radical detachment from worldly power into grasping for it. The Kingdom of God \u2014 which Eckhart located in the soul's ground \u2014 is relocated to the ballot box.` },
    { id: "dominion", label: "Dominion / 7 Mountains", sub: "cultural conquest \xB7 ~15M", col: 5, h: 42, color: "#aa5a4a", score: 2, yOverride: 766, note: `Christians must seize control of seven cultural "mountains" (government, media, education, business, arts, family, religion). Power over replaces participation in. The mystic's poverty of spirit \u2014 wanting nothing, holding nothing, being nothing \u2014 is replaced by a mandate to conquer and control everything. The most institutionally aggressive inversion.` }
  ],
  links: [
    { from: "early", to: "orthodox", value: 18, stream: "orthodox" },
    { from: "early", to: "western", value: 82, stream: "catholic" },
    { from: "western", to: "mystical", value: 10, stream: "mystical" },
    { from: "western", to: "nominalist", value: 28, stream: "nominalist" },
    { from: "western", to: "cathContinue", value: 50, stream: "catholic" },
    { from: "mystical", to: "contemplative", value: 7, stream: "contemplative" },
    { from: "mystical", to: "cathContinue", value: 3, stream: "mystical" },
    { from: "nominalist", to: "reformation", value: 22, stream: "reformation" },
    { from: "nominalist", to: "cathContinue", value: 6, stream: "nominalist" },
    { from: "contemplative", to: "modContemp", value: 5, stream: "contemplative" },
    { from: "reformation", to: "reformed", value: 9, stream: "reformed" },
    { from: "reformation", to: "pietist", value: 7, stream: "pietist" },
    { from: "reformation", to: "mainline", value: 6, stream: "mainline" },
    { from: "reformed", to: "amEvang", value: 7, stream: "reformed" },
    { from: "pietist", to: "amEvang", value: 5, stream: "pietist" },
    { from: "pietist", to: "pentecostal", value: 2, stream: "pentecostal" },
    { from: "amEvang", to: "pentecostal", value: 6, stream: "pentecostal" },
    { from: "amEvang", to: "fundamentalism", value: 6, stream: "fundamentalist" },
    { from: "pentecostal", to: "prosperity", value: 10, stream: "prosperity" },
    { from: "pentecostal", to: "wordOfFaith", value: 7, stream: "wordOfFaith" },
    { from: "fundamentalism", to: "dispensationalism", value: 5, stream: "dispensationalism" },
    { from: "fundamentalism", to: "nationalism", value: 4, stream: "nationalism" },
    { from: "fundamentalism", to: "dominion", value: 3, stream: "dominion" },
    { from: "amEvang", to: "nationalism", value: 2, stream: "nationalism" }
  ],
  eraLabels: ["ORIGINS", "SCHISM", "MEDIEVAL FORK", "REFORMATION", "AMERICAN", "CONTEMPORARY"],
  title: "The Genealogy of Inversion",
  description: "Vertical position = alignment with Eckhart's participatory metaphysics. Each node shows an alignment score (0\u2013100). Hover for diagnostic notes.",
  legendLabels: ["High alignment (70\u2013100)", "Moderate (50\u201369)", "Mixed (35\u201349)", "Low (20\u201334)", "Very low (10\u201319)", "Inverted (0\u20139)"],
  invertedBracket: { xOffset: 185, y1: 465, y2: 812, scoreLabel: "ALL SCORE \u2264 5", description: "fully inverted" },
  yAxis: { top: { label: "ECKHARTIAN", subLabels: ["interiority", "detachment", "participation", "apophasis"] }, bottom: { label: "INVERTED", subLabels: ["exteriority", "acquisition", "contract", "certainty"] } },
  explanatoryNote: { heading: "How to read this:", text: "Higher = closer to Eckhart (interiority, detachment, participation, apophatic unknowing). Lower = the inversion (exteriority, acquisition, contractual God, propositional certainty). The five movements in the bottom-right are spaced for readability but all score \u2264 5 \u2014 they are each a distinct flavor of the same fundamental inversion. Catholicism at 55 genuinely holds both streams. Eastern Orthodoxy at 75 retains more participatory DNA. Churches like McLean Bible sit in American Evangelicalism (~14)." },
  tooltipWidth: 380,
  tooltipHeight: 300
};

// content/pages/artifacts/metaphysical-choices-sankey/data/psychology.json
var psychology_default = {
  streamColors: { ancient: { start: "#c9a84c", end: "#b8924a" }, depth: { start: "#3ac5b5", end: "#2a9a8a" }, freud: { start: "#3ac5b5", end: "#2aaa9a" }, jung: { start: "#2ee8d0", end: "#2ac5b5" }, humanistic: { start: "#8aaa6a", end: "#7a9a5a" }, existential: { start: "#7a9aaa", end: "#6a8a9a" }, psychoanalytic: { start: "#8B72BE", end: "#7a6aad" }, behavioral: { start: "#d48a4e", end: "#c4703e" }, cognitive: { start: "#cc6644", end: "#b85a3e" }, cbt: { start: "#cc5544", end: "#aa4a3a" }, positive: { start: "#e06050", end: "#d45a4a" }, neuro: { start: "#d48a4e", end: "#cc6644" }, selfHelp: { start: "#e84450", end: "#d4344a" }, biohack: { start: "#dd3a4a", end: "#cc2a3a" }, somatic: { start: "#3ac5b5", end: "#7a6aad" }, relational: { start: "#8B72BE", end: "#3ac5b5" }, contemplative: { start: "#3ac5b5", end: "#2ee8d0" }, industrial: { start: "#993a3a", end: "#8a2a2a" }, pop: { start: "#aa5a4a", end: "#9a4a3a" }, mainPsych: { start: "#b8924a", end: "#9a7a4a" }, attachment: { start: "#8aaa6a", end: "#3ac5b5" } },
  nodes: [
    { id: "ancient", label: "Ancient Psychology", sub: "Plato, Aristotle, Stoics \xB7 soul as whole", col: 0, h: 240, color: "#c9a84c", score: 70, note: "'Know thyself' \u2014 psyche as unfathomable depth, not mechanism" },
    { id: "romantic", label: "Romantic Interiority", sub: "Schelling, Goethe, Coleridge", col: 1, h: 70, color: "#3ac5b5", score: 80, glow: true, note: "The unconscious as living depth \u2014 nature creating through us" },
    { id: "mesmerism", label: "Mesmerism / Magnetism", sub: "Trance, hypnosis \xB7 18th\u201319th c.", col: 1, h: 55, color: "#8aaa6a", score: 50, note: "Early encounter with the unconscious \u2014 ambiguous, pre-scientific" },
    { id: "empiricist", label: "British Empiricism", sub: "Locke, Hume \xB7 mind as blank slate", col: 1, h: 85, color: "#d48a4e", score: 25, note: "THE FORK \u2014 mind as passive receiver of sense data, no depth" },
    { id: "physiology", label: "Experimental Physiology", sub: "Fechner, Wundt, Helmholtz", col: 1, h: 75, color: "#b8924a", score: 30, note: "Psyche becomes measurable \u2014 reaction times, thresholds, stimuli" },
    { id: "freud", label: "Freud / Psychoanalysis", sub: "The Unconscious \xB7 1895\u20131939", col: 2, h: 80, color: "#8B72BE", score: 65, note: "Depth recovered \u2014 but reduced to drives, instincts, hydraulic model" },
    { id: "jung", label: "Jung / Analytical", sub: "Archetypes, individuation \xB7 1912 \u2192", col: 2, h: 60, color: "#2ee8d0", score: 88, glow: true, note: "The psyche as unfathomable \u2014 archetypes, shadow, Self beyond ego" },
    { id: "behaviorism", label: "Behaviorism", sub: "Watson, Skinner \xB7 1913 \u2192", col: 2, h: 95, color: "#d48a4e", score: 8, note: "THE INVERSION \u2014 no inner life exists, only stimulus \u2192 response" },
    { id: "gestalt", label: "Gestalt Psychology", sub: "Wertheimer, K\xF6hler \xB7 wholes", col: 2, h: 45, color: "#8aaa6a", score: 55, note: "The whole is more than parts \u2014 resists reductionism, preserves form" },
    { id: "existential", label: "Existential Psychology", sub: "Frankl, May, Binswanger", col: 3, h: 50, color: "#7a9aaa", score: 78, glow: true, note: "Meaning, freedom, death, groundlessness \u2014 depth without dogma" },
    { id: "humanistic", label: "Humanistic", sub: "Maslow, Rogers \xB7 1960s", col: 3, h: 55, color: "#8aaa6a", score: 55, note: "Self-actualization \u2014 recovered interiority, but thinned to 'growth'" },
    { id: "objectRelations", label: "Object Relations", sub: "Winnicott, Klein, Bion", col: 3, h: 50, color: "#8B72BE", score: 68, note: "Intersubjective depth \u2014 the psyche formed in relationship, not isolation" },
    { id: "cogRev", label: "Cognitive Revolution", sub: "Chomsky, Neisser \xB7 1960s", col: 3, h: 65, color: "#cc6644", score: 18, note: "Mind as information processor \u2014 depth replaced by computation" },
    { id: "industrialOrg", label: "Industrial / Org Psych", sub: "Taylorism meets psychology", col: 3, h: 50, color: "#993a3a", score: 8, note: "How to extract maximum productivity from human units" },
    { id: "jungianContemp", label: "Contemporary Jungian", sub: "Hillman, Romanyshyn \xB7 ~2M", col: 4, h: 35, color: "#3ac5b5", score: 85, glow: true, note: "Archetypal psychology \u2014 soul-making, image, depth as irreducible" },
    { id: "somatic", label: "Somatic / Body", sub: "Levine, van der Kolk, Porges", col: 4, h: 40, color: "#3ac5b5", score: 70, glow: true, note: "The body keeps the score \u2014 depth recovered through flesh, not cognition" },
    { id: "relational", label: "Relational Psychoanalysis", sub: "Mitchell, Benjamin \xB7 intersubjective", col: 4, h: 40, color: "#8B72BE", score: 72, glow: true, note: "Analyst and patient co-create meaning \u2014 participatory knowing" },
    { id: "cbt", label: "CBT", sub: "Beck, Ellis \xB7 ~dominant", col: 4, h: 65, color: "#cc5544", score: 20, note: "Swap bad propositions for good ones \u2014 forensic, propositional, effective" },
    { id: "positivePsych", label: "Positive Psychology", sub: "Seligman \xB7 1998 \u2192", col: 4, h: 55, color: "#e06050", score: 12, note: "Happiness as measurable output \u2014 optimism techniques, gratitude lists" },
    { id: "neuroreductionism", label: "Neuroreductionism", sub: "Brain scans as explanation", col: 4, h: 55, color: "#d48a4e", score: 10, note: "You ARE your brain \u2014 consciousness as epiphenomenon, medicate it" },
    { id: "contemplativePsych", label: "Contemplative / Depth", sub: "IFS depth, psychedelic therapy \xB7 ~5M", col: 5, h: 40, color: "#3ac5b5", score: 78, glow: true, yOverride: 195, note: "Psychedelics + depth tradition recovery \u2014 participatory encounter" },
    { id: "attachModern", label: "Attachment / Polyvagal", sub: "Relational neuroscience", col: 5, h: 40, color: "#8aaa6a", score: 55, yOverride: 310, note: "Bridge \u2014 uses neuroscience but respects relational depth" },
    { id: "appBasedCBT", label: "App-Based Therapy", sub: "BetterHelp, Woebot, Calm", col: 5, h: 50, color: "#cc5544", score: 8, yOverride: 530, note: "Therapy as subscription product \u2014 scale over depth" },
    { id: "selfHelp", label: "Self-Help Industrial", sub: "Huberman, Atomic Habits \xB7 ~$15B", col: 5, h: 55, color: "#e84450", score: 4, yOverride: 600, note: "Optimize your dopamine \u2014 psychology as productivity technique" },
    { id: "biohack", label: "Biohacking / Optimization", sub: "Quantified self, nootropics", col: 5, h: 45, color: "#dd3a4a", score: 2, yOverride: 675, note: "The human as machine to be tuned \u2014 total exteriorization" },
    { id: "corporateWellness", label: "Corporate Wellness", sub: "Resilience training, EAPs", col: 5, h: 45, color: "#993a3a", score: 3, yOverride: 740, note: "Manage your stress so you can produce more \u2014 psychology in service of capital" }
  ],
  links: [
    { from: "ancient", to: "romantic", value: 15, stream: "depth" },
    { from: "ancient", to: "mesmerism", value: 8, stream: "ancient" },
    { from: "ancient", to: "empiricist", value: 25, stream: "behavioral" },
    { from: "ancient", to: "physiology", value: 18, stream: "mainPsych" },
    { from: "romantic", to: "jung", value: 8, stream: "jung" },
    { from: "romantic", to: "freud", value: 5, stream: "depth" },
    { from: "mesmerism", to: "freud", value: 5, stream: "freud" },
    { from: "empiricist", to: "behaviorism", value: 20, stream: "behavioral" },
    { from: "empiricist", to: "freud", value: 3, stream: "freud" },
    { from: "physiology", to: "behaviorism", value: 8, stream: "behavioral" },
    { from: "physiology", to: "gestalt", value: 6, stream: "humanistic" },
    { from: "physiology", to: "freud", value: 5, stream: "freud" },
    { from: "freud", to: "objectRelations", value: 10, stream: "psychoanalytic" },
    { from: "freud", to: "existential", value: 4, stream: "existential" },
    { from: "freud", to: "humanistic", value: 4, stream: "humanistic" },
    { from: "jung", to: "existential", value: 4, stream: "jung" },
    { from: "jung", to: "humanistic", value: 3, stream: "jung" },
    { from: "jung", to: "jungianContemp", value: 6, stream: "jung" },
    { from: "gestalt", to: "humanistic", value: 4, stream: "humanistic" },
    { from: "behaviorism", to: "cogRev", value: 20, stream: "cognitive" },
    { from: "behaviorism", to: "industrialOrg", value: 10, stream: "industrial" },
    { from: "existential", to: "jungianContemp", value: 3, stream: "depth" },
    { from: "existential", to: "somatic", value: 3, stream: "somatic" },
    { from: "existential", to: "relational", value: 3, stream: "relational" },
    { from: "objectRelations", to: "relational", value: 8, stream: "relational" },
    { from: "objectRelations", to: "somatic", value: 3, stream: "somatic" },
    { from: "humanistic", to: "positivePsych", value: 5, stream: "positive" },
    { from: "humanistic", to: "somatic", value: 3, stream: "somatic" },
    { from: "cogRev", to: "cbt", value: 12, stream: "cbt" },
    { from: "cogRev", to: "neuroreductionism", value: 8, stream: "neuro" },
    { from: "cogRev", to: "positivePsych", value: 4, stream: "positive" },
    { from: "industrialOrg", to: "positivePsych", value: 3, stream: "industrial" },
    { from: "industrialOrg", to: "neuroreductionism", value: 3, stream: "industrial" },
    { from: "jungianContemp", to: "contemplativePsych", value: 5, stream: "depth" },
    { from: "somatic", to: "contemplativePsych", value: 4, stream: "somatic" },
    { from: "somatic", to: "attachModern", value: 4, stream: "attachment" },
    { from: "relational", to: "contemplativePsych", value: 3, stream: "relational" },
    { from: "relational", to: "attachModern", value: 4, stream: "attachment" },
    { from: "cbt", to: "appBasedCBT", value: 8, stream: "cbt" },
    { from: "cbt", to: "attachModern", value: 3, stream: "mainPsych" },
    { from: "positivePsych", to: "selfHelp", value: 7, stream: "selfHelp" },
    { from: "positivePsych", to: "corporateWellness", value: 5, stream: "industrial" },
    { from: "neuroreductionism", to: "biohack", value: 6, stream: "biohack" },
    { from: "neuroreductionism", to: "appBasedCBT", value: 4, stream: "neuro" },
    { from: "neuroreductionism", to: "selfHelp", value: 3, stream: "selfHelp" }
  ],
  eraLabels: ["ANCIENT", "EARLY MODERN", "FOUNDERS", "MID 20TH C.", "LATE 20TH C.", "CONTEMPORARY"],
  title: "The Genealogy of Depth",
  description: 'From "know thyself" to "optimize your dopamine" \u2014 how psychology lost and sometimes recovered the participatory depths of the psyche. Hover for diagnostic notes.',
  legendLabels: ["Depth / participatory (70\u2013100)", "Moderate (50\u201369)", "Mixed (35\u201349)", "Thinned (20\u201334)", "Instrumental (10\u201319)", "Fully externalized (0\u20139)"],
  invertedBracket: { xOffset: 195, y1: 525, y2: 790, scoreLabel: "ALL SCORE \u2264 8", description: "fully instrumentalized" },
  yAxis: { top: { label: "DEPTH", subLabels: ["unfathomable psyche", "participatory knowing", "soul as whole", "transformation"] }, bottom: { label: "SURFACE", subLabels: ["mechanism", "optimization", "productivity", "technique"] } },
  explanatoryNote: { heading: "The same shape:", text: "Jung at 88 plays Eckhart's role \u2014 the psyche as unfathomable depth, individuation as participatory transformation. Behaviorism at 8 is the nominalist fork \u2014 there IS no inner life, only stimulus and response. Freud at 65 parallels Catholicism \u2014 recovered depth but reduced it to mechanism (drives, hydraulics). CBT at 20 is the Westminster Confession of psychology \u2014 swap bad propositions for correct ones. The bottom row is the prosperity gospel of the mind: optimize, hack, subscribe, produce. The thin teal stream \u2014 somatic work, psychedelic therapy, depth analysis \u2014 persists but is dwarfed by the $15B self-help industry." },
  tooltipWidth: 350,
  tooltipHeight: 192
};

// content/pages/artifacts/metaphysical-choices-sankey/data/buddhism.json
var buddhism_default = {
  streamColors: { early: { start: "#c9a84c", end: "#b8924a" }, theravada: { start: "#b8924a", end: "#a07a3a" }, mahayana: { start: "#8B72BE", end: "#7a6aad" }, zen: { start: "#2ee8d0", end: "#3ac5b5" }, vajrayana: { start: "#8B72BE", end: "#3ac5b5" }, madhyamaka: { start: "#3ac5b5", end: "#2a9a8a" }, yogacara: { start: "#7a9aaa", end: "#6a8a9a" }, pureLand: { start: "#d48a4e", end: "#c4703e" }, abhidharma: { start: "#b8924a", end: "#d48a4e" }, scholastic: { start: "#cc6644", end: "#b85a3e" }, chan: { start: "#2ee8d0", end: "#3ac5b5" }, tibetan: { start: "#8B72BE", end: "#7a6aad" }, dzogchen: { start: "#3ac5b5", end: "#2ee8d0" }, nichiren: { start: "#cc5544", end: "#aa4a3a" }, vipassana: { start: "#8aaa6a", end: "#7a9a5a" }, engaged: { start: "#8aaa6a", end: "#3ac5b5" }, secular: { start: "#cc6644", end: "#d48a4e" }, mcmind: { start: "#e84450", end: "#d4344a" }, wellness: { start: "#dd3a4a", end: "#cc2a3a" }, nationalist: { start: "#993a3a", end: "#8a2a2a" }, sgi: { start: "#e06050", end: "#d45a4a" }, institutional: { start: "#b8924a", end: "#cc6644" }, app: { start: "#aa5a4a", end: "#9a4a3a" } },
  nodes: [
    { id: "buddha", label: "The Buddha's Teaching", sub: "Siddhartha Gautama \xB7 ~5th c. BCE", col: 0, h: 240, color: "#c9a84c", score: 92, note: "Direct awakening \u2014 dukkha, anatta, sunyata; you are already what you seek" },
    { id: "theravada", label: "Theravada", sub: "Pali Canon \xB7 'Way of the Elders'", col: 1, h: 85, color: "#b8924a", score: 60, note: "Preserved early teachings but systematized them \u2014 monasticism + canon" },
    { id: "abhidharma", label: "Abhidharma", sub: "Scholastic cataloging \xB7 3rd c. BCE \u2192", col: 1, h: 65, color: "#d48a4e", score: 28, note: "The Westminster Confession impulse \u2014 catalog all phenomena, classify all states" },
    { id: "mahayana", label: "Early Mahayana", sub: "Bodhisattva ideal \xB7 1st c. BCE \u2192", col: 1, h: 90, color: "#8B72BE", score: 75, note: "Compassion + emptiness; liberation for all beings, not just monks" },
    { id: "nagarjuna", label: "Nagarjuna / Madhyamaka", sub: "Emptiness of emptiness \xB7 2nd c.", col: 2, h: 60, color: "#3ac5b5", score: 95, glow: true, note: "THE PEAK \u2014 sunyata dissolves all categories including 'sunyata'; Eckhart's twin" },
    { id: "yogacara", label: "Yogacara", sub: "Mind-only \xB7 Vasubandhu, Asanga", col: 2, h: 50, color: "#7a9aaa", score: 70, glow: true, note: "Consciousness as ground \u2014 deep interiority, eight-consciousness model" },
    { id: "pureLand", label: "Pure Land", sub: "Amitabha saves \xB7 other-power", col: 2, h: 65, color: "#d48a4e", score: 25, note: "Externalized liberation \u2014 faith in another Buddha who saves you from outside" },
    { id: "chan", label: "Chan Buddhism", sub: "Bodhidharma \u2192 Chinese Zen \xB7 6th c.", col: 2, h: 60, color: "#2ee8d0", score: 90, glow: true, note: "Direct pointing at mind \u2014 'not dependent on words and letters'" },
    { id: "tantra", label: "Vajrayana / Tantra", sub: "Esoteric Buddhism \xB7 7th c. \u2192", col: 2, h: 55, color: "#8B72BE", score: 72, note: "Transformation through ritual, mantra, visualization \u2014 powerful but ambiguous" },
    { id: "zenJapan", label: "Japanese Zen", sub: "Dogen, Rinzai, Soto \xB7 12th c. \u2192", col: 3, h: 50, color: "#2ee8d0", score: 85, glow: true, note: "Shikantaza \u2014 just sitting; practice-realization unity; sunder warumbe" },
    { id: "tibetan", label: "Tibetan Buddhism", sub: "Dalai Lama, Kagyu, Nyingma, Gelug", col: 3, h: 55, color: "#8B72BE", score: 65, note: "Preserved vast teachings \u2014 but also theocratic power, institutional hierarchy" },
    { id: "dzogchen", label: "Dzogchen / Mahamudra", sub: "Great Perfection \xB7 Nyingma, Kagyu", col: 3, h: 40, color: "#3ac5b5", score: 92, glow: true, note: "Already awake \u2014 natural state needs no modification; pure Gelassenheit" },
    { id: "theravadaSE", label: "Southeast Asian Theravada", sub: "Sri Lanka, Thailand, Myanmar", col: 3, h: 60, color: "#b8924a", score: 48, note: "Mixed \u2014 forest monks at 80+ but state Buddhism at 25; holds both" },
    { id: "nichiren", label: "Nichiren", sub: "Chant for benefits \xB7 13th c. Japan", col: 3, h: 50, color: "#cc5544", score: 12, note: "THE FORK \u2014 chant the Lotus Sutra title for worldly results; transactional" },
    { id: "pureLandEA", label: "East Asian Pure Land", sub: "Honen, Shinran \xB7 nembutsu", col: 3, h: 50, color: "#d48a4e", score: 22, note: "Radical other-power \u2014 but Shinran deepened it into genuine humility" },
    { id: "zenWest", label: "Western Zen", sub: "Suzuki, Shunryu Suzuki, Thich Nhat Hanh", col: 4, h: 40, color: "#3ac5b5", score: 80, glow: true, note: "Genuine transmission \u2014 sitting practice, teacher-student, koan; thin but alive" },
    { id: "vipassana", label: "Vipassana Revival", sub: "Mahasi, Goenka, IMS \xB7 insight meditation", col: 4, h: 45, color: "#8aaa6a", score: 55, note: "Recovered practice from scholasticism \u2014 but risks technique-ification" },
    { id: "engagedBuddhism", label: "Engaged Buddhism", sub: "Thich Nhat Hanh, Macy, Loy", col: 4, h: 40, color: "#8aaa6a", score: 62, note: "Awakening applied to social suffering \u2014 contemplation + action" },
    { id: "tibetanWest", label: "Tibetan in West", sub: "Trungpa, FPMT, Shambhala", col: 4, h: 40, color: "#8B72BE", score: 60, note: "Rich teachings transmitted but institutional scandals reveal power problems" },
    { id: "secularBuddhism", label: "Secular Buddhism", sub: "Batchelor, naturalized dharma", col: 4, h: 45, color: "#cc6644", score: 30, note: "Strips metaphysics, keeps ethics and meditation \u2014 useful but thinned" },
    { id: "sgi", label: "SGI / Soka Gakkai", sub: "Nichiren lay movement \xB7 12M members", col: 4, h: 50, color: "#e06050", score: 8, note: "Chant nam-myoho-renge-kyo for car, job, partner \u2014 prosperity gospel of Buddhism" },
    { id: "buddhistNationalism", label: "Buddhist Nationalism", sub: "Myanmar 969, Sri Lanka BBS", col: 4, h: 45, color: "#993a3a", score: 3, note: "Buddhist identity as ethnic weapon \u2014 the compassion tradition weaponized" },
    { id: "livingPractice", label: "Living Practice", sub: "Zen, Dzogchen, forest monks \xB7 ~15M", col: 5, h: 40, color: "#3ac5b5", score: 82, glow: true, yOverride: 165, note: "Genuine awakening traditions \u2014 teacher-student, intensive retreat, koan" },
    { id: "dharmaTeachers", label: "Independent Dharma", sub: "Post-lineage teachers, podcasts", col: 5, h: 35, color: "#8aaa6a", score: 55, yOverride: 310, note: "Bridge \u2014 sincere practice but untethered from institutional depth" },
    { id: "mcmindfulness", label: "McMindfulness", sub: "Corporate MBSR \xB7 Google, SAP", col: 5, h: 55, color: "#e84450", score: 3, yOverride: 510, note: "Awakening repurposed as productivity tool \u2014 meditate to optimize output" },
    { id: "wellnessApps", label: "Meditation Apps", sub: "Headspace, Calm, Ten Percent \xB7 $5B", col: 5, h: 50, color: "#dd3a4a", score: 4, yOverride: 585, note: "Sunyata as subscription \u2014 'reduce anxiety in 10 minutes a day'" },
    { id: "retreatIndustry", label: "Retreat Tourism", sub: "Bali, Sedona, ayahuasca circuit", col: 5, h: 45, color: "#aa5a4a", score: 5, yOverride: 655, note: "Spiritual experiences as luxury consumption \u2014 enlightenment vacations" },
    { id: "buddhistCapital", label: "Mindful Capitalism", sub: "'Conscious leadership', Wisdom 2.0", col: 5, h: 45, color: "#993a3a", score: 2, yOverride: 720, note: "Dharma in service of capital \u2014 the ultimate inversion of renunciation" }
  ],
  links: [
    { from: "buddha", to: "theravada", value: 20, stream: "theravada" },
    { from: "buddha", to: "abhidharma", value: 12, stream: "abhidharma" },
    { from: "buddha", to: "mahayana", value: 25, stream: "mahayana" },
    { from: "theravada", to: "pureLand", value: 3, stream: "pureLand" },
    { from: "theravada", to: "theravadaSE", value: 8, stream: "theravada" },
    { from: "abhidharma", to: "yogacara", value: 5, stream: "yogacara" },
    { from: "abhidharma", to: "pureLand", value: 3, stream: "scholastic" },
    { from: "abhidharma", to: "nichiren", value: 3, stream: "scholastic" },
    { from: "mahayana", to: "nagarjuna", value: 10, stream: "madhyamaka" },
    { from: "mahayana", to: "yogacara", value: 6, stream: "yogacara" },
    { from: "mahayana", to: "chan", value: 8, stream: "chan" },
    { from: "mahayana", to: "tantra", value: 6, stream: "vajrayana" },
    { from: "mahayana", to: "pureLand", value: 5, stream: "pureLand" },
    { from: "nagarjuna", to: "chan", value: 4, stream: "madhyamaka" },
    { from: "nagarjuna", to: "dzogchen", value: 4, stream: "dzogchen" },
    { from: "nagarjuna", to: "tibetan", value: 3, stream: "madhyamaka" },
    { from: "chan", to: "zenJapan", value: 10, stream: "zen" },
    { from: "tantra", to: "tibetan", value: 6, stream: "vajrayana" },
    { from: "tantra", to: "dzogchen", value: 4, stream: "dzogchen" },
    { from: "yogacara", to: "tibetan", value: 3, stream: "yogacara" },
    { from: "yogacara", to: "zenJapan", value: 2, stream: "yogacara" },
    { from: "pureLand", to: "pureLandEA", value: 8, stream: "pureLand" },
    { from: "pureLand", to: "nichiren", value: 4, stream: "nichiren" },
    { from: "zenJapan", to: "zenWest", value: 8, stream: "zen" },
    { from: "dzogchen", to: "tibetanWest", value: 4, stream: "dzogchen" },
    { from: "dzogchen", to: "zenWest", value: 2, stream: "dzogchen" },
    { from: "tibetan", to: "tibetanWest", value: 6, stream: "tibetan" },
    { from: "theravadaSE", to: "vipassana", value: 8, stream: "vipassana" },
    { from: "theravadaSE", to: "buddhistNationalism", value: 5, stream: "nationalist" },
    { from: "theravadaSE", to: "secularBuddhism", value: 3, stream: "secular" },
    { from: "nichiren", to: "sgi", value: 8, stream: "sgi" },
    { from: "pureLandEA", to: "secularBuddhism", value: 3, stream: "secular" },
    { from: "zenWest", to: "livingPractice", value: 6, stream: "zen" },
    { from: "zenWest", to: "dharmaTeachers", value: 3, stream: "engaged" },
    { from: "tibetanWest", to: "livingPractice", value: 4, stream: "tibetan" },
    { from: "tibetanWest", to: "retreatIndustry", value: 3, stream: "wellness" },
    { from: "vipassana", to: "livingPractice", value: 3, stream: "vipassana" },
    { from: "vipassana", to: "mcmindfulness", value: 5, stream: "mcmind" },
    { from: "vipassana", to: "wellnessApps", value: 4, stream: "app" },
    { from: "vipassana", to: "dharmaTeachers", value: 3, stream: "vipassana" },
    { from: "engagedBuddhism", to: "dharmaTeachers", value: 4, stream: "engaged" },
    { from: "engagedBuddhism", to: "mcmindfulness", value: 2, stream: "mcmind" },
    { from: "secularBuddhism", to: "mcmindfulness", value: 4, stream: "mcmind" },
    { from: "secularBuddhism", to: "wellnessApps", value: 4, stream: "app" },
    { from: "secularBuddhism", to: "buddhistCapital", value: 3, stream: "wellness" },
    { from: "sgi", to: "buddhistCapital", value: 3, stream: "sgi" },
    { from: "sgi", to: "retreatIndustry", value: 2, stream: "wellness" }
  ],
  eraLabels: ["ORIGINS", "EARLY SCHOOLS", "CLASSICAL", "REGIONAL", "MODERN", "CONTEMPORARY"],
  title: "The Commodification of Awakening",
  description: "From the Buddha's direct insight to corporate mindfulness \u2014 how a tradition of radical renunciation became a productivity tool. Hover for diagnostic notes.",
  legendLabels: ["Awakened / participatory (70\u2013100)", "Moderate (50\u201369)", "Mixed (35\u201349)", "Thinned (20\u201334)", "Instrumental (10\u201319)", "Fully inverted (0\u20139)"],
  invertedBracket: { xOffset: 195, y1: 505, y2: 770, scoreLabel: "ALL SCORE \u2264 5", description: "awakening commodified" },
  yAxis: { top: { label: "AWAKENING", subLabels: ["sunyata / emptiness", "anatta / no-self", "prajna / insight", "liberation"] }, bottom: { label: "CRAVING", subLabels: ["acquisition", "commodification", "technique as product", "ego optimization"] } },
  explanatoryNote: { heading: "The deepest irony:", text: "Buddhism's core teaching is that craving causes suffering. The contemporary inversion uses Buddhist technique to optimize craving \u2014 meditate so you can want more effectively. Nagarjuna at 95 and Dzogchen at 92 are Buddhism's Eckhart \u2014 emptiness that dissolves even the concept of emptiness. Nichiren at 12 is the fork \u2014 chant the sutra title for material results, exactly paralleling the prosperity gospel. Buddhist nationalism at 3 weaponizes compassion for ethnic violence. The bottom row \u2014 McMindfulness, meditation apps, Wisdom 2.0 \u2014 is renunciation repackaged as consumption. The tradition that began with a man leaving his palace to sit under a tree now sells subscriptions for $14.99/month." }
};

// content/pages/artifacts/metaphysical-choices-sankey/data/islam.json
var islam_default = {
  streamColors: { sufiEarly: { start: "#3ac5b5", end: "#2a9a8a" }, sufi: { start: "#3ac5b5", end: "#2aaa9a" }, ibnArabi: { start: "#2ee8d0", end: "#2ac5b5" }, ghazali: { start: "#8aaa6a", end: "#7a9a5a" }, ashari: { start: "#b8924a", end: "#a07a3a" }, mutazila: { start: "#9a8a6a", end: "#8a7a5a" }, shia: { start: "#8B72BE", end: "#7a6aad" }, ibnTaymiyyah: { start: "#d48a4e", end: "#c4703e" }, wahhabi: { start: "#cc5544", end: "#aa4a3a" }, salafi: { start: "#e84450", end: "#d4344a" }, brotherhood: { start: "#993a3a", end: "#8a2a2a" }, deobandi: { start: "#cc6644", end: "#b85a3e" }, jihadism: { start: "#dd3a4a", end: "#cc2a3a" }, irfan: { start: "#7a6aad", end: "#6a5a9d" }, ottoman: { start: "#b8924a", end: "#a07a3a" }, mullaSadra: { start: "#8B72BE", end: "#3ac5b5" }, political: { start: "#aa5a4a", end: "#9a4a3a" }, mainstream: { start: "#b8924a", end: "#9a7a4a" } },
  nodes: [
    { id: "earlyIslam", label: "Early Islam", sub: "Prophetic community \xB7 7th c.", col: 0, h: 240, color: "#c9a84c", score: 65, note: "Mixed \u2014 inner devotion + legal framework coexist from the start" },
    { id: "sufiEarly", label: "Early Sufism", sub: "Rabia, Hallaj, Junayd \xB7 8th\u201310th c.", col: 1, h: 75, color: "#3ac5b5", score: 85, glow: true, note: "Rabia: 'If I worship You for Your own sake\u2026' \u2014 sunder warumbe in Arabic" },
    { id: "shia", label: "Shia Islam", sub: "Esoteric, batin/zahir \xB7 7th c. \u2192", col: 1, h: 80, color: "#7a6aad", score: 65, note: "Hidden Imam, inner/outer meaning \u2014 preserves esoteric dimension" },
    { id: "ashari", label: "Ash'ari Theology", sub: "Mainstream Sunni orthodox", col: 1, h: 100, color: "#b8924a", score: 45, note: "Occasionalism \u2014 God directly causes every event; voluntarist seeds" },
    { id: "mutazila", label: "Mu'tazila", sub: "Rationalist theology \xB7 8th\u201310th c.", col: 1, h: 55, color: "#9a8a6a", score: 40, note: "Rational but not mystical \u2014 God understood through reason, not union" },
    { id: "ibnArabi", label: "Ibn Arabi", sub: "Wahdat al-Wujud \xB7 1165\u20131240", col: 2, h: 65, color: "#2ee8d0", score: 95, glow: true, note: "Unity of Being \u2014 'the soul's ground and God's ground are one ground'" },
    { id: "rumi", label: "Rumi / Persian Sufism", sub: "Fana, divine love \xB7 13th c.", col: 2, h: 55, color: "#3ac5b5", score: 92, glow: true, note: "Annihilation of self in God \u2014 love dissolves the lover/Beloved divide" },
    { id: "ghazali", label: "Al-Ghazali", sub: "Ihya Ulum al-Din \xB7 1058\u20131111", col: 2, h: 80, color: "#8aaa6a", score: 58, note: "Attacked philosophy, embraced Sufism \u2014 Islam's bridge figure" },
    { id: "ibnTaymiyyah", label: "Ibn Taymiyyah", sub: "Literalist revolt \xB7 1263\u20131328", col: 2, h: 100, color: "#d48a4e", score: 12, note: "THE FORK \u2014 attacked Ibn Arabi, insisted on literal Quran, God as sovereign will" },
    { id: "sufiOrders", label: "Sufi Orders", sub: "Naqshbandi, Qadiri, Chishti", col: 3, h: 50, color: "#3ac5b5", score: 80, glow: true, note: "Institutionalized mysticism \u2014 dhikr, murshid-murid, tariqa paths" },
    { id: "mullaSadra", label: "Mulla Sadra", sub: "Transcendent Theosophy \xB7 17th c.", col: 3, h: 45, color: "#8B72BE", score: 85, glow: true, note: "Shia mystical philosophy \u2014 being as self-intensifying act, not static" },
    { id: "ottoman", label: "Ottoman Islam", sub: "Empire theology \xB7 14th\u201320th c.", col: 3, h: 75, color: "#b8924a", score: 48, note: "Held both \u2014 patronized Sufi orders AND enforced Hanafi legal orthodoxy" },
    { id: "wahhabi", label: "Wahhabism", sub: "Ibn Abd al-Wahhab \xB7 1744 \u2192", col: 3, h: 60, color: "#cc5544", score: 8, note: "Islam's Reformation \u2014 smashed Sufi shrines, pure text, obedience" },
    { id: "modernSufi", label: "Living Sufi Tradition", sub: "Orders, teachers, diaspora", col: 4, h: 35, color: "#3ac5b5", score: 82, glow: true, note: "Thin but alive \u2014 Sufi orders survive in Turkey, Senegal, South Asia, diaspora" },
    { id: "irfan", label: "Iranian Irfan", sub: "Khomeini, Tabatabai \xB7 Shia mysticism", col: 4, h: 40, color: "#7a6aad", score: 75, note: "Mystical philosophy survived in Shia seminaries \u2014 genuine contemplative strand" },
    { id: "deobandi", label: "Deobandi", sub: "South Asian revivalism \xB7 ~100M", col: 4, h: 60, color: "#cc6644", score: 15, note: "Strict legal orthodoxy, anti-Sufi, puritanical \u2014 Islam's fundamentalism" },
    { id: "salafi", label: "Salafism", sub: "Return to ancestors \xB7 ~50M", col: 4, h: 65, color: "#e06050", score: 5, note: "Strip all innovation \u2014 legal literalism, radical anti-mysticism" },
    { id: "brotherhood", label: "Muslim Brotherhood", sub: "Political Islam \xB7 Qutb, Banna", col: 4, h: 60, color: "#993a3a", score: 3, note: "Hakimiyyah = Seven Mountains \u2014 God's sovereignty as political program" },
    { id: "tradIslam", label: "Traditional Mainstream", sub: "Practicing Sunni/Shia \xB7 ~1.2B", col: 5, h: 55, color: "#b8924a", score: 40, yOverride: 395, note: "Legal-devotional mix \u2014 prayer, fasting, hajj; rarely contemplative" },
    { id: "saudiWahhabi", label: "Saudi Wahhabism", sub: "State-sponsored \xB7 petrodollars", col: 5, h: 50, color: "#cc5544", score: 6, yOverride: 560, note: "Exported literalism globally via oil wealth \u2014 Islam's prosperity gospel" },
    { id: "politicalIslam", label: "Political Islamism", sub: "Erdogan, AKP, MB offshoots \xB7 ~80M", col: 5, h: 50, color: "#aa5a4a", score: 4, yOverride: 630, note: "Faith as political identity and civilizational program" },
    { id: "jihadism", label: "Apocalyptic Jihadism", sub: "ISIS, al-Qaeda \xB7 Dabiq prophecy", col: 5, h: 45, color: "#e84450", score: 1, yOverride: 700, note: "Obsessive end-times timeline + dominionism + spiritual warfare fused" },
    { id: "contemplatIslam", label: "Contemporary Sufism / Irfan", sub: "Orders, Irfan, perennialism \xB7 ~30M", col: 5, h: 40, color: "#3ac5b5", score: 80, glow: true, yOverride: 185, note: "Thin stream \u2014 Sufi orders, Iranian Irfan, Traditionalist school" }
  ],
  links: [
    { from: "earlyIslam", to: "sufiEarly", value: 12, stream: "sufiEarly" },
    { from: "earlyIslam", to: "shia", value: 18, stream: "shia" },
    { from: "earlyIslam", to: "ashari", value: 40, stream: "ashari" },
    { from: "earlyIslam", to: "mutazila", value: 10, stream: "mutazila" },
    { from: "sufiEarly", to: "ibnArabi", value: 8, stream: "ibnArabi" },
    { from: "sufiEarly", to: "rumi", value: 6, stream: "sufi" },
    { from: "sufiEarly", to: "ghazali", value: 3, stream: "sufi" },
    { from: "shia", to: "ghazali", value: 3, stream: "shia" },
    { from: "shia", to: "mullaSadra", value: 10, stream: "mullaSadra" },
    { from: "ashari", to: "ghazali", value: 18, stream: "ghazali" },
    { from: "ashari", to: "ibnTaymiyyah", value: 22, stream: "ibnTaymiyyah" },
    { from: "mutazila", to: "ghazali", value: 5, stream: "mutazila" },
    { from: "ibnArabi", to: "sufiOrders", value: 7, stream: "sufi" },
    { from: "rumi", to: "sufiOrders", value: 5, stream: "sufi" },
    { from: "ghazali", to: "sufiOrders", value: 5, stream: "sufi" },
    { from: "ghazali", to: "ottoman", value: 14, stream: "ottoman" },
    { from: "ibnTaymiyyah", to: "wahhabi", value: 18, stream: "wahhabi" },
    { from: "ibnTaymiyyah", to: "ottoman", value: 4, stream: "ibnTaymiyyah" },
    { from: "ibnArabi", to: "mullaSadra", value: 3, stream: "ibnArabi" },
    { from: "sufiOrders", to: "modernSufi", value: 8, stream: "sufi" },
    { from: "sufiOrders", to: "irfan", value: 3, stream: "sufi" },
    { from: "mullaSadra", to: "irfan", value: 8, stream: "irfan" },
    { from: "ottoman", to: "deobandi", value: 5, stream: "deobandi" },
    { from: "ottoman", to: "brotherhood", value: 4, stream: "brotherhood" },
    { from: "wahhabi", to: "salafi", value: 12, stream: "salafi" },
    { from: "wahhabi", to: "deobandi", value: 5, stream: "wahhabi" },
    { from: "wahhabi", to: "brotherhood", value: 4, stream: "brotherhood" },
    { from: "modernSufi", to: "contemplatIslam", value: 6, stream: "sufi" },
    { from: "irfan", to: "contemplatIslam", value: 5, stream: "irfan" },
    { from: "salafi", to: "saudiWahhabi", value: 6, stream: "salafi" },
    { from: "salafi", to: "jihadism", value: 5, stream: "jihadism" },
    { from: "brotherhood", to: "politicalIslam", value: 6, stream: "political" },
    { from: "brotherhood", to: "jihadism", value: 3, stream: "jihadism" },
    { from: "deobandi", to: "tradIslam", value: 4, stream: "mainstream" },
    { from: "deobandi", to: "jihadism", value: 3, stream: "jihadism" },
    { from: "salafi", to: "politicalIslam", value: 3, stream: "political" },
    { from: "modernSufi", to: "tradIslam", value: 3, stream: "mainstream" }
  ],
  eraLabels: ["ORIGINS", "CLASSICAL", "MEDIEVAL FORK", "PRE-MODERN", "MODERN", "CONTEMPORARY"],
  title: "The Parallel Inversion: Islam",
  description: "From Ibn Arabi's Wahdat al-Wujud to apocalyptic jihadism \u2014 the same metaphysical fork, the same cascade into instrumentalized religion. Scored against the mystical pole. Hover for diagnostic notes.",
  legendLabels: ["High alignment (70\u2013100)", "Moderate (50\u201369)", "Mixed (35\u201349)", "Low (20\u201334)", "Very low (10\u201319)", "Inverted (0\u20139)"],
  invertedBracket: { xOffset: 185, y1: 555, y2: 750, scoreLabel: "ALL SCORE \u2264 6", description: "fully inverted" },
  yAxis: { top: { label: "MYSTICAL", subLabels: ["fana / union", "wahdat al-wujud", "interiority", "love beyond reason"] }, bottom: { label: "INVERTED", subLabels: ["exteriority", "literalism", "political conquest", "apocalyptic violence"] } },
  explanatoryNote: { heading: "The parallel structure:", text: "Ibn Arabi (1165\u20131240) and Ibn Taymiyyah (1263\u20131328) are almost exact contemporaries of Eckhart and Ockham \u2014 and play identical roles. The fork from participatory metaphysics (wahdat al-wujud) to divine voluntarism produces the same cascade: literalism \u2192 puritanical reform \u2192 political instrumentalization \u2192 apocalyptic violence. Al-Ghazali at 58 plays a role analogous to Catholicism \u2014 holding both streams. Shia Islam preserved more mystical DNA through Irfan, paralleling Eastern Orthodoxy's preservation of theosis. The thin teal stream survives in Sufi orders, Iranian seminaries, and diaspora communities \u2014 but is vastly outnumbered." },
  tooltipWidth: 340,
  tooltipHeight: 192
};

// content/pages/artifacts/metaphysical-choices-sankey/data/economics.json
var economics_default = {
  streamColors: {
    ancient: { start: "#c9a84c", end: "#b8924a" },
    oikonomia: { start: "#3ac5b5", end: "#2a9a8a" },
    scholastic: { start: "#8B72BE", end: "#7a6aad" },
    mercantile: { start: "#d48a4e", end: "#c4703e" },
    smith: { start: "#8aaa6a", end: "#7a9a5a" },
    physiocrat: { start: "#7a9aaa", end: "#6a8a9a" },
    classical: { start: "#b8924a", end: "#a07a3a" },
    marxist: { start: "#cc6644", end: "#b85a3e" },
    marginalist: { start: "#cc5544", end: "#aa4a3a" },
    institutional: { start: "#8aaa6a", end: "#3ac5b5" },
    keynesian: { start: "#b8924a", end: "#8aaa6a" },
    austrian: { start: "#d48a4e", end: "#cc6644" },
    neoclassical: { start: "#e06050", end: "#d45a4a" },
    chicago: { start: "#cc5544", end: "#e84450" },
    finance: { start: "#e84450", end: "#d4344a" },
    behavioral: { start: "#8aaa6a", end: "#7a9a5a" },
    ecological: { start: "#3ac5b5", end: "#2ee8d0" },
    commons: { start: "#2ee8d0", end: "#3ac5b5" },
    degrowth: { start: "#3ac5b5", end: "#8B72BE" },
    crypto: { start: "#dd3a4a", end: "#cc2a3a" },
    platform: { start: "#993a3a", end: "#8a2a2a" },
    welfare: { start: "#8aaa6a", end: "#b8924a" },
    development: { start: "#aa5a4a", end: "#9a4a3a" }
  },
  nodes: [
    { id: "ancient", label: "Ancient Oikonomia", sub: "Aristotle, Xenophon \xB7 household / polis", col: 0, h: 240, color: "#c9a84c", score: 80, note: "Economy as stewardship of the household for the good life \u2014 embedded in ethics" },
    { id: "scholastic", label: "Scholastic Economics", sub: "Aquinas, Oresme \xB7 just price, usury ban", col: 1, h: 75, color: "#8B72BE", score: 65, note: "Economic activity subordinated to moral law \u2014 the price should be just, not merely market" },
    { id: "islamicEcon", label: "Islamic Economics", sub: "Ibn Khaldun, riba prohibition", col: 1, h: 60, color: "#7a6aad", score: 60, note: "Asabiyyah (social cohesion) as economic foundation \u2014 wealth serves community bonds" },
    { id: "commons", label: "Commons / Guilds", sub: "Shared land, craft mastery \xB7 medieval", col: 1, h: 65, color: "#3ac5b5", score: 72, glow: true, note: "Economic life embedded in community \u2014 production as participation, not extraction" },
    { id: "mercantile", label: "Mercantilism", sub: "State wealth accumulation \xB7 16th c.", col: 1, h: 70, color: "#d48a4e", score: 20, note: "THE FORK \u2014 economy redefined as national power; wealth as zero-sum conquest" },
    { id: "smith", label: "Adam Smith", sub: "Wealth of Nations \xB7 1776", col: 2, h: 70, color: "#8aaa6a", score: 55, note: "Genuinely both \u2014 moral philosopher first; invisible hand within moral sentiments" },
    { id: "physiocrat", label: "Physiocrats", sub: "Quesnay \xB7 land as true wealth \xB7 1750s", col: 2, h: 45, color: "#7a9aaa", score: 50, note: "Nature as source of value \u2014 still participatory, but beginning to model & abstract" },
    { id: "ricardo", label: "Ricardo / Classical", sub: "Comparative advantage, iron law of wages", col: 2, h: 70, color: "#b8924a", score: 30, note: "Ethics recedes \u2014 laws of economics as impersonal mechanism, like Newtonian physics" },
    { id: "marx", label: "Marx", sub: "Capital \xB7 1867", col: 2, h: 65, color: "#cc6644", score: 35, note: "Diagnosed alienation (loss of participation) but prescribed another instrumentalism" },
    { id: "marginalist", label: "Marginalist Revolution", sub: "Jevons, Menger, Walras \xB7 1870s", col: 3, h: 60, color: "#cc5544", score: 12, note: "Value = subjective utility; economics becomes calculus; the human becomes a function" },
    { id: "institutional", label: "Institutional Economics", sub: "Veblen, Commons, Polanyi", col: 3, h: 50, color: "#8aaa6a", score: 58, note: "Economy is embedded in society, not the other way around \u2014 recovered participation" },
    { id: "keynesian", label: "Keynesian", sub: "General Theory \xB7 1936", col: 3, h: 55, color: "#b8924a", score: 40, note: "Government manages aggregate demand \u2014 technocratic but acknowledges human irrationality" },
    { id: "austrian", label: "Austrian School", sub: "Mises, Hayek \xB7 spontaneous order", col: 3, h: 50, color: "#b8924a", score: 38, note: "Distributed knowledge, anti-planning \u2014 genuinely anti-instrumentalist epistemology" },
    { id: "welfare", label: "Welfare State", sub: "Beveridge, New Deal, social democracy", col: 3, h: 50, color: "#8aaa6a", score: 45, note: "Economy serves human needs \u2014 partial recovery of oikonomia through redistribution" },
    { id: "chicago", label: "Chicago School", sub: "Friedman, Becker, Stigler", col: 4, h: 55, color: "#cc5544", score: 8, note: "Everything is a market \u2014 marriage, crime, children all modeled as utility optimization" },
    { id: "neoclassical", label: "Neoclassical Synthesis", sub: "DSGE models, rational expectations", col: 4, h: 55, color: "#e06050", score: 10, note: "Elegant math, fictional humans \u2014 representative agents maximizing in perfect markets" },
    { id: "ecological", label: "Ecological Economics", sub: "Daly, Georgescu-Roegen \xB7 steady-state", col: 4, h: 40, color: "#3ac5b5", score: 72, glow: true, note: "Economy as subsystem of biosphere \u2014 nature has intrinsic value, not just resource value" },
    { id: "behavioral", label: "Behavioral Economics", sub: "Kahneman, Thaler \xB7 nudge theory", col: 4, h: 40, color: "#8aaa6a", score: 30, note: "Humans aren't rational \u2014 but the fix is to manipulate their irrationality more cleverly" },
    { id: "financialization", label: "Financialization", sub: "Derivatives, securitization \xB7 1980s \u2192", col: 4, h: 55, color: "#e84450", score: 3, note: "Money making money \u2014 value abstracted from all human good; chrematistike triumphant" },
    { id: "commonsRevival", label: "Commons Revival", sub: "Ostrom \xB7 Nobel 2009", col: 4, h: 35, color: "#2ee8d0", score: 70, glow: true, note: "Communities CAN manage shared resources \u2014 neither state nor market needed" },
    { id: "degrowth", label: "Degrowth / Doughnut", sub: "Raworth, Hickel, Latouche \xB7 ~2M", col: 5, h: 38, color: "#b8924a", score: 35, yOverride: 370, note: "Correct diagnosis, naive politics \u2014 vulnerable to capture by the power it critiques" },
    { id: "localFirst", label: "Local / Solidarity Economy", sub: "Cooperatives, CSAs, mutual aid", col: 5, h: 35, color: "#2ee8d0", score: 72, glow: true, yOverride: 190, note: "Economic life re-embedded in community \u2014 participation over extraction" },
    { id: "stakeholder", label: "Stakeholder Capitalism", sub: "Davos rhetoric, ESG, B-corps", col: 5, h: 40, color: "#b8924a", score: 20, yOverride: 400, note: "Acknowledges the problem, instrumentalizes the solution \u2014 greenwashing risk" },
    { id: "algoTrading", label: "Algorithmic Trading", sub: "HFT, quant funds \xB7 microsecond profits", col: 5, h: 50, color: "#e84450", score: 1, yOverride: 530, note: "Machines trading with machines \u2014 humans fully removed from economic activity" },
    { id: "platformCapital", label: "Platform Capitalism", sub: "Uber, Airbnb, gig economy", col: 5, h: 48, color: "#993a3a", score: 3, yOverride: 600, note: "Extract value from human activity without employing humans \u2014 digital enclosure" },
    { id: "cryptoDefi", label: "Crypto / DeFi", sub: "Trustless finance \xB7 speculation", col: 5, h: 45, color: "#dd3a4a", score: 4, yOverride: 668, note: "Decentralized but not re-embedded \u2014 speculation without community" },
    { id: "debtMachine", label: "Sovereign Debt / MMT-as-weapon", sub: "Infinite growth imperative", col: 5, h: 45, color: "#aa5a4a", score: 2, yOverride: 733, note: "Entire nations as debt-servicing entities \u2014 economy consumes the polity" }
  ],
  links: [
    { from: "ancient", to: "scholastic", value: 15, stream: "scholastic" },
    { from: "ancient", to: "islamicEcon", value: 10, stream: "scholastic" },
    { from: "ancient", to: "commons", value: 15, stream: "commons" },
    { from: "ancient", to: "mercantile", value: 18, stream: "mercantile" },
    { from: "scholastic", to: "smith", value: 6, stream: "smith" },
    { from: "scholastic", to: "physiocrat", value: 4, stream: "oikonomia" },
    { from: "scholastic", to: "marx", value: 3, stream: "scholastic" },
    { from: "islamicEcon", to: "smith", value: 3, stream: "smith" },
    { from: "commons", to: "smith", value: 3, stream: "commons" },
    { from: "commons", to: "marx", value: 5, stream: "commons" },
    { from: "mercantile", to: "ricardo", value: 10, stream: "classical" },
    { from: "mercantile", to: "smith", value: 6, stream: "mercantile" },
    { from: "smith", to: "marginalist", value: 4, stream: "marginalist" },
    { from: "smith", to: "institutional", value: 4, stream: "institutional" },
    { from: "smith", to: "keynesian", value: 3, stream: "keynesian" },
    { from: "smith", to: "austrian", value: 3, stream: "austrian" },
    { from: "physiocrat", to: "institutional", value: 3, stream: "institutional" },
    { from: "ricardo", to: "marginalist", value: 8, stream: "marginalist" },
    { from: "ricardo", to: "marx", value: 6, stream: "marxist" },
    { from: "ricardo", to: "keynesian", value: 4, stream: "keynesian" },
    { from: "marx", to: "institutional", value: 5, stream: "institutional" },
    { from: "marx", to: "welfare", value: 4, stream: "welfare" },
    { from: "marx", to: "keynesian", value: 3, stream: "keynesian" },
    { from: "marginalist", to: "neoclassical", value: 8, stream: "neoclassical" },
    { from: "marginalist", to: "chicago", value: 7, stream: "chicago" },
    { from: "marginalist", to: "financialization", value: 4, stream: "finance" },
    { from: "institutional", to: "ecological", value: 5, stream: "ecological" },
    { from: "institutional", to: "behavioral", value: 3, stream: "behavioral" },
    { from: "institutional", to: "commonsRevival", value: 4, stream: "commons" },
    { from: "keynesian", to: "neoclassical", value: 4, stream: "neoclassical" },
    { from: "keynesian", to: "behavioral", value: 3, stream: "behavioral" },
    { from: "keynesian", to: "welfare", value: 3, stream: "welfare" },
    { from: "austrian", to: "chicago", value: 5, stream: "chicago" },
    { from: "austrian", to: "financialization", value: 3, stream: "finance" },
    { from: "welfare", to: "behavioral", value: 2, stream: "welfare" },
    { from: "welfare", to: "ecological", value: 2, stream: "ecological" },
    { from: "ecological", to: "degrowth", value: 5, stream: "degrowth" },
    { from: "ecological", to: "localFirst", value: 4, stream: "commons" },
    { from: "commonsRevival", to: "localFirst", value: 4, stream: "commons" },
    { from: "commonsRevival", to: "degrowth", value: 3, stream: "degrowth" },
    { from: "behavioral", to: "stakeholder", value: 3, stream: "behavioral" },
    { from: "chicago", to: "algoTrading", value: 5, stream: "finance" },
    { from: "chicago", to: "platformCapital", value: 4, stream: "platform" },
    { from: "chicago", to: "cryptoDefi", value: 3, stream: "crypto" },
    { from: "neoclassical", to: "algoTrading", value: 5, stream: "finance" },
    { from: "neoclassical", to: "stakeholder", value: 3, stream: "neoclassical" },
    { from: "neoclassical", to: "debtMachine", value: 4, stream: "finance" },
    { from: "financialization", to: "algoTrading", value: 6, stream: "finance" },
    { from: "financialization", to: "cryptoDefi", value: 4, stream: "crypto" },
    { from: "financialization", to: "platformCapital", value: 4, stream: "platform" },
    { from: "financialization", to: "debtMachine", value: 4, stream: "finance" }
  ],
  eraLabels: ["ANCIENT", "MEDIEVAL", "CLASSICAL", "LATE 19TH C.", "LATE 20TH C.", "CONTEMPORARY"],
  title: "The Triumph of Chrematistike",
  description: "Aristotle distinguished oikonomia (household management for flourishing) from chrematistike (money-making as its own end). Every node on this chart is a position in that ancient argument. Hover for diagnostic notes.",
  legendLabels: ["Embedded / participatory (70\u2013100)", "Moderate (50\u201369)", "Mixed (35\u201349)", "Thinned (20\u201334)", "Disembedded (10\u201319)", "Pure extraction (0\u20139)"],
  invertedBracket: { xOffset: 200, y1: 525, y2: 783, scoreLabel: "ALL SCORE \u2264 4", description: "pure chrematistike" },
  yAxis: {
    top: { label: "OIKONOMIA", subLabels: ["human flourishing", "embedded in community", "sufficiency", "common good"] },
    bottom: { label: "CHREMATISTIKE", subLabels: ["money for money's sake", "disembedded from life", "infinite accumulation", "humans as inputs"] }
  },
  explanatoryNote: {
    heading: "Aristotle named it 2,400 years ago:",
    text: `Chrematistike \u2014 money-making as its own end \u2014 is "unnatural" because it has no inherent limit. Oikonomia aims at sufficiency for the good life; chrematistike aims at infinite accumulation. Adam Smith at 55 is the bridge \u2014 moral philosopher who also unleashed the market; Theory of Moral Sentiments and Wealth of Nations are the two halves of his Catholicism. The Marginalist Revolution at 12 is the nominalist fork \u2014 value becomes subjective utility, economics becomes calculus, the human becomes a maximizing function. The Austrian School at 38 preserves genuine anti-instrumentalist insight \u2014 distributed knowledge, anti-planning \u2014 but still treats the human as a maximizer. Degrowth at 35 correctly diagnoses infinite growth on a finite planet but has no viable theory of transition and is vulnerable to capture by power. Ostrom and the commons revival proved communities can manage shared resources without either state or market \u2014 the thin teal stream. Algorithmic trading at 1: machines trading with machines, humans fully removed. Aristotle's nightmare.`
  }
};

// content/pages/artifacts/metaphysical-choices-sankey.jsx
import { jsx as jsx2, jsxs as jsxs2 } from "https://esm.sh/react/jsx-runtime";
var TABS = [
  { label: "Gravity", component: GravityIntro, isIntro: true },
  { label: "Science", data: science_default },
  { label: "Education", data: education_default },
  { label: "Theology", data: theology_default },
  { label: "Psychology", data: psychology_default },
  { label: "Buddhism", data: buddhism_default },
  { label: "Islam", data: islam_default },
  { label: "Economics", data: economics_default }
];
function MetaphysicalChoices() {
  const [activeTab, setActiveTab] = useState(0);
  const [zoom, setZoom] = useState(1.4);
  const tab = TABS[activeTab];
  const isIntro = tab.isIntro;
  return /* @__PURE__ */ jsxs2("div", {
    style: { background: "#0f0f0e", minHeight: "100vh" },
    children: [
      /* @__PURE__ */ jsxs2("div", {
        style: {
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#1a1a18",
          borderBottom: "1px solid #2a2a28",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          fontFamily: "'Crimson Pro', Georgia, serif"
        },
        children: [
          TABS.map((t, i) => /* @__PURE__ */ jsx2("button", {
            onClick: () => setActiveTab(i),
            style: {
              background: i === activeTab ? "#2a2a28" : "transparent",
              color: i === activeTab ? "#c9a84c" : "#9a9888",
              border: "none",
              borderBottom: i === activeTab ? "2px solid #c9a84c" : "2px solid transparent",
              padding: "12px 18px",
              fontSize: "15px",
              fontFamily: "inherit",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.2s, background 0.2s"
            },
            onMouseEnter: (e) => {
              if (i !== activeTab) {
                e.currentTarget.style.color = "#e8e4da";
                e.currentTarget.style.background = "#222220";
              }
            },
            onMouseLeave: (e) => {
              if (i !== activeTab) {
                e.currentTarget.style.color = "#9a9888";
                e.currentTarget.style.background = "transparent";
              }
            },
            children: t.label
          }, t.label)),
          !isIntro && /* @__PURE__ */ jsxs2("div", {
            style: { marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", padding: "6px 0", flexShrink: 0 },
            children: [
              /* @__PURE__ */ jsx2("button", {
                onClick: () => setZoom((z) => Math.max(0.8, +(z - 0.1).toFixed(1))),
                style: {
                  background: "#2a2a28",
                  color: "#9a9888",
                  border: "1px solid #3a3a38",
                  borderRadius: 4,
                  width: 28,
                  height: 28,
                  fontSize: "16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "monospace"
                },
                children: "-"
              }),
              /* @__PURE__ */ jsxs2("span", {
                style: { color: "#9a9888", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", minWidth: 40, textAlign: "center" },
                children: [
                  Math.round(zoom * 100),
                  "%"
                ]
              }),
              /* @__PURE__ */ jsx2("button", {
                onClick: () => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1))),
                style: {
                  background: "#2a2a28",
                  color: "#9a9888",
                  border: "1px solid #3a3a38",
                  borderRadius: 4,
                  width: 28,
                  height: 28,
                  fontSize: "16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "monospace"
                },
                children: "+"
              }),
              zoom !== 1.4 && /* @__PURE__ */ jsx2("button", {
                onClick: () => setZoom(1.4),
                style: {
                  background: "#2a2a28",
                  color: "#9a9888",
                  border: "1px solid #3a3a38",
                  borderRadius: 4,
                  height: 28,
                  padding: "0 8px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace"
                },
                children: "Reset"
              })
            ]
          })
        ]
      }),
      isIntro ? /* @__PURE__ */ jsx2(tab.component, {}) : /* @__PURE__ */ jsx2("div", {
        style: { overflow: "auto", position: "relative" },
        children: /* @__PURE__ */ jsx2("div", {
          style: {
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            width: `${100 / zoom}%`,
            marginLeft: "auto",
            marginRight: "auto"
          },
          children: /* @__PURE__ */ jsx2(SankeyDiagram, {
            data: tab.data
          })
        })
      })
    ]
  });
}
export {
  MetaphysicalChoices as default
};
