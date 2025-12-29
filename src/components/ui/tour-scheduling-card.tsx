'use client';

import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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

interface TourSchedulingProps {
  guideName?: string;
  tourName?: string;
  tourDuration?: number;
  location?: string;
  weekSchedule?: DaySchedule[];
  onTimeSlotSelect?: (date: string, time: string) => void;
  onWeekChange?: (direction: 'prev' | 'next') => void;
  enableAnimations?: boolean;
  className?: string;
  price?: string;
  currency?: string;
}

export function TourSchedulingCard({
  guideName = 'Your Guide',
  tourName = 'Tour',
  tourDuration = 180,
  location,
  weekSchedule = [],
  onTimeSlotSelect,
  onWeekChange,
  enableAnimations = true,
  className,
  price,
  currency = 'USD',
}: TourSchedulingProps) {
  const [showConfirmationView, setShowConfirmationView] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    date: string;
    time: string;
    dayName: string;
  } | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} minutes`;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  const handleTimeSlotClick = (date: string, time: string) => {
    const dayInfo = weekSchedule.find((d) => d.date === date);
    setSelectedTimeSlot({
      date,
      time,
      dayName: dayInfo?.dayName || date,
    });
    setShowConfirmationView(true);
    onTimeSlotSelect?.(date, time);
  };

  const handleBackToMain = () => {
    setShowConfirmationView(false);
    setSelectedTimeSlot(null);
  };

  const handleConfirmBooking = () => {
    if (selectedTimeSlot) {
      onTimeSlotSelect?.(selectedTimeSlot.date, selectedTimeSlot.time);
    }
  };

  const handleWeekNavigation = (direction: 'prev' | 'next') => {
    onWeekChange?.(direction);
  };

  // Get week range from schedule
  const weekRange =
    weekSchedule.length > 0
      ? `${weekSchedule[0].date} - ${weekSchedule[weekSchedule.length - 1].date}`
      : '';

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      x: -25,
      scale: 0.95,
      filter: 'blur(4px)',
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 28,
        mass: 0.6,
      },
    },
  };

  const timeSlotVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
      },
    },
  };

  return (
    <motion.div
      variants={shouldAnimate ? containerVariants : {}}
      initial={shouldAnimate ? 'hidden' : 'visible'}
      animate="visible"
      className={cn(
        'bg-white rounded-2xl border border-sand-200 shadow-xl overflow-hidden max-w-2xl relative',
        className
      )}
    >
      <div className="relative h-auto">
        {/* Main Content */}
        <motion.div
          initial={false}
          animate={{
            y: showConfirmationView ? '-20px' : '0px',
            opacity: showConfirmationView ? 0.3 : 1,
            scale: showConfirmationView ? 0.95 : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          className="w-full"
        >
          {/* Tour Info Header */}
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="p-6 pb-6">
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-sand-900 mb-1">
                  {tourName}
                </h2>
                <p className="text-sm text-sand-600">{guideName}</p>
              </div>

              <div className="flex items-center gap-4 text-sm text-sand-600">
                {location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(tourDuration)}</span>
                </div>
                {price && (
                  <div className="ml-auto">
                    <span className="font-semibold text-sand-900">{price}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Separator */}
          <motion.div
            variants={shouldAnimate ? itemVariants : {}}
            className="mx-6 border-t border-sand-200"
          />

          {/* Week Navigation */}
          {weekSchedule.length > 0 && (
            <motion.div variants={shouldAnimate ? itemVariants : {}} className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <motion.button
                  whileHover={
                    shouldAnimate
                      ? {
                          scale: 1.05,
                          transition: { type: 'spring', stiffness: 400, damping: 25 },
                        }
                      : {}
                  }
                  whileTap={shouldAnimate ? { scale: 0.95 } : {}}
                  onClick={() => handleWeekNavigation('prev')}
                  aria-label="Previous week"
                  className="p-2 hover:bg-sand-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <ChevronLeft className="w-5 h-5 text-sand-600" />
                </motion.button>

                <h3 className="font-display text-lg font-semibold text-sand-900">{weekRange}</h3>

                <motion.button
                  whileHover={
                    shouldAnimate
                      ? {
                          scale: 1.05,
                          transition: { type: 'spring', stiffness: 400, damping: 25 },
                        }
                      : {}
                  }
                  whileTap={shouldAnimate ? { scale: 0.95 } : {}}
                  onClick={() => handleWeekNavigation('next')}
                  aria-label="Next week"
                  className="p-2 hover:bg-sand-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <ChevronRight className="w-5 h-5 text-sand-600" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Daily Schedule */}
          <motion.div
            variants={shouldAnimate ? itemVariants : {}}
            className="px-6 pb-6 space-y-4"
          >
            {weekSchedule.length > 0 ? (
              weekSchedule.map((day) => (
                <motion.div
                  key={day.date}
                  variants={shouldAnimate ? itemVariants : {}}
                  className="space-y-3"
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sand-900">
                        {day.dayName}, {day.date}
                      </h4>
                    </div>
                    {!day.hasAvailability && (
                      <span className="text-sm text-sand-500">No Availability</span>
                    )}
                  </div>

                  {/* Time Slots */}
                  {day.hasAvailability && (
                    <motion.div
                      variants={shouldAnimate ? containerVariants : {}}
                      className="flex flex-wrap gap-2"
                    >
                      {day.slots.map((slot) => (
                        <motion.button
                          key={`${day.date}-${slot.time}`}
                          variants={shouldAnimate ? timeSlotVariants : {}}
                          whileHover={
                            shouldAnimate && slot.available
                              ? {
                                  scale: 1.05,
                                  y: -2,
                                  transition: { type: 'spring', stiffness: 400, damping: 25 },
                                }
                              : {}
                          }
                          whileTap={shouldAnimate && slot.available ? { scale: 0.98 } : {}}
                          onClick={() => slot.available && handleTimeSlotClick(day.date, slot.time)}
                          disabled={!slot.available}
                          aria-label={`${slot.available ? 'Book' : 'Unavailable'} time slot at ${slot.time} on ${day.dayName}, ${day.date}`}
                          className={cn(
                            'px-3 py-1.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50',
                            slot.available
                              ? 'bg-white border-sand-300 hover:border-primary-500 hover:bg-primary-50 text-sand-900 cursor-pointer'
                              : 'bg-sand-100 border-sand-200 text-sand-400 cursor-not-allowed opacity-60'
                          )}
                        >
                          {slot.time}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-sand-500">
                <p>No availability data available</p>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Confirmation View */}
        <motion.div
          initial={false}
          animate={{
            y: showConfirmationView ? '0%' : '100%',
            opacity: showConfirmationView ? 1 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          className="absolute top-0 left-0 w-full h-full bg-white"
        >
          <div className="p-6 space-y-6">
            {/* Header with back button */}
            <div className="flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBackToMain}
                className="flex items-center gap-2 text-sand-600 hover:text-sand-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </motion.button>
              <h3 className="font-display text-lg font-semibold text-sand-900">
                Confirm Booking
              </h3>
              <div></div> {/* Spacer for centering */}
            </div>

            {/* Tour info summary */}
            <div className="p-4 bg-sand-50 rounded-xl border border-sand-200">
              <h4 className="font-semibold text-sand-900 mb-1">{tourName}</h4>
              <p className="text-sm text-sand-600">{guideName}</p>
            </div>

            {/* Booking details */}
            {selectedTimeSlot && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-sand-500 uppercase tracking-wide mb-2">
                    Your Booking
                  </p>
                  <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                    <p className="text-lg font-semibold text-sand-900">
                      {selectedTimeSlot.dayName}, {selectedTimeSlot.date}
                    </p>
                    <p className="text-xl font-bold text-primary-600">{selectedTimeSlot.time}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {location && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sand-600">Location:</span>
                      <span className="text-sand-900 font-medium">{location}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sand-600">Duration:</span>
                    <span className="text-sand-900 font-medium">
                      {formatDuration(tourDuration)}
                    </span>
                  </div>
                  {price && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sand-600">Price:</span>
                      <span className="text-sand-900 font-medium">{price}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confirm button */}
            <motion.button
              whileHover={shouldAnimate ? { scale: 1.02, y: -1 } : {}}
              whileTap={shouldAnimate ? { scale: 0.98 } : {}}
              onClick={handleConfirmBooking}
              className="w-full relative overflow-hidden py-3 rounded-xl font-semibold transition-all duration-300 bg-primary-500 hover:bg-primary-600 text-white border cursor-pointer group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                CONFIRM TIME SLOT
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
              {/* Gradient shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

