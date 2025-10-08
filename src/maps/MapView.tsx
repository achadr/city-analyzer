import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { FilterSpecification } from "mapbox-gl";
import { toMinutes, filterByTime } from "./utils/time";
import { makeAgeFilter, filterByAgeBand } from "./utils/age";
import { Person, ActivityChainData, PersonSelectionCallback, ActivityChainToggleCallback, AgeBand } from "../types";
import { 
  POINT_RADIUS, 
  POINT_STROKE_WIDTH, 
  SELECTED_POINT_RADIUS, 
  SELECTED_POINT_STROKE_WIDTH,
  CLUSTER_RADIUS,
  CLUSTER_MAX_ZOOM,
  ACTIVITY_COLORS,
  CLUSTER_COLORS,
  CLUSTER_THRESHOLDS,
  MAP_CONFIG
} from "../constants";

type MapViewProps = {
  accessToken: string;
  arrondissementsVisible?: boolean;
  populationVisible?: boolean;
  ageBand?: AgeBand;
  minutes?: number; // 0..1439
  onPersonSelect?: PersonSelectionCallback;
  showActivityChain?: boolean;
  activityChainData?: ActivityChainData | null;
};

export default function MapView({ accessToken, arrondissementsVisible = true, populationVisible = true, ageBand = "all", minutes = 480, onPersonSelect, showActivityChain = false, activityChainData = null }: MapViewProps): React.JSX.Element {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const allFeaturesRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const peopleByIdRef = useRef<Map<number, any> | null>(null);
  const eventHandlersRef = useRef<{
    handleMouseEnter: () => void;
    handleMouseLeave: () => void;
    handleClick: (e: any) => void;
  } | null>(null);
  const selectedPointRef = useRef<GeoJSON.Feature | null>(null);

  // Function to create activity chain features
  const createActivityChainFeatures = (activityChainData: any): GeoJSON.FeatureCollection => {
    if (!activityChainData) return { type: "FeatureCollection", features: [] };
    
    // Group activities by unique coordinates to avoid duplicate points
    const locationMap = new Map<string, any>();
    
    activityChainData.activities.forEach((activity: any) => {
      const key = `${activity.coordinates.lat},${activity.coordinates.lng}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, activity);
      }
    });
    
    const features = Array.from(locationMap.values()).map((activity: any) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [activity.coordinates.lng, activity.coordinates.lat]
      },
      properties: {
        id: activityChainData.id,
        age: activityChainData.age,
        activity: activity.name,
        zone: activity.zone,
        transport: activity.transport,
        start: toMinutes(activity.startTime),
        end: toMinutes(activity.endTime)
      }
    }));

    return { type: "FeatureCollection", features };
  };

  // Function to create connecting lines between activity points
  const createActivityChainLines = (activityChainData: any): GeoJSON.FeatureCollection => {
    if (!activityChainData || activityChainData.activities.length < 2) {
      return { type: "FeatureCollection", features: [] };
    }
    
    const coordinates = activityChainData.activities.map((activity: any) => [
      activity.coordinates.lng, 
      activity.coordinates.lat
    ]);

    const lineFeature = {
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: coordinates
      },
      properties: {
        id: activityChainData.id
      }
    };

    return { type: "FeatureCollection", features: [lineFeature] };
  };

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = accessToken;

            const map = new mapboxgl.Map({
              container: mapContainer.current,
              style: MAP_CONFIG.style,
              center: MAP_CONFIG.center,
              zoom: MAP_CONFIG.zoom
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
                clusterMaxZoom: CLUSTER_MAX_ZOOM,
                clusterRadius: CLUSTER_RADIUS,
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

      // Source for the currently selected point highlight
      map.addSource("selected-point", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      } as any);

      // Source for activity chain connecting lines
      map.addSource("activity-chain-lines", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
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
                    CLUSTER_COLORS.small,
                    CLUSTER_THRESHOLDS.medium,
                    CLUSTER_COLORS.medium,
                    CLUSTER_THRESHOLDS.large,
                    CLUSTER_COLORS.large
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
            "home", ACTIVITY_COLORS.home,
            "work", ACTIVITY_COLORS.work,
            "school", ACTIVITY_COLORS.school,
            "education", ACTIVITY_COLORS.education,
            "leisure", ACTIVITY_COLORS.leisure,
            ACTIVITY_COLORS.default
          ],
          "circle-radius": POINT_RADIUS,
          "circle-stroke-width": POINT_STROKE_WIDTH,
          "circle-stroke-color": "#fff"
        }
      });

      // Add highlight circle around selected point (rendered below unclustered for stroke halo)
      const selectedLayerId = "selected-point-circle";
      map.addLayer({
        id: selectedLayerId,
        type: "circle",
        source: "selected-point",
                paint: {
                  "circle-color": "#ffffff",
                  "circle-radius": SELECTED_POINT_RADIUS,
                  "circle-stroke-width": SELECTED_POINT_STROKE_WIDTH,
                  "circle-stroke-color": "#111827"
                }
      });

      // Add line layer for activity chain connections
      const activityChainLinesId = "activity-chain-lines";
      map.addLayer({
        id: activityChainLinesId,
        type: "line",
        source: "activity-chain-lines",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 3,
          "line-opacity": 0.8
        },
        layout: {
          "line-join": "round",
          "line-cap": "round"
        }
      });
      // Load non-GeoJSON population and convert to FeatureCollection of points
      fetch("/data/population.json")
        .then((r) => r.json())
        .then((people) => {
          const features = [] as any[];
          const mapById = new Map<number, any>();
          for (const person of people) {
            const { id, age, activities = [] } = person;
            mapById.set(id, person);
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
          peopleByIdRef.current = mapById;
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
      // interaction for unclustered points
      const handleMouseEnter = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const handleMouseLeave = () => {
        map.getCanvas().style.cursor = "";
      };
      const handleClick = (e: any) => {
        try {
          const f = (e.features && e.features[0]) as any;
          const id = f?.properties?.id as number | undefined;
          if (id == null) {
            onPersonSelect && onPersonSelect(null);
            selectedPointRef.current = null;
            return;
          }
          // Store the selected point for later restoration
          selectedPointRef.current = f;
          // Update highlight source with this point geometry
          const geom = f.geometry as GeoJSON.Point;
          const highlightFc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: geom,
                properties: {}
              } as any
            ]
          } as any;
          (map.getSource("selected-point") as mapboxgl.GeoJSONSource).setData(highlightFc);
          
          const person = peopleByIdRef.current?.get(id) || null;
          onPersonSelect && onPersonSelect(person);
        } catch (err) {
          onPersonSelect && onPersonSelect(null);
          selectedPointRef.current = null;
        }
      };

      // Store event handlers in ref for later removal
      eventHandlersRef.current = {
        handleMouseEnter,
        handleMouseLeave,
        handleClick
      };

      // Initially add interactions
      map.on("mouseenter", unclusteredId, handleMouseEnter);
      map.on("mouseleave", unclusteredId, handleMouseLeave);
      map.on("click", unclusteredId, handleClick);
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
      let subset;
      if (showActivityChain && activityChainData) {
        // Show only activity chain points
        subset = createActivityChainFeatures(activityChainData);
        // Update connecting lines
        const linesData = createActivityChainLines(activityChainData);
        (map.getSource("activity-chain-lines") as mapboxgl.GeoJSONSource).setData(linesData);
      } else {
        // Show normal filtered data
        subset = filterByTime(filterByAgeBand(fc, ageBand), minutes);
        // Clear connecting lines
        (map.getSource("activity-chain-lines") as mapboxgl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
      }
      (map.getSource("population") as mapboxgl.GeoJSONSource).setData(subset);
    }
    
    if (showActivityChain && activityChainData) {
      // Remove age filter when showing activity chain
      map.setFilter("unclustered-point", null);
      // Hide clusters when showing activity chain
      setVis("clusters-bg", false);
      setVis("cluster-count", false);
      // Show activity chain lines
      map.setLayoutProperty("activity-chain-lines", "visibility", "visible");
      // Clear selected point highlight when in activity chain mode
      (map.getSource("selected-point") as mapboxgl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
      // Remove point interactions when activity chain is active
      const unclusteredId = "unclustered-point";
      const handlers = eventHandlersRef.current;
      if (handlers) {
        map.off("mouseenter", unclusteredId, handlers.handleMouseEnter);
        map.off("mouseleave", unclusteredId, handlers.handleMouseLeave);
        map.off("click", unclusteredId, handlers.handleClick);
        map.getCanvas().style.cursor = "";
      }
    } else {
      map.setFilter("unclustered-point", makeAgeFilter(ageBand));
      // Show clusters when not in activity chain mode
      setVis("clusters-bg", populationVisible);
      setVis("cluster-count", populationVisible);
      // Hide activity chain lines
      map.setLayoutProperty("activity-chain-lines", "visibility", "none");
      // Restore selected point highlight if there was one
      if (selectedPointRef.current) {
        const highlightFc: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: selectedPointRef.current.geometry,
              properties: {}
            } as any
          ]
        } as any;
        (map.getSource("selected-point") as mapboxgl.GeoJSONSource).setData(highlightFc);
      }
      // Re-add point interactions when activity chain is off
      const unclusteredId = "unclustered-point";
      const handlers = eventHandlersRef.current;
      if (handlers) {
        map.on("mouseenter", unclusteredId, handlers.handleMouseEnter);
        map.on("mouseleave", unclusteredId, handlers.handleMouseLeave);
        map.on("click", unclusteredId, handlers.handleClick);
      }
    }
  }, [arrondissementsVisible, populationVisible, ageBand, minutes, showActivityChain, activityChainData]);

  // no pie toggle side-effects now

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
}


