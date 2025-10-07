import React, { useState } from "react";
import MapView from "./maps/MapView";
import SidePanel from "./components/SidePanel";
import TimeSlider from "./components/TimeSlider";

export default function App(): React.JSX.Element {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
  if (!token) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
        <h1>City Analyzer</h1>
        <p>
          Missing Mapbox token. Create a file named <code>.env</code> at the project root with:
        </p>
        <pre style={{ background: "#f5f5f5", padding: 12 }}>
{`VITE_MAPBOX_TOKEN=YOUR_MAPBOX_ACCESS_TOKEN`}
        </pre>
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState<"layers" | "filters">("layers");
  const [layers, setLayers] = useState({ arrondissementsVisible: true, populationVisible: true });
  const [filters, setFilters] = useState({ ageBand: "all" as "all" | "0-17" | "18-25" | "26-30" | "31-64" | "65+" });
  const [minutes, setMinutes] = useState(8 * 60); // 08:00

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <SidePanel
        activeTab={activeTab}
        onTabChange={setActiveTab}
        layers={layers}
        onLayersChange={setLayers}
        filters={filters}
        onFiltersChange={setFilters}
      />
      <MapView
        accessToken={token}
        arrondissementsVisible={layers.arrondissementsVisible}
        populationVisible={layers.populationVisible}
        ageBand={filters.ageBand}
        minutes={minutes}
      />
      <TimeSlider minutes={minutes} onChange={setMinutes} />
    </div>
  );
}