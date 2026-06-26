import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MobileTabBar } from './MobileTabBar';
import { MobileHeader } from './MobileHeader';
import { DesktopNavHeader } from './DesktopNavHeader';

interface AppLayoutProps {
  children: ReactNode;
  /** Page title for headers */
  title?: string;
  /** Show mobile header (default: true) */
  showMobileHeader?: boolean;
  /** Show logo instead of title in mobile header */
  showLogo?: boolean;
  /** Show mobile tab bar (default: true) */
  showTabBar?: boolean;
  /** Right content for mobile header */
  headerRight?: ReactNode;
  /** Full height layout without scrolling (for chat, etc.) */
  fullHeight?: boolean;
  /** Extra class name for main content */
  className?: string;
}

/**
 * Main application layout with responsive navigation
 * - Mobile: Top header (with title + actions) + Bottom tab bar
 * - Desktop: Top navigation header only (no page-level header)
 */
export function AppLayout({
  children,
  title,
  showMobileHeader = true,
  showLogo = false,
  showTabBar = true,
  headerRight,
  fullHeight = false,
  className,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Desktop Navigation Header */}
      <DesktopNavHeader />

      {/* Mobile Header - only shown on mobile */}
      {showMobileHeader && (
        <MobileHeader
          title={title}
          showLogo={showLogo}
          rightContent={headerRight}
        />
      )}

      {/* Main Content */}
      <main
        className={cn(
          'flex-1',
          fullHeight ? 'overflow-hidden' : 'overflow-y-auto',
          showTabBar && 'pb-20 md:pb-0', // Space for mobile tab bar
          className
        )}
      >
        {children}
      </main>

      {/* Mobile Tab Bar */}
      {showTabBar && <MobileTabBar />}
    </div>
  );
}
