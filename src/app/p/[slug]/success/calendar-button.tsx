'use client';

import { AddToCalendar } from '@/components/ui';
import type { CalendarEvent } from '@/lib/calendar';

interface CalendarButtonProps {
  event: CalendarEvent | null;
  isRemainder: boolean;
}

export function CalendarButton({ event, isRemainder }: CalendarButtonProps) {
  if (!event || isRemainder) {
    return null;
  }

  return (
    <div className="w-full [&>div]:w-full [&_button]:w-full">
      <AddToCalendar event={event} />
    </div>
  );
}

