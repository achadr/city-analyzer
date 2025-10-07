import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { FilterSpecification } from "mapbox-gl";
import { toMinutes, filterByTime } from "./utils/time";
import { makeAgeFilter, filterByAgeBand } from "./utils/age";

type MapViewProps = {
  accessToken: string;
  arrondissementsVisible?: boolean;
  populationVisible?: boolean;
  ageBand?: "all" | "0-17" | "18-25" | "26-30" | "31-64" | "65+";
  minutes?: number; // 0..1439
};

export default function MapView({ accessToken, arrondissementsVisible = true, populationVisible = true, ageBand = "all", minutes = 480 }: MapViewProps): React.JSX.Element {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const allFeaturesRef = useRef<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [2.3522, 48.8566],
      zoom: 10.5
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("arrondissements", {
        type: "geojson",
        data: "/data/paris-arrondissements.geojson"
      });

      map.addLayer({
        id: "arr-outline",
        type: "line",
        source: "arrondissements",
        paint: { "line-color": "#333", "line-width": 1 }
      });

      const arrFillId = "arr-fill";
      map.addLayer({
        id: arrFillId,
        type: "fill",
        source: "arrondissements",
        paint: {
          "fill-color": "#4c78a8",
          "fill-opacity": 0.15
        }
      }, "arr-outline");

      // Create a clustered GeoJSON source for population. We'll load and convert JSON → GeoJSON.
      map.addSource("population", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 40,
        clusterProperties: {
          home: ["+", ["case", ["==", ["get", "activity"], "home"], 1, 0]],
          work: ["+", ["case", ["==", ["get", "activity"], "work"], 1, 0]],
          education: [
            "+",
            [
              "case",
              ["any", ["==", ["get", "activity"], "school"], ["==", ["get", "activity"], "education"]],
              1,
              0
            ]
          ],
          leisure: ["+", ["case", ["==", ["get", "activity"], "leisure"], 1, 0]]
        }
      } as any);

      const clustersBgId = "clusters-bg";
      // background circles so clusters are visible even before pies are ready
      map.addLayer({
        id: clustersBgId,
        type: "circle",
        source: "population",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#A0E3FF",
            100,
            "#5CC8FF",
            500,
            "#2491EB"
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15,
            100,
            22,
            500,
            30
          ]
        }
      });
      const clusterCountId = "cluster-count";
      map.addLayer({
        id: clusterCountId,
        type: "symbol",
        source: "population",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
        paint: { "text-color": "#08306b" }
      });

      const unclusteredId = "unclustered-point";
      map.addLayer({
        id: unclusteredId,
        type: "circle",
        source: "population",
        filter: ["!has", "point_count"],
        paint: {
          // Color by activity
          "circle-color": [
            "match",
            ["get", "activity"],
            "home", "#3b82f6",
            "work", "#22c55e",
            "school", "#facc15",
            "education", "#facc15",
            "leisure", "#fb923c",
            "#e15759"
          ],
          "circle-radius": 4,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fff"
        }
      });
      // Load non-GeoJSON population and convert to FeatureCollection of points
      fetch("/data/population.json")
        .then((r) => r.json())
        .then((people) => {
          const features = [] as any[];
          for (const person of people) {
            const { id, age, activities = [] } = person;
            for (const act of activities) {
              const { coordinates, name, zone, transport, startTime, endTime } = act;
              if (!coordinates) continue;
              // Precompute minute values for quick filtering
              const start = toMinutes(startTime);
              const end = toMinutes(endTime);
              features.push({
                type: "Feature",
                geometry: { type: "Point", coordinates: [coordinates.lng, coordinates.lat] },
                properties: { id, age, activity: name, zone, transport, start, end }
              });
            }
          }
          const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features } as any;
          allFeaturesRef.current = fc;
          // Apply initial subset according to current filters so clusters reflect it
          const subset = filterByTime(filterByAgeBand(fc, ageBand), minutes);
          (map.getSource("population") as mapboxgl.GeoJSONSource).setData(subset);
          // no pie markers at this stage
          // Initial filter on unclustered layer (keeps parity with cluster subset)
          map.setFilter(unclusteredId, makeAgeFilter(ageBand));
          map.setLayoutProperty(arrFillId, "visibility", arrondissementsVisible ? "visible" : "none");
          map.setLayoutProperty("arr-outline", "visibility", arrondissementsVisible ? "visible" : "none");
          [clustersBgId, clusterCountId, unclusteredId].forEach((id) => map.setLayoutProperty(id, "visibility", populationVisible ? "visible" : "none"));
        })
        .catch((e) => console.error("Failed to load population.json", e));
    });

    // Render pies for visible clusters using HTML markers (icon-image feature-state isn't allowed for layout)
    const markers = new Map<number, mapboxgl.Marker & { _key?: string }>();
    const updatePies = () => {
      if (!map.isStyleLoaded()) return;
      const feats = map.queryRenderedFeatures({ layers: ["clusters-bg"] });
      const visible = new Set<number>();
      for (const f of feats) {
        const props: any = f.properties || {};
        const id = props.cluster_id as number | undefined;
        if (id == null) continue;
        visible.add(id);
        const key = `${props.home || 0}-${props.work || 0}-${props.education || 0}-${props.leisure || 0}`;
        let m = markers.get(id) as (mapboxgl.Marker & { _key?: string }) | undefined;
        const coords = (f.geometry as any).coordinates as [number, number];
        if (!m) {
          const el = drawPie({
            home: Number(props.home || 0),
            work: Number(props.work || 0),
            education: Number(props.education || 0),
            leisure: Number(props.leisure || 0)
          }, 48);
          el.style.width = "48px"; el.style.height = "48px";
          const created = new mapboxgl.Marker({ element: el, anchor: "center" }) as any;
          (created as any)._key = key;
          created.setLngLat(coords).addTo(map);
          markers.set(id, created);
        } else {
          const existing = m; if (!existing) continue;
          if ((existing as any)._key !== key) {
            const el = drawPie({
              home: Number(props.home || 0),
              work: Number(props.work || 0),
              education: Number(props.education || 0),
              leisure: Number(props.leisure || 0)
            }, 48);
            el.style.width = "48px"; el.style.height = "48px";
            const parent = existing.getElement().parentNode as HTMLElement | null;
            if (parent) parent.replaceChild(el, existing.getElement());
            (existing as any)._key = key;
          }
          existing.setLngLat(coords);
        }
      }
      // remove markers no longer visible
      for (const [id, m] of markers) {
        if (!visible.has(id)) { m.remove(); markers.delete(id); }
      }
    };
    // remove pie marker plumbing (we'll re-introduce later differently)
    const managePies = () => {};

    return () => { map.remove(); };
  }, [accessToken]);

  // helpers moved to utils

  function drawPie(counts: { home: number; work: number; education: number; leisure: number }, size: number): HTMLCanvasElement {
    const total = Math.max(1, counts.home + counts.work + counts.education + counts.leisure);
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const colors: [keyof typeof counts, string][] = [["home", "#3b82f6"], ["work", "#22c55e"], ["education", "#facc15"], ["leisure", "#fb923c"]];
    let start = -Math.PI / 2;
    for (const [k, color] of colors) {
      const val = counts[k];
      const angle = (val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(size / 2, size / 2);
      ctx.arc(size / 2, size / 2, size / 2, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      start += angle;
    }
    // white stroke
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    return canvas;
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return; // wait until style is loaded
    const setVis = (id: string, vis: boolean) => {
      if (!map.getLayer(id)) return;
      map.setLayoutProperty(id, "visibility", vis ? "visible" : "none");
    };
    setVis("arr-outline", arrondissementsVisible);
    setVis("arr-fill", arrondissementsVisible);
    // Show simple circles only when population is visible and pie mode is off
    // Keep the layer present when pie mode is ON (opacity 0) so we can query positions
    setVis("clusters-bg", populationVisible);
    // ensure default simple cluster visual
    // Keep count labels only when simple circles are visible
    setVis("cluster-count", populationVisible);
    // Unclustered points are always shown when populationVisible
    setVis("unclustered-point", populationVisible);
    // Update clusters by setting filtered subset as source data
    const fc = allFeaturesRef.current;
    if (fc) {
      const subset = filterByTime(filterByAgeBand(fc, ageBand), minutes);
      (map.getSource("population") as mapboxgl.GeoJSONSource).setData(subset);
    }
    map.setFilter("unclustered-point", makeAgeFilter(ageBand));
  }, [arrondissementsVisible, populationVisible, ageBand, minutes]);

  // no pie toggle side-effects now

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
}


