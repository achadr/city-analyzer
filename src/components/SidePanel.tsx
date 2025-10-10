import React from "react";
import type { LayersState, FiltersState, AgeBand, SexFilter, ActivityFilter } from "../types";

type Props = {
  activeTab: "layers" | "filters";
  onTabChange: (t: "layers" | "filters") => void;
  layers: LayersState;
  onLayersChange: (s: LayersState) => void;
  filters: FiltersState;
  onFiltersChange: (f: FiltersState) => void;
};

export default function SidePanel(props: Props): React.JSX.Element {
  const { activeTab, onTabChange, layers, onLayersChange, filters, onFiltersChange } = props;
  const [ageOpen, setAgeOpen] = React.useState(true);
  const [sexOpen, setSexOpen] = React.useState(true);
  const [activityOpen, setActivityOpen] = React.useState(true);

  return (
    <div style={{ position: "absolute", top: 16, left: 16, zIndex: 1000, width: 300, background: "#fff", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", overflow: "hidden", fontFamily: "system-ui, sans-serif", maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb" }}>
        <button
          onClick={() => onTabChange("layers")}
          style={{
            flex: 1,
            padding: "12px 10px",
            background: activeTab === "layers" ? "#fff" : "transparent",
            border: "none",
            borderBottom: activeTab === "layers" ? "3px solid #3b82f6" : "3px solid transparent",
            cursor: "pointer",
            fontWeight: activeTab === "layers" ? 600 : 400,
            color: activeTab === "layers" ? "#3b82f6" : "#6b7280",
            transition: "all 0.2s ease",
            fontSize: "14px"
          }}
        >
          Layers
        </button>
        <button
          onClick={() => onTabChange("filters")}
          style={{
            flex: 1,
            padding: "12px 10px",
            background: activeTab === "filters" ? "#fff" : "transparent",
            border: "none",
            borderBottom: activeTab === "filters" ? "3px solid #3b82f6" : "3px solid transparent",
            cursor: "pointer",
            fontWeight: activeTab === "filters" ? 600 : 400,
            color: activeTab === "filters" ? "#3b82f6" : "#6b7280",
            transition: "all 0.2s ease",
            fontSize: "14px"
          }}
        >
          Filters
        </button>
      </div>
      {activeTab === "layers" ? (
        <div style={{ padding: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={layers.arrondissementsVisible} onChange={(e) => onLayersChange({ ...layers, arrondissementsVisible: e.target.checked })} />
            Paris arrondissements
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={layers.populationVisible} onChange={(e) => onLayersChange({ ...layers, populationVisible: e.target.checked })} />
            Population (clusters)
          </label>
        </div>
      ) : (
        <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
          {/* Age Filter */}
          <button onClick={() => setAgeOpen((v) => !v)} style={{ width: "100%", textAlign: "left", padding: 8, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Age {ageOpen ? "▼" : "▶"}
          </button>
          {ageOpen && (
            <div style={{ padding: "8px 4px" }}>
              {(["all", "0-17", "18-25", "26-34", "35-64", "65+"] as const).map((band) => (
                <label key={band} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="ageBand"
                    checked={filters.ageBand === band}
                    onChange={() => onFiltersChange({ ...filters, ageBand: band })}
                  />
                  {band === "all" ? "All ages" : band}
                </label>
              ))}
            </div>
          )}

          {/* Sex Filter */}
          <button onClick={() => setSexOpen((v) => !v)} style={{ width: "100%", textAlign: "left", padding: 8, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 6, marginTop: 12, cursor: "pointer", fontWeight: 600 }}>
            Sex {sexOpen ? "▼" : "▶"}
          </button>
          {sexOpen && (
            <div style={{ padding: "8px 4px" }}>
              {(["all", "male", "female"] as const).map((sex) => (
                <label key={sex} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="sex"
                    checked={filters.sex === sex}
                    onChange={() => onFiltersChange({ ...filters, sex: sex })}
                  />
                  {sex === "all" ? "All" : sex.charAt(0).toUpperCase() + sex.slice(1)}
                </label>
              ))}
            </div>
          )}

          {/* Activity Filter */}
          <button onClick={() => setActivityOpen((v) => !v)} style={{ width: "100%", textAlign: "left", padding: 8, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 6, marginTop: 12, cursor: "pointer", fontWeight: 600 }}>
            Activity {activityOpen ? "▼" : "▶"}
          </button>
          {activityOpen && (
            <div style={{ padding: "8px 4px" }}>
              {(["all", "home", "work", "school", "leisure"] as const).map((activity) => (
                <label key={activity} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="activity"
                    checked={filters.activity === activity}
                    onChange={() => onFiltersChange({ ...filters, activity: activity })}
                  />
                  {activity === "all" ? "All activities" : activity.charAt(0).toUpperCase() + activity.slice(1)}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


