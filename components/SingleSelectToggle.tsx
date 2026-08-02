'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SingleSelectToggleProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SingleSelectToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: SingleSelectToggleProps<T>) {
  return (
    <ToggleGroup
      variant="outline"
      value={[value]}
      onValueChange={(values) => {
        if (values[0]) onChange(values[0] as T);
      }}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((opt) => (
        <ToggleGroupItem key={opt.value} value={opt.value}>
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
