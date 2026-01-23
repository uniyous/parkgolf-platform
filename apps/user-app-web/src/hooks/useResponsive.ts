import { useState, useEffect } from 'react';

/**
 * Breakpoint definitions (Tailwind CSS aligned)
 */
export const breakpoints = {
  sm: 640, // Mobile
  md: 768, // Tablet
  lg: 1024, // Desktop
  xl: 1280, // Large desktop
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Responsive hook for detecting screen size
 */
export function useResponsive() {
  const [state, setState] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
  });

  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      setState({
        isMobile: width < breakpoints.md,
        isTablet: width >= breakpoints.md && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg,
        width,
      });
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return state;
}

/**
 * Check if current width is at least the specified breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint) {
  const { width } = useResponsive();
  return width >= breakpoints[breakpoint];
}
