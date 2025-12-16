import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { cn } from '../../utils';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const SelectContent: React.FC<SelectContentProps> = ({ className, children, ...props }) => (
  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
    <div
      className={cn(
        'ring-opacity-5 absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black focus:outline-none sm:text-sm dark:bg-gray-900', // max-h-60 여기로 이동
        className,
      )}
      {...props}
    >
      <Listbox.Options static> {children}</Listbox.Options>
    </div>
  </Transition>
);
SelectContent.displayName = 'SelectContent';

const SelectTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode; id?: string }> = ({
  className,
  children,
  ...props
}) => (
  <Listbox.Button
    className={cn(
      'relative h-10 w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pr-10 pl-3 text-left shadow-sm focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:text-sm dark:border-gray-700 dark:bg-gray-900 dark:focus-visible:ring-offset-gray-950 text-gray-900 dark:text-gray-100',
      props.disabled && 'cursor-not-allowed opacity-50',
      className,
    )}
    {...props}
  >
    {children}
    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
      <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
    </span>
  </Listbox.Button>
);
SelectTrigger.displayName = 'SelectTrigger';

const SelectValue: React.FC<{ placeholder?: string; children?: React.ReactNode }> = ({ placeholder, children }) => {
  if (children) {
    return <span className="block truncate text-gray-900 dark:text-gray-100">{children}</span>;
  }
  if (placeholder) {
    return <span className="block truncate text-gray-500 dark:text-gray-400">{placeholder}</span>;
  }
  return <span className="block truncate"> </span>;
};
SelectValue.displayName = 'SelectValue';

const SelectItem: React.FC<{ value: string | number; children: React.ReactNode; disabled?: boolean }> = ({ value, children, disabled }) => (
  <Listbox.Option
    className={({ active, selected }) =>
      cn(
        'relative cursor-default py-2 pr-4 pl-10 select-none',
        active ? 'bg-blue-100 text-blue-900 dark:bg-blue-700 dark:text-blue-100' : 'text-gray-900 dark:text-gray-50',
        selected && 'font-semibold',
        disabled && 'cursor-not-allowed text-gray-400 dark:text-gray-600',
      )
    }
    value={value}
    disabled={disabled}
  >
    {({ selected }) => (
      <>
        <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>{children}</span>
        {selected ? (
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400">
            <CheckIcon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
      </>
    )}
  </Listbox.Option>
);
SelectItem.displayName = 'SelectItem';

interface SelectProps {
  value?: string | number | null;
  onValueChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  triggerClassName,
  contentClassName,
  disabled,
}) => {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Listbox value={value ?? ''} onChange={onValueChange} disabled={disabled}>
      <div className={cn('relative', className)}>
        <SelectTrigger className={triggerClassName} disabled={disabled}>
          <SelectValue placeholder={placeholder}>{selectedOption?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </div>
    </Listbox>
  );
};
Select.displayName = 'Select';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
