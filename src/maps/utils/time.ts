import type { FeatureCollection } from "geojson";

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => Number(x));
  return (h % 24) * 60 + (m % 60);
}

export function filterByTime(fc: FeatureCollection, mins: number): FeatureCollection {
  const t = ((mins % 1440) + 1440) % 1440;
  const features = fc.features.filter((f: any) => {
    const s = Number(f?.properties?.start);
    const e = Number(f?.properties?.end);
    if (!Number.isFinite(s) || !Number.isFinite(e)) return true;
    return s <= e ? t >= s && t <= e : t >= s || t <= e;
  });
  return { type: "FeatureCollection", features } as FeatureCollection;
}


