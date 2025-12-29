'use client';

import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

interface Proposal {
  id: string;
  scheduled_at: string | null;
  client?: { name: string } | null;
  tour?: { name: string } | null;
}

interface DashboardCalendarProps {
  proposals: Proposal[];
  totalUpcoming: number;
}

type ViewMode = 'month' | 'week';

export function DashboardCalendar({ proposals, totalUpcoming }: DashboardCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group proposals by date
  const proposalsByDate = proposals.reduce((acc, proposal) => {
    if (!proposal.scheduled_at) return acc;
    const dateKey = format(new Date(proposal.scheduled_at), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(proposal);
    return acc;
  }, {} as Record<string, Proposal[]>);

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    setCurrentDate(prev => {
      const newDate = addDays(prev, -7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentDate(prev => {
      const newDate = addDays(prev, 7);
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (viewMode === 'month') {
          goToPreviousMonth();
        } else {
          goToPreviousWeek();
        }
      } else if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (viewMode === 'month') {
          goToNextMonth();
        } else {
          goToNextWeek();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  // Get month view data
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get week view data
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDaysList = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const renderDayCell = (day: Date, isCurrentMonth: boolean) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const isToday = isSameDay(day, today);
    const dayProposals = proposalsByDate[dateKey] || [];

    return (
      <div
        key={day.toISOString()}
        className={`
          aspect-square border rounded-lg p-1.5
          ${isToday ? 'border-primary-500 bg-primary-50' : 'border-sand-200'}
          ${dayProposals.length > 0 ? 'bg-emerald-50 border-emerald-300' : ''}
          ${!isCurrentMonth ? 'opacity-40' : ''}
        `}
      >
        <div className={`
          text-xs font-medium mb-1
          ${isToday ? 'text-primary-700' : 'text-sand-600'}
        `}>
          {format(day, 'd')}
        </div>
        {dayProposals.length > 0 && (
          <div className="space-y-0.5">
            {dayProposals.slice(0, 2).map((proposal) => (
              <div
                key={proposal.id}
                className="text-[10px] px-1 py-0.5 rounded bg-emerald-600 text-white truncate"
                title={`${proposal.client?.name} - ${proposal.tour?.name}`}
              >
                {proposal.client?.name}
              </div>
            ))}
            {dayProposals.length > 2 && (
              <div className="text-[10px] text-sand-500 px-1">
                +{dayProposals.length - 2} more
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-semibold text-sand-900">
            {viewMode === 'month' 
              ? `${monthNames[currentMonth]} ${currentYear}`
              : `Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
            }
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={viewMode === 'month' ? goToPreviousMonth : goToPreviousWeek}
              icon={<ChevronLeft className="h-4 w-4" />}
              aria-label="Previous"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="text-xs"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={viewMode === 'month' ? goToNextMonth : goToNextWeek}
              icon={<ChevronRight className="h-4 w-4" />}
              aria-label="Next"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-sand-200 rounded-lg p-1">
            <Button
              variant={viewMode === 'month' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="text-xs"
            >
              Month
            </Button>
            <Button
              variant={viewMode === 'week' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="text-xs"
            >
              Week
            </Button>
          </div>
          <Badge variant="default" size="sm">
            {totalUpcoming} upcoming
          </Badge>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'month' ? (
        <>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-sand-500 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map(day => {
              const isCurrentMonthDay = isSameMonth(day, currentDate);
              return renderDayCell(day, isCurrentMonthDay);
            })}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-7 gap-2">
            {weekDaysList.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const isToday = isSameDay(day, today);
              const dayProposals = proposalsByDate[dateKey] || [];

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[200px] border rounded-lg p-3
                    ${isToday ? 'border-primary-500 bg-primary-50' : 'border-sand-200'}
                    ${dayProposals.length > 0 ? 'bg-emerald-50 border-emerald-300' : ''}
                  `}
                >
                  <div className={`
                    text-sm font-medium mb-2
                    ${isToday ? 'text-primary-700' : 'text-sand-600'}
                  `}>
                    {format(day, 'MMM d')}
                  </div>
                  {dayProposals.length > 0 ? (
                    <div className="space-y-2">
                      {dayProposals.map((proposal) => (
                        <div
                          key={proposal.id}
                          className="p-2 rounded-lg bg-emerald-600 text-white text-xs"
                        >
                          <div className="font-medium truncate">
                            {proposal.client?.name}
                          </div>
                          <div className="text-emerald-100 text-[10px] mt-0.5 truncate">
                            {proposal.tour?.name}
                          </div>
                          {proposal.scheduled_at && (
                            <div className="text-emerald-100 text-[10px] mt-1">
                              {format(new Date(proposal.scheduled_at), 'h:mm a')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-sand-400 text-center py-4">
                      No tours
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

