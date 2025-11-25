// Responsive breakpoint constants
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

// Helper to check if current width matches a breakpoint
export const isMobile = (width: number): boolean => width < BREAKPOINTS.mobile;
export const isTablet = (width: number): boolean =>
  width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
export const isDesktop = (width: number): boolean => width >= BREAKPOINTS.tablet;

// Responsive dimensions
export const RESPONSIVE_DIMENSIONS = {
  mobile: {
    panelWidth: '100%',
    sidebarWidth: 280,
    personPanelWidth: '100%',
    timeSliderWidth: '90%',
    minPanelHeight: 200,
    maxPanelHeight: '60vh',
  },
  tablet: {
    panelWidth: 300,
    sidebarWidth: 300,
    personPanelWidth: 340,
    timeSliderWidth: 520,
    minPanelHeight: 300,
    maxPanelHeight: 'calc(100vh - 32px)',
  },
  desktop: {
    panelWidth: 300,
    sidebarWidth: 300,
    personPanelWidth: 360,
    timeSliderWidth: 520,
    minPanelHeight: 400,
    maxPanelHeight: 'calc(100vh - 32px)',
  },
} as const;
