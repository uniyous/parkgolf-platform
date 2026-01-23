import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)] focus-visible:ring-[var(--color-primary)]',
        destructive:
          'bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90 focus-visible:ring-[var(--color-error)]',
        outline:
          'border-2 border-[var(--color-primary)] bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white focus-visible:ring-[var(--color-primary)]',
        secondary:
          'bg-[var(--color-surface)] text-white hover:bg-[var(--color-surface-hover)] focus-visible:ring-white/20',
        ghost:
          'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-white focus-visible:ring-white/20',
        link: 'text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:ring-[var(--color-primary)]',
        glass:
          'bg-[var(--color-surface)] backdrop-blur-sm border border-[var(--color-border)] text-white hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-light)] focus-visible:ring-white/20',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        xl: 'h-14 rounded-xl px-10 text-lg',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>로딩 중...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
