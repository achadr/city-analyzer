import type { FeatureCollection } from "geojson";
import type { FilterSpecification } from "mapbox-gl";

export type AgeBand = "all" | "0-17" | "18-25" | "26-30" | "31-64" | "65+";

export function makeAgeFilter(band: AgeBand): FilterSpecification | null {
  switch (band) {
    case "0-17":
      return ["all", ["!has", "point_count"], ["<=", "age", 17]] as unknown as FilterSpecification;
    case "18-25":
      return ["all", ["!has", "point_count"], [">=", "age", 18], ["<=", "age", 25]] as unknown as FilterSpecification;
    case "26-30":
      return ["all", ["!has", "point_count"], [">=", "age", 26], ["<=", "age", 30]] as unknown as FilterSpecification;
    case "31-64":
      return ["all", ["!has", "point_count"], [">=", "age", 31], ["<=", "age", 64]] as unknown as FilterSpecification;
    case "65+":
      return ["all", ["!has", "point_count"], [">=", "age", 65]] as unknown as FilterSpecification;
    default:
      return ["!has", "point_count"] as unknown as FilterSpecification;
  }
}

export function filterByAgeBand(fc: FeatureCollection, band: AgeBand): FeatureCollection {
  if (band === "all") return fc;
  const [min, max] =
    band === "0-17" ? [0, 17] :
    band === "18-25" ? [18, 25] :
    band === "26-30" ? [26, 30] :
    band === "31-64" ? [31, 64] : [65, Infinity];
  const features = fc.features.filter((f: any) => {
    const age = Number(f?.properties?.age);
    return Number.isFinite(age) && age >= min && age <= max;
  });
  return { type: "FeatureCollection", features } as FeatureCollection;
}


