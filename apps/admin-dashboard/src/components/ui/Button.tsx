import React from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed dark:ring-offset-zinc-950 dark:focus-visible:ring-violet-400',
  {
    variants: {
      variant: {
        default: 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm dark:bg-violet-500 dark:text-violet-50 dark:hover:bg-violet-400',
        destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm dark:bg-red-700 dark:text-red-50 dark:hover:bg-red-600',
        outline:
          'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800',
        secondary: 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
        ghost: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50',
        link: 'text-violet-400 underline-offset-4 hover:underline dark:text-violet-400',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-11 px-6 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };