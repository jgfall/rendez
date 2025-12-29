'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface DashboardShowcaseProps {
  screenshots: string[];
  layout?: 'grid' | 'dashboard';
  className?: string;
}

export function DashboardShowcase({ 
  screenshots, 
  layout = 'grid',
  className 
}: DashboardShowcaseProps) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  };

  if (layout === 'dashboard') {
    // Dashboard layout matching the screenshot structure with absolute positioning and z-index
    return (
      <div className={cn('relative mt-8 overflow-visible px-2 sm:mt-12 md:mt-20', className)}>
        <div
          aria-hidden
          className="bg-gradient-to-b to-background absolute inset-0 z-10 from-transparent from-35% pointer-events-none"
        />
        <div className="relative w-full min-h-[1000px]">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.15,
                  delayChildren: 0.2,
                },
              },
            }}
            className="relative w-full h-full">
            {/* Background layer - Dashboard sections (z-index: 1) */}
            <div className="absolute inset-0 w-full h-full">
              {/* Dashboard Metrics and Calendar - Top right */}
              {screenshots[1] && (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 40, scale: 0.94 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: {
                        type: 'spring',
                        bounce: 0.2,
                        duration: 1,
                      },
                    },
                  }}
                  className="absolute top-[164px] lg:top-[184px] right-[-20px] w-[72%] lg:w-[66%] h-[640px] lg:h-[680px] z-[1]">
                  <Image
                    src={screenshots[1]}
                    alt="Dashboard metrics and calendar"
                    fill
                    className="object-contain"
                    style={{ left: '-108px', top: '-45px', paddingLeft: '28px', paddingRight: '28px' }}
                    onLoad={() => handleImageLoad(1)}
                    priority
                    unoptimized
                  />
                </motion.div>
              )}

              {/* Bottom sections - Side by side */}
              <div className="absolute bottom-0 right-0 w-[58%] lg:w-[52%] h-[240px] lg:h-[260px] flex gap-4 z-[1]">
                {screenshots[2] && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 40, scale: 0.94 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: {
                          type: 'spring',
                          bounce: 0.2,
                          duration: 1,
                        },
                      },
                    }}
                    className="flex-1 relative h-full">
                    <Image
                      src={screenshots[2]}
                      alt="Dashboard section 1"
                      fill
                      className="object-contain"
                      style={{ left: '-365px', top: '188px' }}
                      onLoad={() => handleImageLoad(2)}
                      unoptimized
                    />
                  </motion.div>
                )}
                {screenshots[3] && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 40, scale: 0.94 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: {
                          type: 'spring',
                          bounce: 0.2,
                          duration: 1,
                        },
                      },
                    }}
                    className="flex-1 relative h-full">
                    <Image
                      src={screenshots[3]}
                      alt="Dashboard section 2"
                      fill
                      className="object-contain"
                      style={{ left: '-533px', top: '238px' }}
                      onLoad={() => handleImageLoad(3)}
                      unoptimized
                    />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Foreground layer - Tour Proposal (z-index: 2, overlaps on left) */}
            {screenshots[0] && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 40, scale: 0.94 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: 'spring',
                      bounce: 0.2,
                      duration: 1,
                    },
                  },
                }}
                className="absolute left-[8%] lg:left-[10%] top-[150px] lg:top-[170px] w-[36%] lg:w-[32%] h-[640px] lg:h-[680px] z-[-2]">
                <Image
                  src={screenshots[0]}
                  alt="Tour proposal view"
                  fill
                  className="object-contain"
                  style={{ left: '140px', top: '-73px', paddingLeft: '33px', paddingRight: '33px' }}
                  onLoad={() => handleImageLoad(0)}
                  priority
                  unoptimized
                />
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // Default grid layout
  return (
    <div className={cn('relative mt-8 overflow-hidden px-2 sm:mt-12 md:mt-20', className)}>
      <div
        aria-hidden
        className="bg-gradient-to-b to-background absolute inset-0 z-10 from-transparent from-35%"
      />
      <div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1">
        <AnimatedGroup
          variants={{
            container: {
              visible: {
                transition: {
                  staggerChildren: 0.15,
                  delayChildren: 0.3,
                },
              },
            },
            item: {
              hidden: {
                opacity: 0,
                y: 20,
                scale: 0.95,
              },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: 'spring' as const,
                  bounce: 0.2,
                  duration: 0.8,
                },
              },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {screenshots.map((src, index) => (
            <div
              key={index}
              className="relative aspect-video rounded-lg overflow-hidden bg-sand-100 border border-sand-200 shadow-sm">
              <Image
                src={src}
                alt={`Dashboard screenshot ${index + 1}`}
                fill
                className={cn(
                  'object-cover transition-opacity duration-700',
                  loadedImages.has(index) ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => handleImageLoad(index)}
                priority={index < 3}
              />
              {!loadedImages.has(index) && (
                <div className="absolute inset-0 bg-sand-200 animate-pulse" />
              )}
            </div>
          ))}
        </AnimatedGroup>
      </div>
    </div>
  );
}

