import React from "react";

type LayersState = {
  arrondissementsVisible: boolean;
  populationVisible: boolean;
};

type FiltersState = {
  ageBand: "all" | "0-17" | "18-25" | "26-30" | "31-64" | "65+";
};

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
  return (
    <div style={{ position: "absolute", top: 16, left: 16, zIndex: 1000, width: 300, background: "#fff", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
        <button onClick={() => onTabChange("layers")} style={{ flex: 1, padding: 10, background: activeTab === "layers" ? "#f0f4f8" : "#fff", border: "none", cursor: "pointer" }}>Layers</button>
        <button onClick={() => onTabChange("filters")} style={{ flex: 1, padding: 10, background: activeTab === "filters" ? "#f0f4f8" : "#fff", border: "none", cursor: "pointer" }}>Filters</button>
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
        <div style={{ padding: 12 }}>
          <button onClick={() => setAgeOpen((v) => !v)} style={{ width: "100%", textAlign: "left", padding: 8, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 6 }}>Age</button>
          {ageOpen && (
            <div style={{ padding: "8px 4px" }}>
              {(["all", "0-17", "18-25", "26-30", "31-64", "65+"] as const).map((band) => (
                <label key={band} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
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
        </div>
      )}
    </div>
  );
}


