'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, Download } from 'lucide-react';
import { Button } from './button';
import { getGoogleCalendarUrl, getOutlookCalendarUrl, getYahooCalendarUrl, downloadICSFile, type CalendarEvent } from '@/lib/calendar';

interface AddToCalendarProps {
  event: CalendarEvent;
}

export function AddToCalendar({ event }: AddToCalendarProps) {
  const [showOptions, setShowOptions] = useState(false);

  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarUrl(event), '_blank');
    setShowOptions(false);
  };

  const handleOutlookCalendar = () => {
    window.open(getOutlookCalendarUrl(event), '_blank');
    setShowOptions(false);
  };

  const handleYahooCalendar = () => {
    window.open(getYahooCalendarUrl(event), '_blank');
    setShowOptions(false);
  };

  const handleDownloadICS = () => {
    downloadICSFile(event, `${event.title.replace(/\s+/g, '-')}.ics`);
    setShowOptions(false);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setShowOptions(!showOptions)}
        icon={<Calendar className="h-4 w-4" />}
      >
        Add to Calendar
        <ChevronDown className={`h-4 w-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
      </Button>

      {showOptions && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowOptions(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-sand-200 z-20 overflow-hidden">
            <div className="py-1">
              <button
                onClick={handleGoogleCalendar}
                className="w-full px-4 py-3 text-left text-sm text-sand-700 hover:bg-sand-50 transition-colors flex items-center gap-2"
              >
                <Calendar className="h-4 w-4 text-sand-400" />
                Google Calendar
              </button>
              <button
                onClick={handleOutlookCalendar}
                className="w-full px-4 py-3 text-left text-sm text-sand-700 hover:bg-sand-50 transition-colors flex items-center gap-2"
              >
                <Calendar className="h-4 w-4 text-sand-400" />
                Outlook
              </button>
              <button
                onClick={handleYahooCalendar}
                className="w-full px-4 py-3 text-left text-sm text-sand-700 hover:bg-sand-50 transition-colors flex items-center gap-2"
              >
                <Calendar className="h-4 w-4 text-sand-400" />
                Yahoo Calendar
              </button>
              <div className="border-t border-sand-200 my-1" />
              <button
                onClick={handleDownloadICS}
                className="w-full px-4 py-3 text-left text-sm text-sand-700 hover:bg-sand-50 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4 text-sand-400" />
                Download .ics file
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

