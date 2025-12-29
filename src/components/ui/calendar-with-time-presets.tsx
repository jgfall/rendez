'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface CalendarWithTimePresetsProps {
  date?: Date;
  selectedTime?: string | null;
  onDateChange?: (date: Date | undefined) => void;
  onTimeChange?: (time: string | null) => void;
  onConfirm?: () => void;
  bookedDates?: Date[];
  disabled?: boolean;
  className?: string;
  allowedDaysOfWeek?: number[] | null; // Array of day numbers (0=Sunday, 1=Monday, etc.)
  conflictDates?: Date[]; // Dates where guide already has tours scheduled
  preferredStartTime?: string | null; // Preferred start time in HH:MM:SS or HH:MM format
}

export function CalendarWithTimePresets({
  date,
  selectedTime,
  onDateChange,
  onTimeChange,
  onConfirm,
  bookedDates = [],
  disabled = false,
  className,
  allowedDaysOfWeek,
  conflictDates = [],
  preferredStartTime,
}: CalendarWithTimePresetsProps) {
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(date);
  const [internalTime, setInternalTime] = React.useState<string | null>(selectedTime || null);

  // Sync internal state with props
  React.useEffect(() => {
    setInternalDate(date);
  }, [date]);

  React.useEffect(() => {
    setInternalTime(selectedTime || null);
  }, [selectedTime]);

  // Convert preferred start time from HH:MM:SS or HH:MM to HH:MM format
  const normalizePreferredTime = React.useMemo(() => {
    if (!preferredStartTime) return null;
    // Handle both HH:MM:SS and HH:MM formats
    const parts = preferredStartTime.split(':');
    if (parts.length >= 2) {
      const hour = parts[0].padStart(2, '0');
      const minute = parts[1].padStart(2, '0');
      return `${hour}:${minute}`;
    }
    return null;
  }, [preferredStartTime]);

  // Generate time slots (9 AM to 6 PM, 15-minute intervals)
  const allTimeSlots = React.useMemo(() => {
    return Array.from({ length: 37 }, (_, i) => {
      const totalMinutes = i * 15;
      const hour = Math.floor(totalMinutes / 60) + 9;
      const minute = totalMinutes % 60;
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    });
  }, []);

  // Filter time slots based on preferred start time
  // If preferred time is set, only show that time (even if it's outside the standard range)
  const timeSlots = React.useMemo(() => {
    if (normalizePreferredTime) {
      // Only show the preferred time
      return [normalizePreferredTime];
    }
    return allTimeSlots;
  }, [normalizePreferredTime, allTimeSlots]);

  const handleDateChange = (newDate: Date | undefined) => {
    setInternalDate(newDate);
    onDateChange?.(newDate);
  };

  const handleTimeChange = (time: string) => {
    setInternalTime(time);
    onTimeChange?.(time);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  // Combine all disabled dates: booked dates + conflict dates
  const allDisabledDates = [...bookedDates, ...conflictDates];

  // Function to determine if a date should be disabled
  const isDateDisabled = (date: Date): boolean => {
    // Check if date is in booked or conflict dates (compare dates only, ignore time)
    const dateStr = date.toISOString().split('T')[0];
    if (allDisabledDates.some(d => {
      const dStr = d.toISOString().split('T')[0];
      return dStr === dateStr;
    })) {
      return true;
    }

    // Check day of week constraints
    if (allowedDaysOfWeek && allowedDaysOfWeek.length > 0) {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      if (!allowedDaysOfWeek.includes(dayOfWeek)) {
        return true;
      }
    }

    return false;
  };

  return (
    <Card variant="elevated" padding="none" className={cn('gap-0', className)}>
      <CardContent className="relative p-0 md:pr-48">
        <div className="p-6">
          <Calendar
            mode="single"
            selected={internalDate}
            onSelect={handleDateChange}
            defaultMonth={internalDate}
            disabled={isDateDisabled}
            showOutsideDays={false}
            modifiers={{
              booked: bookedDates,
              conflict: conflictDates,
              constrained: allowedDaysOfWeek && allowedDaysOfWeek.length > 0 
                ? (date: Date) => {
                    const dayOfWeek = date.getDay();
                    return !allowedDaysOfWeek.includes(dayOfWeek);
                  }
                : undefined,
            }}
            modifiersClassNames={{
              booked: '[&>button]:line-through opacity-100',
              conflict: '[&>button]:opacity-50 [&>button]:bg-red-50 [&>button]:text-red-400',
              constrained: '[&>button]:opacity-50 [&>button]:bg-sand-100 [&>button]:text-sand-400',
            }}
            className="bg-transparent p-0"
            formatters={{
              formatWeekdayName: (date) => {
                return date.toLocaleString('en-US', { weekday: 'short' });
              },
            }}
          />
        </div>
        <div className="inset-y-0 right-0 flex max-h-72 w-full scroll-pb-6 flex-col gap-4 overflow-y-auto border-t border-sand-200 p-6 md:absolute md:max-h-none md:w-48 md:border-t-0 md:border-l [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="grid gap-2">
            {timeSlots.map((time) => (
              <Button
                key={time}
                variant={internalTime === time ? 'primary' : 'outline'}
                onClick={() => handleTimeChange(time)}
                className="w-full shadow-none"
                size="sm"
                disabled={disabled}
              >
                {time}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
      {onConfirm && (
        <CardFooter className="flex flex-col gap-4 border-t border-sand-200 px-6 !py-5 md:flex-row">
          <div className="text-sm text-sand-600">
            {internalDate && internalTime ? (
              <>
                Your tour is scheduled for{' '}
                <span className="font-medium text-sand-900">
                  {internalDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>{' '}
                at <span className="font-medium text-sand-900">{internalTime}</span>.
              </>
            ) : (
              <>Select a date and time for the tour.</>
            )}
          </div>
          <Button
            disabled={!internalDate || !internalTime || disabled}
            onClick={handleConfirm}
            className="w-full md:ml-auto md:w-auto"
            variant="outline"
          >
            Set Time
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

