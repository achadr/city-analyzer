// Time constants
export const DEFAULT_TIME = 8 * 60; // 08:00 in minutes

// Map styling constants
export const POINT_RADIUS = 6;
export const POINT_STROKE_WIDTH = 1.5;
export const SELECTED_POINT_RADIUS = 10;
export const SELECTED_POINT_STROKE_WIDTH = 3;
export const CLUSTER_RADIUS = 40;
export const CLUSTER_MAX_ZOOM = 13;

// Activity colors
export const ACTIVITY_COLORS = {
  home: "#3b82f6",
  work: "#22c55e", 
  school: "#facc15",
  education: "#facc15",
  leisure: "#fb923c",
  default: "#e15759"
} as const;

// Cluster colors
export const CLUSTER_COLORS = {
  small: "#A0E3FF",
  medium: "#5CC8FF", 
  large: "#2491EB"
} as const;

// Cluster thresholds
export const CLUSTER_THRESHOLDS = {
  medium: 100,
  large: 500
} as const;

// Transport methods
export const TRANSPORT_METHODS = [
  "personal car", 
  "public transport", 
  "taxi", 
  "uber", 
  "bike", 
  "walk"
] as const;

// Map configuration
export const MAP_CONFIG = {
  center: [2.3522, 48.8566] as [number, number],
  zoom: 10.5,
  style: "mapbox://styles/mapbox/light-v11"
} as const;

// UI constants
export const PANEL_WIDTH = 360;
export const ICON_SIZE = 20;
export const TIMELINE_ICON_SIZE = 28;

// Chart styling constants
export const CHART_CONFIG = {
  tickFontSize: 10,
  defaultHeight: 200,
  pieChartHeight: 180,
  pieChartRadius: 60,
  neutralColor: "#8b5cf6",
  keyHours: [8, 12, 15, 18, 21]
} as const;
