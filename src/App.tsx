import React, { useState, useEffect } from "react";
import MapView, { DrawnZone, ZoneSelectionCallback } from "./maps/MapView";
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
  const [selectedZone, setSelectedZone] = useState<DrawnZone | null>(null);
  const [populationData, setPopulationData] = useState<Person[]>([]);

  // Load population data
  useEffect(() => {
    fetch("/data/population.json")
      .then((r) => r.json())
      .then((data) => setPopulationData(data))
      .catch((e) => console.error("Failed to load population.json", e));
  }, []);

  const handleActivityChainToggle: ActivityChainToggleCallback = (show, data) => {
    setShowActivityChain(show);
    setActivityChainData(data);
  };

  const handlePersonSelect: PersonSelectionCallback = (person) => {
    setSelectedPerson(person);
    // Reset activity chain when selecting a new person
    setShowActivityChain(false);
    setActivityChainData(null);
    // Clear zone selection when selecting a person
    setSelectedZone(null);
  };

  const handleZoneSelect: ZoneSelectionCallback = (zone) => {
    setSelectedZone(zone);
    // Don't clear person selection - allow both to coexist
    // The PersonPanel will show tabs when both are active
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
        onZoneSelect={handleZoneSelect}
      />
      <PersonPanel
        person={selectedPerson}
        onClose={() => {
          setSelectedPerson(null);
          setShowActivityChain(false);
          setActivityChainData(null);
          setSelectedZone(null);
        }}
        onActivityChainToggle={handleActivityChainToggle}
        selectedZone={selectedZone}
        populationData={populationData}
      />
      <TimeSlider minutes={minutes} onChange={setMinutes} />
    </div>
  );
}