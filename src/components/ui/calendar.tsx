'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from './button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  ...props
}: CalendarProps) {
  const defaultClassNames = {
    months: 'relative flex flex-col sm:flex-row gap-4',
    month: 'w-full',
    month_caption: 'relative mx-10 mb-1 flex h-9 items-center justify-center z-20',
    caption_label: 'text-sm font-medium text-sand-900',
    nav: 'absolute top-0 flex w-full justify-between z-10',
    button_previous: cn(
      'size-9 text-sand-600 hover:text-sand-900 p-0 rounded-lg hover:bg-sand-100 transition-colors flex items-center justify-center'
    ),
    button_next: cn(
      'size-9 text-sand-600 hover:text-sand-900 p-0 rounded-lg hover:bg-sand-100 transition-colors flex items-center justify-center'
    ),
    weekday: 'size-9 p-0 text-xs font-medium text-sand-600',
    day_button:
      'relative flex size-9 items-center justify-center whitespace-nowrap rounded-lg p-0 text-sand-900 outline-offset-2 group-[[data-selected]:not(.range-middle)]:[transition-property:color,background-color,border-radius,box-shadow] group-[[data-selected]:not(.range-middle)]:duration-150 focus:outline-none group-data-[disabled]:pointer-events-none focus-visible:z-10 hover:bg-sand-100 group-data-[selected]:bg-primary-500 hover:text-sand-900 group-data-[selected]:text-white group-data-[disabled]:text-sand-400 group-data-[disabled]:line-through group-data-[outside]:text-sand-400 group-data-[outside]:group-data-[selected]:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500/70 group-[.range-start:not(.range-end)]:rounded-e-none group-[.range-end:not(.range-start)]:rounded-s-none group-[.range-middle]:rounded-none group-data-[selected]:group-[.range-middle]:bg-sand-100 group-data-[selected]:group-[.range-middle]:text-sand-900',
    day: 'group size-9 px-0 text-sm',
    range_start: 'range-start',
    range_end: 'range-end',
    range_middle: 'range-middle',
    today:
      '*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-primary-500 [&[data-selected]:not(.range-middle)>*]:after:bg-white [&[data-disabled]>*]:after:bg-sand-400 *:after:transition-colors',
    outside: 'text-sand-400 data-selected:bg-sand-50 data-selected:text-sand-400',
    hidden: 'invisible',
    week_number: 'size-9 p-0 text-xs font-medium text-sand-600',
  };

  const mergedClassNames: typeof defaultClassNames = Object.keys(defaultClassNames).reduce(
    (acc, key) => ({
      ...acc,
      [key]: classNames?.[key as keyof typeof classNames]
        ? cn(
            defaultClassNames[key as keyof typeof defaultClassNames],
            classNames[key as keyof typeof classNames],
          )
        : defaultClassNames[key as keyof typeof defaultClassNames],
    }),
    {} as typeof defaultClassNames,
  );

  const defaultComponents = {
    Chevron: (props: any) => {
      if (props.orientation === 'left') {
        return <ChevronLeft size={16} strokeWidth={2} {...props} aria-hidden="true" />;
      }
      return <ChevronRight size={16} strokeWidth={2} {...props} aria-hidden="true" />;
    },
  };

  const mergedComponents = {
    ...defaultComponents,
    ...userComponents,
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('w-fit', className)}
      classNames={mergedClassNames}
      components={mergedComponents}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };

