'use client';

import { useState, useEffect, useMemo } from 'react';
import { TourSchedulingCard } from '@/components/ui/tour-scheduling-card';
import { formatPrice } from '@/lib/utils';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import type { PublicProposal } from '@/types/database';

interface SchedulingSectionProps {
  proposal: PublicProposal;
  guideId: string;
  onTimeSelected: (date: string, time: string) => void;
  currency?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DaySchedule {
  date: string;
  dayName: string;
  dayNumber: number;
  slots: TimeSlot[];
  hasAvailability: boolean;
}

export function SchedulingSection({
  proposal,
  guideId,
  onTimeSelected,
  currency = 'USD',
}: SchedulingSectionProps) {
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 0 });
  });

  // Generate time slots (9 AM to 6 PM, 30-minute intervals)
  // Memoize to prevent infinite loops
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = new Date(2000, 0, 1, hour, minute);
        slots.push(format(time, 'h:mm a'));
      }
    }
    return slots;
  }, []);

  // Fetch availability for current week
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const weekEnd = addDays(currentWeekStart, 6);
        const startDateStr = format(currentWeekStart, 'yyyy-MM-dd');
        const endDateStr = format(weekEnd, 'yyyy-MM-dd');

        const response = await fetch(
          `/api/availability/${guideId}?start_date=${startDateStr}&end_date=${endDateStr}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch availability');
        }

        const { availability } = await response.json();

        // Build schedule for the week
        const schedule: DaySchedule[] = [];
        for (let i = 0; i < 7; i++) {
          const date = addDays(currentWeekStart, i);
          const displayDateStr = format(date, 'MMM d');
          const isoDateStr = format(date, 'yyyy-MM-dd');
          const dayName =
            i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(date, 'EEE');

          // Get available slots for this date
          const dayAvailability = availability.filter((a: any) => {
            // Handle both DATE and string formats
            let availDate: string;
            if (typeof a.date === 'string') {
              availDate = a.date.includes('T') ? a.date.split('T')[0] : a.date;
            } else {
              availDate = format(new Date(a.date), 'yyyy-MM-dd');
            }
            return availDate === isoDateStr;
          });

          // Create slots with availability
          const slots: TimeSlot[] = timeSlots.map((time) => {
            // Check if this time slot is available
            let isAvailable = dayAvailability.length === 0; // Default to available if no data
            
            if (dayAvailability.length > 0) {
              // Parse time to 24-hour format for comparison
              const [timePart, period] = time.split(' ');
              const [hours, minutes] = timePart.split(':');
              let hour24 = parseInt(hours);
              if (period === 'PM' && hour24 !== 12) hour24 += 12;
              if (period === 'AM' && hour24 === 12) hour24 = 0;
              
              isAvailable = dayAvailability.some((a: any) => {
                const startTime = a.start_time;
                const endTime = a.end_time;
                
                // Parse start and end times (handle both HH:MM:SS and HH:MM formats)
                const parseTime = (timeStr: string) => {
                  const parts = timeStr.split(':');
                  return parseInt(parts[0]) * 60 + parseInt(parts[1] || '0');
                };
                
                const slotMinutes = hour24 * 60 + parseInt(minutes);
                const startMinutes = parseTime(startTime);
                const endMinutes = parseTime(endTime);
                
                return slotMinutes >= startMinutes && slotMinutes < endMinutes;
              });
            }

            return {
              time,
              available: isAvailable,
            };
          });

          schedule.push({
            date: displayDateStr,
            dayName,
            dayNumber: date.getDate(),
            slots,
            hasAvailability: slots.some((s) => s.available),
          });
        }

        setWeekSchedule(schedule);
      } catch (error) {
        console.error('Error fetching availability:', error);
        // On error, show all slots as available
        const schedule: DaySchedule[] = [];
        for (let i = 0; i < 7; i++) {
          const date = addDays(currentWeekStart, i);
          const dateStr = format(date, 'MMM d');
          const dayName =
            i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(date, 'EEE');

          schedule.push({
            date: dateStr,
            dayName,
            dayNumber: date.getDate(),
            slots: timeSlots.map((time) => ({ time, available: true })),
            hasAvailability: true,
          });
        }
        setWeekSchedule(schedule);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [currentWeekStart, guideId, timeSlots]);

  const handleTimeSlotSelect = async (date: string, time: string) => {
    // Find the full date from the schedule
    const dayIndex = weekSchedule.findIndex((d) => d.date === date);
    if (dayIndex === -1) return;

    // Calculate the full date
    const fullDate = addDays(currentWeekStart, dayIndex);

    // Format date as YYYY-MM-DD
    const dateStr = format(fullDate, 'yyyy-MM-dd');

    // Convert time to 24-hour format for storage
    const [timePart, period] = time.split(' ');
    const [hours, minutes] = timePart.split(':');
    let hour24 = parseInt(hours);
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    const time24 = `${String(hour24).padStart(2, '0')}:${minutes}:00`;

    // Save the selected time
    try {
      const response = await fetch(`/api/proposals/${proposal.slug}/select-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, time: time24 }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save time selection');
      }

      // Call the callback
      onTimeSelected(dateStr, time24);
    } catch (error) {
      console.error('Error saving time selection:', error);
      alert(error instanceof Error ? error.message : 'Failed to save time selection. Please try again.');
    }
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    setCurrentWeekStart((prev) => addDays(prev, direction === 'next' ? 7 : -7));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="mb-8">
      <TourSchedulingCard
        guideName={proposal.guide.business_name || proposal.guide.full_name || 'Your Guide'}
        tourName={proposal.tour.name}
        tourDuration={proposal.tour.duration_minutes}
        location={proposal.tour.city || undefined}
        weekSchedule={weekSchedule}
        onTimeSlotSelect={handleTimeSlotSelect}
        onWeekChange={handleWeekChange}
        price={
          proposal.total_price_cents
            ? formatPrice(proposal.total_price_cents / 100, currency)
            : formatPrice(proposal.deposit_cents / 100, currency) + ' deposit'
        }
        currency={currency}
      />
    </div>
  );
}

