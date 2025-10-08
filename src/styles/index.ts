// Color palette
export const COLORS = {
  primary: "#3b82f6",
  secondary: "#22c55e", 
  warning: "#facc15",
  danger: "#ef4444",
  success: "#10b981",
  info: "#0ea5e9",
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6", 
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827"
  },
  white: "#ffffff",
  black: "#000000"
} as const;

// Spacing scale
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 48
} as const;

// Border radius
export const RADIUS = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999
} as const;

// Font sizes
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24
} as const;

// Common style utilities
export const createStyle = (base: React.CSSProperties, overrides?: React.CSSProperties): React.CSSProperties => ({
  ...base,
  ...overrides
});

// Common component styles
export const PANEL_STYLES = {
  container: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    height: "100%",
    width: 360,
    background: COLORS.white,
    boxShadow: "-4px 0 16px rgba(0,0,0,0.15)",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column" as const,
    fontFamily: "system-ui, sans-serif"
  },
  header: {
    padding: SPACING.md,
    borderBottom: `1px solid ${COLORS.gray[200]}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  content: {
    padding: SPACING.md,
    overflow: "auto" as const
  }
} as const;

export const BUTTON_STYLES = {
  primary: {
    border: "none",
    background: COLORS.primary,
    color: COLORS.white,
    padding: `${SPACING.sm}px ${SPACING.md}px`,
    borderRadius: RADIUS.md,
    cursor: "pointer",
    fontSize: FONT_SIZES.sm
  },
  secondary: {
    border: `1px solid ${COLORS.gray[300]}`,
    background: COLORS.white,
    color: COLORS.gray[700],
    padding: `${SPACING.sm}px ${SPACING.md}px`,
    borderRadius: RADIUS.md,
    cursor: "pointer",
    fontSize: FONT_SIZES.sm
  },
  close: {
    border: "none",
    background: COLORS.gray[100],
    padding: `${SPACING.sm}px ${SPACING.md}px`,
    borderRadius: RADIUS.md,
    cursor: "pointer"
  }
} as const;
