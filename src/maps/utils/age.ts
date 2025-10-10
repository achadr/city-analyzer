import type { FeatureCollection } from "geojson";
import type { FilterSpecification } from "mapbox-gl";
import type { AgeBand, SexFilter, ActivityFilter } from "../../types";

export function makeAgeFilter(band: AgeBand): FilterSpecification | null {
  switch (band) {
    case "0-17":
      return ["all", ["!has", "point_count"], ["<=", "age", 17]] as unknown as FilterSpecification;
    case "18-25":
      return ["all", ["!has", "point_count"], [">=", "age", 18], ["<=", "age", 25]] as unknown as FilterSpecification;
    case "26-34":
      return ["all", ["!has", "point_count"], [">=", "age", 26], ["<=", "age", 34]] as unknown as FilterSpecification;
    case "35-64":
      return ["all", ["!has", "point_count"], [">=", "age", 35], ["<=", "age", 64]] as unknown as FilterSpecification;
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
    band === "26-34" ? [26, 34] :
    band === "35-64" ? [35, 64] : [65, Infinity];
  const features = fc.features.filter((f: any) => {
    const age = Number(f?.properties?.age);
    return Number.isFinite(age) && age >= min && age <= max;
  });
  return { type: "FeatureCollection", features } as FeatureCollection;
}

export function makeSexFilter(sex: SexFilter): FilterSpecification | null {
  if (sex === "all") {
    return ["!has", "point_count"] as unknown as FilterSpecification;
  }
  return ["all", ["!has", "point_count"], ["==", "sex", sex]] as unknown as FilterSpecification;
}

export function filterBySex(fc: FeatureCollection, sex: SexFilter): FeatureCollection {
  if (sex === "all") return fc;
  const features = fc.features.filter((f: any) => f?.properties?.sex === sex);
  return { type: "FeatureCollection", features } as FeatureCollection;
}

export function makeActivityFilter(activity: ActivityFilter): FilterSpecification | null {
  if (activity === "all") {
    return ["!has", "point_count"] as unknown as FilterSpecification;
  }
  return ["all", ["!has", "point_count"], ["==", "activityName", activity]] as unknown as FilterSpecification;
}

export function filterByActivity(fc: FeatureCollection, activity: ActivityFilter): FeatureCollection {
  if (activity === "all") return fc;
  const features = fc.features.filter((f: any) => f?.properties?.activityName === activity);
  return { type: "FeatureCollection", features } as FeatureCollection;
}


