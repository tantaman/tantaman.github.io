// content/pages/artifacts/metaphysical-choices-sankey.jsx
import { useState } from "https://esm.sh/react";
import ScienceSankey from "./metaphysical-choices-sankey/science-sankey.js";
import EducationSankey from "./metaphysical-choices-sankey/education-sankey.js";
import TheologicalSankey from "./metaphysical-choices-sankey/theological-sankey.js";
import PsychologySankey from "./metaphysical-choices-sankey/psychology-sankey.js";
import BuddhismSankey from "./metaphysical-choices-sankey/buddhism-sankey.js";
import IslamicSankey from "./metaphysical-choices-sankey/islamic-sankey.js";
import EconomicsSankey from "./metaphysical-choices-sankey/economics-sankey.js";
import { jsx, jsxs } from "https://esm.sh/react/jsx-runtime";
var TABS = [
  { label: "Science", component: ScienceSankey },
  { label: "Education", component: EducationSankey },
  { label: "Theology", component: TheologicalSankey },
  { label: "Psychology", component: PsychologySankey },
  { label: "Buddhism", component: BuddhismSankey },
  { label: "Islam", component: IslamicSankey },
  { label: "Economics", component: EconomicsSankey }
];
function MetaphysicalChoices() {
  const [activeTab, setActiveTab] = useState(0);
  const ActiveComponent = TABS[activeTab].component;
  return /* @__PURE__ */ jsxs("div", {
    style: { background: "#0f0f0e", minHeight: "100vh" },
    children: [
      /* @__PURE__ */ jsx("div", {
        style: {
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#1a1a18",
          borderBottom: "1px solid #2a2a28",
          padding: "0 16px",
          display: "flex",
          gap: "4px",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          fontFamily: "'Crimson Pro', Georgia, serif"
        },
        children: TABS.map((tab, i) => /* @__PURE__ */ jsx("button", {
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
          children: tab.label
        }, tab.label))
      }),
      /* @__PURE__ */ jsx(ActiveComponent, {})
    ]
  });
}
export {
  MetaphysicalChoices as default
};
