import { useState, useEffect } from 'react';
import { BREAKPOINTS, type Breakpoint } from '../constants/breakpoints';

interface UseResponsiveReturn {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Custom hook to track viewport size and determine current breakpoint
 * Updates on window resize with debouncing for performance
 */
export function useResponsive(): UseResponsiveReturn {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    let timeoutId: number | null = null;

    const handleResize = () => {
      // Debounce resize events for better performance
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const { width, height } = dimensions;

  // Determine current breakpoint
  const breakpoint: Breakpoint =
    width < BREAKPOINTS.mobile
      ? 'mobile'
      : width < BREAKPOINTS.tablet
        ? 'tablet'
        : 'desktop';

  return {
    width,
    height,
    breakpoint,
    isMobile: width < BREAKPOINTS.mobile,
    isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.tablet,
  };
}
