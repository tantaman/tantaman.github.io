import { useState } from "react";
import ScienceSankey from "./metaphysical-choices-sankey/science-sankey.jsx";
import EducationSankey from "./metaphysical-choices-sankey/education-sankey.jsx";
import TheologicalSankey from "./metaphysical-choices-sankey/theological-sankey.jsx";
import PsychologySankey from "./metaphysical-choices-sankey/psychology-sankey.jsx";
import BuddhismSankey from "./metaphysical-choices-sankey/buddhism-sankey.jsx";
import IslamicSankey from "./metaphysical-choices-sankey/islamic-sankey.jsx";
import EconomicsSankey from "./metaphysical-choices-sankey/economics-sankey.jsx";

const TABS = [
  { label: "Science", component: ScienceSankey },
  { label: "Education", component: EducationSankey },
  { label: "Theology", component: TheologicalSankey },
  { label: "Psychology", component: PsychologySankey },
  { label: "Buddhism", component: BuddhismSankey },
  { label: "Islam", component: IslamicSankey },
  { label: "Economics", component: EconomicsSankey },
];

export default function MetaphysicalChoices() {
  const [activeTab, setActiveTab] = useState(0);
  const ActiveComponent = TABS[activeTab].component;

  return (
    <div style={{ background: "#0f0f0e", minHeight: "100vh" }}>
      <div
        style={{
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
          fontFamily: "'Crimson Pro', Georgia, serif",
        }}
      >
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            style={{
              background: i === activeTab ? "#2a2a28" : "transparent",
              color: i === activeTab ? "#c9a84c" : "#9a9888",
              border: "none",
              borderBottom: i === activeTab ? "2px solid #c9a84c" : "2px solid transparent",
              padding: "12px 18px",
              fontSize: "15px",
              fontFamily: "inherit",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.2s, background 0.2s",
            }}
            onMouseEnter={(e) => {
              if (i !== activeTab) {
                e.currentTarget.style.color = "#e8e4da";
                e.currentTarget.style.background = "#222220";
              }
            }}
            onMouseLeave={(e) => {
              if (i !== activeTab) {
                e.currentTarget.style.color = "#9a9888";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ActiveComponent />
    </div>
  );
}
