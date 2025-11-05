import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./realmMapbox.scss";

// ============================================
// TYPES & INTERFACES
// ============================================

interface Observation {
  id: string;
  commonName: string;
  scientificName: string;
  species: string;
  observedDate: string;
  spottedBy: string;
  coordinates: {
    lng: number;
    lat: number;
  };
  imageUrl?: string;
}

interface RealmMapboxProps {
  polygon: any; // GeoJSON Polygon or MultiPolygon geometry
}

// ============================================
// CONFIGURATION
// ============================================

const MAP_CONFIG = {
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || "",
  DEFAULT_TILT: 45,
  DEFAULT_ZOOM: 14,
  MAP_STYLES: {
    STANDARD: "mapbox://styles/mapbox/standard",
    SATELLITE: "mapbox://styles/mapbox/satellite-streets-v12",
    OUTDOOR: "mapbox://styles/mapbox/outdoors-v12"
  },
  CLUSTER_RADIUS: 50,
  CLUSTER_MAX_ZOOM: 14,
  BOUNDARY_EXTRUSION_HEIGHT: 30,
  BOUNDARY_COLOR: "#3b82f6",
  BOUNDARY_OPACITY: 0.6,
  MARKER_COLOR: "#22c55e",
  CLUSTER_COLORS: {
    small: "#51bbd6",
    medium: "#f1f075",
    large: "#f28cb1"
  }
};

// Placeholder image for observations without images (using a data URL)
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23e5e7eb' width='100' height='100'/%3E%3Cpath fill='%239ca3af' d='M50 35c-8.3 0-15 6.7-15 15s6.7 15 15 15 15-6.7 15-15-6.7-15-15-15zm0 25c-5.5 0-10-4.5-10-10s4.5-10 10-10 10 4.5 10 10-4.5 10-10 10z'/%3E%3Cpath fill='%239ca3af' d='M70 30l-5-5h-30l-5 5H20v45h60V30H70zm5 40H25V35h10l5-5h20l5 5h10v35z'/%3E%3C/svg%3E";

// ============================================
// COMPONENT
// ============================================

export default function RealmMapbox({ polygon }: RealmMapboxProps): React.JSX.Element {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Map style is fixed - viewers cannot change it
  // To change the default style, modify the value below:
  // - MAP_CONFIG.MAP_STYLES.STANDARD (default)
  // - MAP_CONFIG.MAP_STYLES.SATELLITE (for satellite view)
  // - MAP_CONFIG.MAP_STYLES.OUTDOOR (for outdoor view)
  const mapStyle = MAP_CONFIG.MAP_STYLES.STANDARD;

  // ============================================
  // FETCH OBSERVATIONS DATA
  // ============================================

  useEffect(() => {
    const fetchObservations = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Replace this with your actual API endpoint
        // Example: const response = await fetch('https://api.example.com/observations');

        // For now, using mock data - replace with your actual API call
        const response = await fetch('/api/observations');

        if (!response.ok) {
          throw new Error(`Failed to fetch observations: ${response.statusText}`);
        }

        const data = await response.json();

        // Transform API response to match Observation interface
        // Adjust this mapping based on your actual API response structure
        const transformedData: Observation[] = data.map((item: any) => ({
          id: item.id || String(Math.random()),
          commonName: item.commonName || item.common_name || "Unknown",
          scientificName: item.scientificName || item.scientific_name || "Unknown",
          species: item.species || "Unknown",
          observedDate: item.observedDate || item.observed_date || new Date().toISOString(),
          spottedBy: item.spottedBy || item.spotted_by || item.observer || "Unknown",
          coordinates: {
            lng: item.coordinates?.lng || item.longitude || 0,
            lat: item.coordinates?.lat || item.latitude || 0
          },
          imageUrl: item.imageUrl || item.image_url || item.photo
        }));

        setObservations(transformedData);
      } catch (err) {
        console.error('Error fetching observations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load observations');

        // Fallback to empty array on error
        setObservations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchObservations();
  }, []);

  // ============================================
  // INITIALIZE MAP
  // ============================================

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Check if Mapbox token is available
    if (!MAP_CONFIG.MAPBOX_TOKEN) {
      console.error('Mapbox token is missing. Please set VITE_MAPBOX_TOKEN in your .env file');
      setError('Mapbox token is missing');
      return;
    }

    mapboxgl.accessToken = MAP_CONFIG.MAPBOX_TOKEN;

    // Calculate center from polygon if available
    let center: [number, number] = [2.3522, 48.8566]; // Default to Paris
    let bounds: mapboxgl.LngLatBounds | null = null;

    if (polygon) {
      try {
        const coordinates = polygon.type === 'Polygon'
          ? polygon.coordinates[0]
          : polygon.coordinates[0][0];

        if (coordinates && coordinates.length > 0) {
          bounds = coordinates.reduce(
            (bounds: mapboxgl.LngLatBounds, coord: number[]) => {
              return bounds.extend(coord as [number, number]);
            },
            new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
          );

          const boundsCenter = bounds.getCenter();
          center = [boundsCenter.lng, boundsCenter.lat];
        }
      } catch (err) {
        console.error('Error calculating bounds from polygon:', err);
      }
    }

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: center,
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
      pitch: MAP_CONFIG.DEFAULT_TILT
    });

    mapRef.current = map;

    map.on("load", () => {
      // Add navigation controls (zoom in/out)
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add 3D boundary wall if polygon is provided
      if (polygon) {
        try {
          map.addSource("boundary", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: polygon,
              properties: {}
            }
          });

          // Add 3D extrusion layer for boundary
          map.addLayer({
            id: "boundary-3d",
            type: "fill-extrusion",
            source: "boundary",
            paint: {
              "fill-extrusion-color": MAP_CONFIG.BOUNDARY_COLOR,
              "fill-extrusion-height": MAP_CONFIG.BOUNDARY_EXTRUSION_HEIGHT,
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": MAP_CONFIG.BOUNDARY_OPACITY
            }
          });

          // Add outline for boundary
          map.addLayer({
            id: "boundary-outline",
            type: "line",
            source: "boundary",
            paint: {
              "line-color": MAP_CONFIG.BOUNDARY_COLOR,
              "line-width": 2
            }
          });

          // Fit map to boundary bounds if available
          if (bounds) {
            map.fitBounds(bounds, {
              padding: 50,
              duration: 1000
            });
          }
        } catch (err) {
          console.error('Error adding boundary to map:', err);
        }
      }

      // Setup observations clustering source
      setupObservationsLayer(map);
    });

    // Cleanup on unmount
    return () => {
      map.remove();
    };
  }, [polygon]);

  // ============================================
  // SETUP OBSERVATIONS LAYER WITH CLUSTERING
  // ============================================

  const setupObservationsLayer = (map: mapboxgl.Map) => {
    // Create GeoJSON from observations
    const geojsonData: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: observations.map(obs => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [obs.coordinates.lng, obs.coordinates.lat]
        },
        properties: {
          id: obs.id,
          commonName: obs.commonName,
          scientificName: obs.scientificName,
          species: obs.species,
          observedDate: obs.observedDate,
          spottedBy: obs.spottedBy,
          imageUrl: obs.imageUrl || PLACEHOLDER_IMAGE
        }
      }))
    };

    // Add source for observations with clustering
    if (!map.getSource("observations")) {
      map.addSource("observations", {
        type: "geojson",
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: MAP_CONFIG.CLUSTER_MAX_ZOOM,
        clusterRadius: MAP_CONFIG.CLUSTER_RADIUS
      });
    }

    // Add cluster circles layer
    if (!map.getLayer("clusters")) {
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "observations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            MAP_CONFIG.CLUSTER_COLORS.small,
            10,
            MAP_CONFIG.CLUSTER_COLORS.medium,
            30,
            MAP_CONFIG.CLUSTER_COLORS.large
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            20,
            10,
            30,
            30,
            40
          ]
        }
      });
    }

    // Add cluster count labels
    if (!map.getLayer("cluster-count")) {
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "observations",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12
        },
        paint: {
          "text-color": "#ffffff"
        }
      });
    }

    // Add unclustered point layer
    if (!map.getLayer("unclustered-point")) {
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "observations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": MAP_CONFIG.MARKER_COLOR,
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff"
        }
      });
    }

    // Handle cluster clicks (zoom in)
    map.on("click", "clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["clusters"]
      });

      if (features.length === 0) return;

      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource("observations") as mapboxgl.GeoJSONSource;

      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;

        const geometry = features[0].geometry as GeoJSON.Point;
        map.easeTo({
          center: geometry.coordinates as [number, number],
          zoom: zoom
        });
      });
    });

    // Handle unclustered point clicks (show popup)
    map.on("click", "unclustered-point", (e) => {
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      const props = feature.properties;

      if (!props) return;

      // Format observed date
      const formattedDate = props.observedDate
        ? new Date(props.observedDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : 'Unknown';

      // Create popup HTML
      const popupHTML = `
        <div class="realmMapbox__popup">
          <div class="realmMapbox__popupImage">
            <img src="${props.imageUrl}" alt="${props.commonName}" />
          </div>
          <div class="realmMapbox__popupContent">
            <h3 class="realmMapbox__popupTitle">${props.commonName}</h3>
            <p class="realmMapbox__popupScientific">${props.scientificName}</p>
            <div class="realmMapbox__popupDetails">
              <p><strong>Species:</strong> ${props.species}</p>
              <p><strong>Observed:</strong> ${formattedDate}</p>
              <p><strong>Spotted by:</strong> ${props.spottedBy}</p>
            </div>
          </div>
        </div>
      `;

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(popupHTML)
        .addTo(map);
    });

    // Change cursor on hover
    map.on("mouseenter", "clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "clusters", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("mouseenter", "unclustered-point", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "unclustered-point", () => {
      map.getCanvas().style.cursor = "";
    });
  };

  // ============================================
  // UPDATE OBSERVATIONS WHEN DATA CHANGES
  // ============================================

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    setupObservationsLayer(map);
  }, [observations]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div id="realmMapbox">
      {loading && (
        <div className="realmMapbox__loading">
          <div className="realmMapbox__spinner"></div>
          <p>Loading observations...</p>
        </div>
      )}

      {error && (
        <div className="realmMapbox__error">
          <p>⚠️ {error}</p>
        </div>
      )}

      <div ref={mapContainer} className="realmMapbox__container" />
    </div>
  );
}
