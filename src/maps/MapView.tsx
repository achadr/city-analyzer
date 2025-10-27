import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import type { FilterSpecification } from "mapbox-gl";
import { toMinutes, filterByTime } from "./utils/time";
import { makeAgeFilter, filterByAgeBand, makeSexFilter, filterBySex, makeActivityFilter, filterByActivity } from "./utils/age";
import { Person, ActivityChainData, PersonSelectionCallback, ActivityChainToggleCallback, AgeBand, SexFilter, ActivityFilter } from "../types";
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

export type DrawnZone = {
  id: string;
  type: string;
  geometry: GeoJSON.Geometry;
  properties: any;
};

export type ZoneSelectionCallback = (zone: DrawnZone | null) => void;

type MapViewProps = {
  accessToken: string;
  arrondissementsVisible?: boolean;
  populationVisible?: boolean;
  ageBand?: AgeBand;
  sex?: SexFilter;
  activity?: ActivityFilter;
  minutes?: number; // 0..1439
  onPersonSelect?: PersonSelectionCallback;
  showActivityChain?: boolean;
  activityChainData?: ActivityChainData | null;
  onZoneSelect?: ZoneSelectionCallback;
  activePanelTab?: "person" | "zone" | null;
  selectedPerson?: Person | null;
  selectedZone?: DrawnZone | null;
};

export default function MapView({ accessToken, arrondissementsVisible = true, populationVisible = true, ageBand = "all", sex = "all", activity = "all", minutes = 480, onPersonSelect, showActivityChain = false, activityChainData = null, onZoneSelect, activePanelTab = null, selectedPerson = null, selectedZone = null }: MapViewProps): React.JSX.Element {
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
  const hoveredArrondissementIdRef = useRef<string | number | null>(null);
  const hoveredArrondissementPropsRef = useRef<any>(null);
  const hoveredArrondissementLngLatRef = useRef<mapboxgl.LngLat | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const currentFiltersRef = useRef({ minutes, ageBand, sex, activity });
  const drawRef = useRef<MapboxDraw | null>(null);
  const previousViewportRef = useRef<{ center: mapboxgl.LngLat; zoom: number } | null>(null);
  const clickedActivityLocationRef = useRef<{ lng: number; lat: number } | null>(null);
  const currentZoneIdRef = useRef<string | null>(null);
  const isDrawingModeRef = useRef<boolean>(false);
  const keyboardHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

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

  // Function to generate popup HTML for an arrondissement
  const generatePopupHTML = (props: any, currentMinutes: number, currentAgeBand: AgeBand, currentSex: SexFilter, currentActivity: ActivityFilter) => {
    const fc = allFeaturesRef.current;
    let popStats = { total: 0, home: 0, work: 0, education: 0, leisure: 0 };

    if (fc) {
      const arrName = props.l_ar;
      const subset = filterByTime(filterByActivity(filterBySex(filterByAgeBand(fc, currentAgeBand), currentSex), currentActivity), currentMinutes);
      subset.features.forEach((f: any) => {
        if (f.properties.zone === arrName) {
          popStats.total++;
          const activity = f.properties.activity;
          if (activity === "home") popStats.home++;
          else if (activity === "work") popStats.work++;
          else if (activity === "school" || activity === "education") popStats.education++;
          else if (activity === "leisure") popStats.leisure++;
        }
      });
    }

    const homeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 50 50" fill="none" stroke="#3b82f6" stroke-width="2" style="vertical-align: middle;"><path d="M 24.962891 1.0546875 A 1.0001 1.0001 0 0 0 24.384766 1.2636719 L 1.3847656 19.210938 A 1.0005659 1.0005659 0 0 0 2.6152344 20.789062 L 4 19.708984 L 4 46 A 1.0001 1.0001 0 0 0 5 47 L 18.832031 47 A 1.0001 1.0001 0 0 0 19.158203 47 L 30.832031 47 A 1.0001 1.0001 0 0 0 31.158203 47 L 45 47 A 1.0001 1.0001 0 0 0 46 46 L 46 19.708984 L 47.384766 20.789062 A 1.0005657 1.0005657 0 1 0 48.615234 19.210938 L 41 13.269531 L 41 6 L 35 6 L 35 8.5859375 L 25.615234 1.2636719 A 1.0001 1.0001 0 0 0 24.962891 1.0546875 z M 25 3.3222656 L 44 18.148438 L 44 45 L 32 45 L 32 26 L 18 26 L 18 45 L 6 45 L 6 18.148438 L 25 3.3222656 z M 37 8 L 39 8 L 39 11.708984 L 37 10.146484 L 37 8 z M 20 28 L 30 28 L 30 45 L 20 45 L 20 28 z"></path></svg>';
    const workIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 426.667 362.667" style="vertical-align: middle;"><g fill="#22c55e" transform="translate(0, -42.667)"><path d="M277.333333,1.42108547e-14 L298.666667,21.3333333 L298.666,64 L426.666667,64 L426.666667,362.666667 L3.55271368e-14,362.666667 L3.55271368e-14,64 L128,64 L128,21.3333333 L149.333333,1.42108547e-14 L277.333333,1.42108547e-14 Z M42.6664912,220.935181 L42.6666667,320 L384,320 L384.000468,220.935097 C341.375319,233.130501 298.701692,240.759085 256.000479,243.809455 L256,277.333333 L170.666667,277.333333 L170.666323,243.809465 C127.965163,240.759108 85.2915887,233.130549 42.6664912,220.935181 Z M384,106.666667 L42.6666667,106.666667 L42.6668606,176.433085 C99.6386775,193.933257 156.507113,202.666667 213.333333,202.666667 C270.159803,202.666667 327.028489,193.933181 384.000558,176.432854 L384,106.666667 Z M256,42.6666667 L170.666667,42.6666667 L170.666667,64 L256,64 L256,42.6666667 Z"></path></g></svg>';
    const schoolIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align: middle;"><path d="M21 10L12 5L3 10L6 11.6667M21 10L18 11.6667M21 10V10C21.6129 10.3064 22 10.9328 22 11.618V16.9998M6 11.6667L12 15L18 11.6667M6 11.6667V17.6667L12 21L18 17.6667L18 11.6667" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const leisureIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#fb923c" style="vertical-align: middle;"><path d="M20,1H4a1,1,0,0,0-.832,1.555L11,14.3V21H8a1,1,0,0,0,0,2h8a1,1,0,0,0,0-2H13V14.3L20.832,2.555A1,1,0,0,0,20,1ZM12,12.2,5.869,3H18.131Z"/></svg>';

    return `
      <div style="font-family: system-ui, sans-serif; padding: 12px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${props.l_ar || 'Arrondissement'}</h3>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">${props.l_aroff || ''}</p>
        <div style="margin-top: 12px; font-size: 14px;">
          <div style="font-weight: 500; margin-bottom: 8px;">Current Activity (${currentMinutes ? Math.floor(currentMinutes / 60).toString().padStart(2, '0') + ':' + (currentMinutes % 60).toString().padStart(2, '0') : ''}):</div>
          <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
            <span style="display: flex; align-items: center; gap: 6px; font-size: 15px;">${homeIcon} <span style="color: #3b82f6; font-weight: 500;">${popStats.home}</span></span>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 15px;">${workIcon} <span style="color: #22c55e; font-weight: 500;">${popStats.work}</span></span>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 15px;">${schoolIcon} <span style="color: #facc15; font-weight: 500;">${popStats.education}</span></span>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 15px;">${leisureIcon} <span style="color: #fb923c; font-weight: 500;">${popStats.leisure}</span></span>
          </div>
          <div style="margin-top: 10px; font-weight: 600; font-size: 14px; padding-top: 8px; border-top: 1px solid #e5e7eb;">Total: ${popStats.total} activities</div>
        </div>
      </div>
    `;
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
        data: "/data/paris-arrondissements.geojson",
        promoteId: "c_ar"
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
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#3b82f6",
            "#4c78a8"
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.35,
            0.15
          ]
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
            const { id, age, sex, activities = [] } = person;
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
                properties: { id, age, sex, activity: name, activityName: name, zone, transport, start, end }
              });
            }
          }
          const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features } as any;
          allFeaturesRef.current = fc;
          peopleByIdRef.current = mapById;
          // Apply initial subset according to current filters so clusters reflect it
          const subset = filterByTime(filterByActivity(filterBySex(filterByAgeBand(fc, ageBand), sex), activity), minutes);
          (map.getSource("population") as mapboxgl.GeoJSONSource).setData(subset);
          // no pie markers at this stage
          // Initial filter on unclustered layer (keeps parity with cluster subset)
          const combinedFilters = ["all", makeAgeFilter(ageBand), makeSexFilter(sex), makeActivityFilter(activity)] as unknown as FilterSpecification;
          map.setFilter(unclusteredId, combinedFilters);
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
          // Ignore clicks on points when in drawing mode
          if (isDrawingModeRef.current) {
            return;
          }

          const f = (e.features && e.features[0]) as any;
          const id = f?.properties?.id as number | undefined;
          if (id == null) {
            onPersonSelect && onPersonSelect(null);
            selectedPointRef.current = null;
            clickedActivityLocationRef.current = null;
            return;
          }
          // Store the selected point for later restoration
          selectedPointRef.current = f;

          // Store the clicked activity location coordinates
          const geom = f.geometry as GeoJSON.Point;
          clickedActivityLocationRef.current = {
            lng: geom.coordinates[0],
            lat: geom.coordinates[1]
          };

          // Update highlight source with this point geometry
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

          // Re-select the zone in draw control to keep it visually highlighted
          if (currentZoneIdRef.current && drawRef.current) {
            setTimeout(() => {
              try {
                drawRef.current?.changeMode('simple_select', {
                  featureIds: [currentZoneIdRef.current as string]
                });
              } catch (err) {
                // Silently fail if zone no longer exists
              }
            }, 0);
          }
        } catch (err) {
          onPersonSelect && onPersonSelect(null);
          selectedPointRef.current = null;
          clickedActivityLocationRef.current = null;
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

      // Add arrondissement hover interactions
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10
      });
      popupRef.current = popup;

      map.on("mousemove", arrFillId, (e) => {
        if (e.features && e.features.length > 0) {
          map.getCanvas().style.cursor = "pointer";
          const feature = e.features[0];
          const props: any = feature.properties || {};

          // Update hover state
          if (hoveredArrondissementIdRef.current !== null) {
            map.setFeatureState(
              { source: "arrondissements", id: hoveredArrondissementIdRef.current },
              { hover: false }
            );
          }
          const featureId = feature.id ?? null;
          if (featureId !== null) {
            hoveredArrondissementIdRef.current = featureId;
            map.setFeatureState(
              { source: "arrondissements", id: featureId },
              { hover: true }
            );
          }

          // Store props and location for later updates
          hoveredArrondissementPropsRef.current = props;
          hoveredArrondissementLngLatRef.current = e.lngLat;

          // Generate and display popup using current filter values
          const html = generatePopupHTML(props, currentFiltersRef.current.minutes, currentFiltersRef.current.ageBand, currentFiltersRef.current.sex, currentFiltersRef.current.activity);
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
        }
      });

      map.on("mouseleave", arrFillId, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();

        // Clear hover state
        if (hoveredArrondissementIdRef.current !== null) {
          map.setFeatureState(
            { source: "arrondissements", id: hoveredArrondissementIdRef.current },
            { hover: false }
          );
          hoveredArrondissementIdRef.current = null;
          hoveredArrondissementPropsRef.current = null;
          hoveredArrondissementLngLatRef.current = null;
        }
      });

      // Click handler to zoom into arrondissement
      map.on("click", arrFillId, (e) => {
        if (e.features && e.features.length > 0) {
          // Prevent event propagation to avoid multiple triggers
          e.preventDefault();

          const feature = e.features[0];

          // Get the geometry of the clicked arrondissement
          if (feature.geometry && feature.geometry.type === "Polygon") {
            const coordinates = (feature.geometry as any).coordinates[0];

            // Calculate bounds from coordinates
            const bounds = coordinates.reduce(
              (bounds: mapboxgl.LngLatBounds, coord: number[]) => {
                return bounds.extend(coord as [number, number]);
              },
              new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
            );

            // Zoom to the bounds with padding and fixed zoom level to see all individual points
            map.fitBounds(bounds, {
              padding: { top: 80, bottom: 80, left: 80, right: 80 },
              zoom: 14.5, // Fixed zoom level to ensure individual points are visible with more detail
              duration: 1000 // Smooth animation duration in ms
            });
          } else if (feature.geometry && feature.geometry.type === "MultiPolygon") {
            // Handle MultiPolygon if any arrondissement uses it
            const allCoordinates = (feature.geometry as any).coordinates.flat(2);

            const bounds = allCoordinates.reduce(
              (bounds: mapboxgl.LngLatBounds, coord: number[]) => {
                return bounds.extend(coord as [number, number]);
              },
              new mapboxgl.LngLatBounds(allCoordinates[0], allCoordinates[0])
            );

            map.fitBounds(bounds, {
              padding: { top: 80, bottom: 80, left: 80, right: 80 },
              zoom: 14.5,
              duration: 1000
            });
          }
        }
      });

      // Helper function to transform draw feature to DrawnZone
      const featureToDrawnZone = (feature: any): DrawnZone => ({
        id: feature.id,
        type: feature.geometry.type,
        geometry: feature.geometry,
        properties: feature.properties || {}
      });

      // Helper function to update trash button state
      const updateTrashButtonState = (hasSelection: boolean) => {
        const trashButton = document.querySelector('.mapbox-gl-draw_trash');
        if (trashButton) {
          if (hasSelection) {
            trashButton.removeAttribute('disabled');
            (trashButton as HTMLElement).style.opacity = '1';
            (trashButton as HTMLElement).style.cursor = 'pointer';
          } else {
            trashButton.setAttribute('disabled', 'true');
            (trashButton as HTMLElement).style.opacity = '0.3';
            (trashButton as HTMLElement).style.cursor = 'not-allowed';
          }
        }
      };

      // Helper function to create custom draw controls container
      const createDrawControlsContainer = (): HTMLDivElement => {
        const container = document.createElement('div');
        container.className = 'mapboxgl-ctrl-top-center';
        container.style.position = 'absolute';
        container.style.top = '10px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '1';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';
        container.style.background = 'white';
        container.style.padding = '6px 12px';
        container.style.borderRadius = '4px';
        container.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.1)';

        const label = document.createElement('span');
        label.textContent = 'Draw a zone:';
        label.style.fontSize = '14px';
        label.style.fontWeight = '500';
        label.style.color = '#374151';
        label.style.fontFamily = 'system-ui, sans-serif';
        container.appendChild(label);

        // Create help tooltip
        const tooltipWrapper = document.createElement('div');
        tooltipWrapper.style.position = 'relative';
        tooltipWrapper.style.display = 'inline-block';

        const helpButton = document.createElement('button');
        helpButton.textContent = '?';
        helpButton.setAttribute('type', 'button');
        helpButton.setAttribute('aria-label', 'How to draw a zone');
        helpButton.style.width = '18px';
        helpButton.style.height = '18px';
        helpButton.style.borderRadius = '50%';
        helpButton.style.border = '1.5px solid #666';
        helpButton.style.background = 'white';
        helpButton.style.color = '#666';
        helpButton.style.fontSize = '12px';
        helpButton.style.fontWeight = 'bold';
        helpButton.style.cursor = 'help';
        helpButton.style.display = 'flex';
        helpButton.style.alignItems = 'center';
        helpButton.style.justifyContent = 'center';
        helpButton.style.padding = '0';

        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.left = '28px';
        tooltip.style.top = '-8px';
        tooltip.style.background = 'white';
        tooltip.style.border = '1px solid #ddd';
        tooltip.style.borderRadius = '8px';
        tooltip.style.padding = '12px 16px';
        tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        tooltip.style.zIndex = '10000';
        tooltip.style.width = '280px';
        tooltip.style.fontSize = '13px';
        tooltip.style.lineHeight = '1.6';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.display = 'none';
        tooltip.style.fontFamily = 'system-ui, sans-serif';

        tooltip.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">
            How to draw a zone:
          </div>
          <ol style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">
              Click the <strong>polygon tool</strong> (or press <kbd style="padding: 2px 6px; background: #f5f5f5; border: 1px solid #ccc; border-radius: 3px; font-size: 11px; font-family: monospace;">P</kbd>)
            </li>
            <li style="margin-bottom: 6px;">
              Click points on the map to create corners
            </li>
            <li style="margin-bottom: 6px;">
              Click the <strong>first point again</strong> or <strong>double-click</strong> to close
            </li>
          </ol>
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            💡 Points won't be clickable while drawing
          </div>
        `;

        helpButton.addEventListener('mouseenter', () => {
          tooltip.style.display = 'block';
        });

        helpButton.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });

        tooltipWrapper.appendChild(helpButton);
        tooltipWrapper.appendChild(tooltip);
        container.appendChild(tooltipWrapper);

        return container;
      };

      // Initialize Mapbox Draw for zone drawing
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true
        },
        defaultMode: "simple_select",
        boxSelect: false,
        touchEnabled: true,
        clickBuffer: 2,
        touchBuffer: 25,
        userProperties: true
      });

      // Create and add custom controls container
      const drawControlsContainer = createDrawControlsContainer();
      mapContainer.current?.appendChild(drawControlsContainer);

      map.addControl(draw, 'top-left');
      // Move the draw control to our custom container
      const drawControlElement = document.querySelector('.mapboxgl-ctrl-top-left .mapboxgl-ctrl-group');
      if (drawControlElement) {
        drawControlsContainer.appendChild(drawControlElement);
      }

      drawRef.current = draw;

      // Add keyboard shortcut for polygon tool (P key)
      const handleKeyPress = (e: KeyboardEvent) => {
        // Ignore if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }

        // Press P to activate polygon drawing
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          draw.changeMode('draw_polygon');
        }
      };

      keyboardHandlerRef.current = handleKeyPress;
      document.addEventListener('keydown', handleKeyPress);

      // Initialize trash button as disabled
      setTimeout(() => {
        updateTrashButtonState(false);
      }, 100);

      // Track drawing mode changes
      map.on("draw.modechange", (e: any) => {
        const mode = e.mode;
        // Set flag when entering drawing mode
        isDrawingModeRef.current = mode === "draw_polygon";
      });

      // Handle zone creation
      map.on("draw.create", (e: any) => {
        // Exit drawing mode after zone is created
        isDrawingModeRef.current = false;
        const features = e.features;
        if (features && features.length > 0) {
          const zone = features[0];
          currentZoneIdRef.current = zone.id;
          onZoneSelect?.(featureToDrawnZone(zone));
          updateTrashButtonState(true);
        }
      });

      // Handle zone selection change
      map.on("draw.selectionchange", (e: any) => {
        const features = e.features;
        if (features && features.length > 0) {
          const zone = features[0];
          currentZoneIdRef.current = zone.id;
          onZoneSelect?.(featureToDrawnZone(zone));
          updateTrashButtonState(true);
        } else {
          // Don't clear zone selection when draw tool is deselected
          // Zone should persist in app state even if not highlighted in draw control
          // Only clear on explicit delete (handled by draw.delete event)
          updateTrashButtonState(false);
        }
      });

      // Handle zone deletion
      map.on("draw.delete", () => {
        currentZoneIdRef.current = null;
        onZoneSelect?.(null);
        updateTrashButtonState(false);
      });

      // Handle zone update (dragged/edited)
      map.on("draw.update", (e: any) => {
        const features = e.features;
        if (features && features.length > 0) {
          onZoneSelect?.(featureToDrawnZone(features[0]));
        }
      });

      // Auto-hide arrondissements at high zoom levels to reduce visual clutter
      const ARRONDISSEMENT_HIDE_ZOOM = 13; // Hide zones when zoomed in to see individual points

      const updateArrondissementVisibility = () => {
        const currentZoom = map.getZoom();
        const shouldHideByZoom = currentZoom >= ARRONDISSEMENT_HIDE_ZOOM;

        // Only hide/show if layers exist
        if (map.getLayer("arr-fill") && map.getLayer("arr-outline")) {
          // Hide if zoom is high OR user toggled off, otherwise show
          const visibility = shouldHideByZoom ? "none" : "visible";
          map.setLayoutProperty("arr-fill", "visibility", visibility);
          map.setLayoutProperty("arr-outline", "visibility", visibility);
        }
      };

      map.on("zoom", updateArrondissementVisibility);

      // Initial call to set correct visibility on load
      updateArrondissementVisibility();
    });

    return () => {
      // Cleanup keyboard event listener
      if (keyboardHandlerRef.current) {
        document.removeEventListener('keydown', keyboardHandlerRef.current);
      }

      map.remove();
    };
  }, [accessToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return; // wait until style is loaded
    const setVis = (id: string, vis: boolean) => {
      if (!map.getLayer(id)) return;
      map.setLayoutProperty(id, "visibility", vis ? "visible" : "none");
    };

    // Auto-hide arrondissements at high zoom levels (same threshold as in map load)
    const ARRONDISSEMENT_HIDE_ZOOM = 13;
    const currentZoom = map.getZoom();
    const shouldHideByZoom = currentZoom >= ARRONDISSEMENT_HIDE_ZOOM;

    // Hide if zoomed in, otherwise respect user's toggle
    const showArrondissements = !shouldHideByZoom && arrondissementsVisible;
    setVis("arr-outline", showArrondissements);
    setVis("arr-fill", showArrondissements);
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
        subset = filterByTime(filterByActivity(filterBySex(filterByAgeBand(fc, ageBand), sex), activity), minutes);
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
      const combinedFilters = ["all", makeAgeFilter(ageBand), makeSexFilter(sex), makeActivityFilter(activity)] as unknown as FilterSpecification;
      map.setFilter("unclustered-point", combinedFilters);
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
  }, [arrondissementsVisible, populationVisible, ageBand, sex, activity, minutes, showActivityChain, activityChainData]);

  // Update popup when filters change
  useEffect(() => {
    // Update the ref with current filter values
    currentFiltersRef.current = { minutes, ageBand, sex, activity };

    // Update popup if it's currently open
    const popup = popupRef.current;
    if (popup && popup.isOpen() && hoveredArrondissementPropsRef.current && hoveredArrondissementLngLatRef.current) {
      const html = generatePopupHTML(hoveredArrondissementPropsRef.current, minutes, ageBand, sex, activity);
      popup.setHTML(html);
    }
  }, [minutes, ageBand, sex, activity]);

  // Auto-zoom to fit all activity chain points when activity chain is shown/hidden
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (showActivityChain && activityChainData) {
      // Save current viewport before zooming to activity chain
      previousViewportRef.current = {
        center: map.getCenter(),
        zoom: map.getZoom()
      };

      // Extract all coordinates from activities
      const coordinates = activityChainData.activities.map((activity: any) => [
        activity.coordinates.lng,
        activity.coordinates.lat
      ]) as [number, number][];

      // Need at least one coordinate
      if (coordinates.length === 0) return;

      // Calculate bounds from all activity coordinates
      const bounds = coordinates.reduce(
        (bounds, coord) => bounds.extend(coord),
        new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
      );

      // Zoom to fit all activity points with padding
      map.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 100, right: 100 },
        maxZoom: 15, // Don't zoom in too much if activities are close together
        duration: 1000
      });
    } else if (!showActivityChain && previousViewportRef.current) {
      // Restore previous viewport when hiding activity chain
      map.flyTo({
        center: previousViewportRef.current.center,
        zoom: previousViewportRef.current.zoom,
        duration: 1000
      });

      // Clear the saved viewport
      previousViewportRef.current = null;
    }
  }, [showActivityChain, activityChainData]);

  // Center map when switching between Person and Zone tabs
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activePanelTab) return;

    if (activePanelTab === "person" && selectedPerson) {
      if (showActivityChain && activityChainData) {
        // Activity chain is active: fit bounds to show all activities
        const coordinates = selectedPerson.activities.map((activity: any) => [
          activity.coordinates.lng,
          activity.coordinates.lat
        ]) as [number, number][];

        if (coordinates.length === 0) return;

        const bounds = coordinates.reduce(
          (bounds, coord) => bounds.extend(coord),
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );

        map.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          maxZoom: 15,
          duration: 1000
        });
      } else {
        // Activity chain is NOT active: center on the clicked activity location
        const clickedLocation = clickedActivityLocationRef.current;
        if (!clickedLocation) {
          // Fallback to first activity if no clicked location stored
          const firstActivity = selectedPerson.activities[0];
          if (!firstActivity) return;
          map.flyTo({
            center: [firstActivity.coordinates.lng, firstActivity.coordinates.lat],
            zoom: 14.5,
            duration: 1000
          });
          return;
        }

        map.flyTo({
          center: [clickedLocation.lng, clickedLocation.lat],
          zoom: 14.5,
          duration: 1000
        });
      }
    } else if (activePanelTab === "zone" && selectedZone) {
      // Center on zone
      const geometry = selectedZone.geometry;

      if (geometry.type === "Polygon") {
        const coordinates = (geometry as any).coordinates[0];

        const bounds = coordinates.reduce(
          (bounds: mapboxgl.LngLatBounds, coord: number[]) => {
            return bounds.extend(coord as [number, number]);
          },
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );

        map.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          maxZoom: 15,
          duration: 1000
        });
      }
    }
  }, [activePanelTab, selectedPerson, selectedZone, showActivityChain, activityChainData]);

  // no pie toggle side-effects now

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
}


