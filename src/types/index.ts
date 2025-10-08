export type Coordinates = { lat: number; lng: number };

export type Activity = {
  name: string;
  startTime: string;
  endTime: string;
  zone: string;
  coordinates: Coordinates;
  transport: string;
};

export type Person = {
  id?: number;
  age: number;
  sex: "male" | "female";
  firstName: string;
  lastName: string;
  activities: Activity[];
};

export type AgeBand = "all" | "0-17" | "18-25" | "26-30" | "31-64" | "65+";

export type LayersState = {
  arrondissementsVisible: boolean;
  populationVisible: boolean;
};

export type FiltersState = {
  ageBand: AgeBand;
};

export type ActivityChainData = {
  id: number;
  age: number;
  activities: Activity[];
};

export type PersonSelectionCallback = (person: Person | null) => void;

export type ActivityChainToggleCallback = (show: boolean, data: ActivityChainData | null) => void;
