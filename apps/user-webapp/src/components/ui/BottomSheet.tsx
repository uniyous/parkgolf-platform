import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  /** Sheet open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Sheet title */
  title?: string;
  /** Content */
  children: React.ReactNode;
  /** Extra class name for content */
  className?: string;
}

/**
 * Mobile bottom sheet component
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute bottom-0 left-0 right-0',
          'bg-[var(--color-bg-secondary)] rounded-t-3xl',
          'animate-slide-up',
          'max-h-[90vh] overflow-hidden flex flex-col'
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border-light)]" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-[var(--color-border)]">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-[var(--color-surface)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--color-text-tertiary)]" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={cn('flex-1 overflow-y-auto p-4', className)}>
          {children}
        </div>
      </div>
    </div>
  );
}
