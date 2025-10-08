import React, { useState } from "react";
import MapView from "./maps/MapView";
import SidePanel from "./components/SidePanel";
import TimeSlider from "./components/TimeSlider";
import PersonPanel from "./components/PersonPanel";

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
  const [selectedPerson, setSelectedPerson] = useState<null | {
    id?: number;
    age: number;
    sex: "male" | "female";
    firstName: string;
    lastName: string;
    activities: {
      name: string;
      startTime: string;
      endTime: string;
      zone: string;
      coordinates: { lat: number; lng: number };
      transport: string;
    }[];
  }>(null);
  const [showActivityChain, setShowActivityChain] = useState(false);
  const [activityChainData, setActivityChainData] = useState<null | {
    id: number;
    age: number;
    activities: {
      name: string;
      startTime: string;
      endTime: string;
      zone: string;
      coordinates: { lat: number; lng: number };
      transport: string;
    }[];
  }>(null);

  const handleActivityChainToggle = (show: boolean, data: typeof activityChainData) => {
    setShowActivityChain(show);
    setActivityChainData(data);
  };

  const handlePersonSelect = (person: typeof selectedPerson) => {
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