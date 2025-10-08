import React, { useState } from "react";
import MapView from "./maps/MapView";
import SidePanel from "./components/SidePanel";
import TimeSlider from "./components/TimeSlider";
import PersonPanel from "./components/PersonPanel";
import { Person, LayersState, FiltersState, ActivityChainData, PersonSelectionCallback, ActivityChainToggleCallback } from "./types";
import { DEFAULT_TIME } from "./constants";

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
  const [layers, setLayers] = useState<LayersState>({ arrondissementsVisible: true, populationVisible: true });
  const [filters, setFilters] = useState<FiltersState>({ ageBand: "all" });
  const [minutes, setMinutes] = useState(DEFAULT_TIME);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showActivityChain, setShowActivityChain] = useState(false);
  const [activityChainData, setActivityChainData] = useState<ActivityChainData | null>(null);

  const handleActivityChainToggle: ActivityChainToggleCallback = (show, data) => {
    setShowActivityChain(show);
    setActivityChainData(data);
  };

  const handlePersonSelect: PersonSelectionCallback = (person) => {
    setSelectedPerson(person);
    // Reset activity chain when selecting a new person
    setShowActivityChain(false);
    setActivityChainData(null);
  };

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
        onPersonSelect={handlePersonSelect}
        showActivityChain={showActivityChain}
        activityChainData={activityChainData}
      />
      <PersonPanel 
        person={selectedPerson} 
        onClose={() => {
          setSelectedPerson(null);
          setShowActivityChain(false);
          setActivityChainData(null);
        }}
        onActivityChainToggle={handleActivityChainToggle}
      />
      <TimeSlider minutes={minutes} onChange={setMinutes} />
    </div>
  );
}