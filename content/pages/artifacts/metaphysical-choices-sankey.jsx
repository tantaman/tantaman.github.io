import { useState } from "react";
import GravityIntro from "./metaphysical-choices-sankey/gravity-intro.jsx";
import ScienceSankey from "./metaphysical-choices-sankey/science-sankey.jsx";
import EducationSankey from "./metaphysical-choices-sankey/education-sankey.jsx";
import TheologicalSankey from "./metaphysical-choices-sankey/theological-sankey.jsx";
import PsychologySankey from "./metaphysical-choices-sankey/psychology-sankey.jsx";
import BuddhismSankey from "./metaphysical-choices-sankey/buddhism-sankey.jsx";
import IslamicSankey from "./metaphysical-choices-sankey/islamic-sankey.jsx";
import EconomicsSankey from "./metaphysical-choices-sankey/economics-sankey.jsx";

const TABS = [
  { label: "Gravity", component: GravityIntro, isIntro: true },
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
  const [zoom, setZoom] = useState(1.4);
  const ActiveComponent = TABS[activeTab].component;
  const isIntro = TABS[activeTab].isIntro;

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
          alignItems: "center",
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
        {!isIntro && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", padding: "6px 0", flexShrink: 0 }}>
            <button
              onClick={() => setZoom(z => Math.max(0.8, +(z - 0.1).toFixed(1)))}
              style={{
                background: "#2a2a28", color: "#9a9888", border: "1px solid #3a3a38",
                borderRadius: 4, width: 28, height: 28, fontSize: "16px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "monospace",
              }}
            >-</button>
            <span style={{ color: "#9a9888", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", minWidth: 40, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(2.0, +(z + 0.1).toFixed(1)))}
              style={{
                background: "#2a2a28", color: "#9a9888", border: "1px solid #3a3a38",
                borderRadius: 4, width: 28, height: 28, fontSize: "16px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "monospace",
              }}
            >+</button>
            {zoom !== 1.4 && (
              <button
                onClick={() => setZoom(1.4)}
                style={{
                  background: "#2a2a28", color: "#9a9888", border: "1px solid #3a3a38",
                  borderRadius: 4, height: 28, padding: "0 8px", fontSize: "11px", cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >Reset</button>
            )}
          </div>
        )}
      </div>
      {isIntro ? (
        <ActiveComponent />
      ) : (
        <div style={{ overflow: "auto", position: "relative" }}>
          <div style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            width: `${100 / zoom}%`,
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            <ActiveComponent />
          </div>
        </div>
      )}
    </div>
  );
}
