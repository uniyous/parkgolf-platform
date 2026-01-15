import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const filterContainerVariants = cva(
  'bg-white rounded-lg',
  {
    variants: {
      variant: {
        default: 'border border-gray-200',
        elevated: 'shadow-sm',
        flat: '',
      },
      padding: {
        sm: 'p-3',
        default: 'p-4',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  }
);

const filterGridVariants = cva(
  'gap-4',
  {
    variants: {
      columns: {
        auto: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        2: 'grid grid-cols-1 md:grid-cols-2',
        3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        5: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        6: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
        flex: 'flex flex-wrap items-end',
      },
    },
    defaultVariants: {
      columns: 'auto',
    },
  }
);

export interface FilterContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof filterContainerVariants> {
  columns?: VariantProps<typeof filterGridVariants>['columns'];
}

const FilterContainer = React.forwardRef<HTMLDivElement, FilterContainerProps>(
  ({ className, variant, padding, columns, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(filterContainerVariants({ variant, padding }), className)}
      {...props}
    >
      <div className={cn(filterGridVariants({ columns }))}>
        {children}
      </div>
    </div>
  )
);
FilterContainer.displayName = 'FilterContainer';

export { FilterContainer, filterContainerVariants, filterGridVariants };
