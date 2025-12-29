'use client';

import React from 'react';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Line, XAxis, YAxis, CartesianGrid, ComposedChart } from 'recharts';

interface ChartDataPoint {
  month: string;
  deposits: number;
  remainders: number;
  total: number;
}

interface RevenueChartProps {
  data: ChartDataPoint[];
  currency: string;
}

// Chart configuration
const chartConfig = {
  deposits: {
    label: 'Deposits',
    color: '#d45424', // primary-500
  },
  remainders: {
    label: 'Remainders',
    color: '#0ca5eb', // ocean-500
  },
  total: {
    label: 'Total',
    color: '#059669', // emerald-600
  },
} satisfies ChartConfig;

// Custom Tooltip
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
  }>;
  label?: string;
  currency?: string;
}

const CustomTooltip = ({ active, payload, label, currency = 'USD' }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-white p-3 shadow-sm shadow-black/5 min-w-[150px]">
        <div className="text-xs font-medium text-sand-600 tracking-wide mb-2.5">{label}</div>
        <div className="space-y-2">
          {payload.map((entry, index) => {
            const config = chartConfig[entry.dataKey as keyof typeof chartConfig];
            return (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div className="w-1 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-sand-600">{config?.label}:</span>
                <span className="font-semibold text-sand-900">
                  {formatPrice(entry.value, currency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data, currency }: RevenueChartProps) {
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMM yyyy');
  };

  // Transform data for chart (format month labels)
  const chartData = data.map(point => ({
    ...point,
    period: formatMonth(point.month),
  }));

  return (
    <div className="space-y-4">
      {/* Chart */}
      <ChartContainer
        config={chartConfig}
        className="h-[300px] w-full"
      >
        <ComposedChart
          data={chartData}
          margin={{
            top: 30,
            right: 5,
            left: 5,
            bottom: 10,
          }}
        >
          <CartesianGrid
            strokeDasharray="4 12"
            stroke="#e7e5e4"
            strokeOpacity={1}
            horizontal={true}
            vertical={false}
          />

          {/* X Axis */}
          <XAxis
            dataKey="period"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#78716c' }}
            tickMargin={10}
          />

          {/* Left Y Axis */}
          <YAxis
            yAxisId="left"
            orientation="left"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#78716c' }}
            tickFormatter={(value) => formatPrice(value, currency)}
            tickMargin={10}
          />

          <ChartTooltip
            content={<CustomTooltip currency={currency} />}
            cursor={{ strokeDasharray: '3 3', stroke: '#a8a29e', strokeOpacity: 0.5 }}
          />

          {/* Deposits Line */}
          <Line
            yAxisId="left"
            type="linear"
            dataKey="deposits"
            stroke={chartConfig.deposits.color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: chartConfig.deposits.color,
              strokeWidth: 0,
            }}
          />

          {/* Remainders Line (Dashed) */}
          <Line
            yAxisId="left"
            type="linear"
            dataKey="remainders"
            stroke={chartConfig.remainders.color}
            strokeWidth={1.5}
            strokeDasharray="8 4"
            dot={false}
            activeDot={{
              r: 5,
              fill: chartConfig.remainders.color,
              strokeWidth: 0,
            }}
          />

          {/* Total Line */}
          <Line
            yAxisId="left"
            type="linear"
            dataKey="total"
            stroke={chartConfig.total.color}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 5.5,
              fill: chartConfig.total.color,
              strokeWidth: 0,
            }}
          />
        </ComposedChart>
      </ChartContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <svg width="24" height="3" className="overflow-visible">
            <line x1="0" y1="1.5" x2="24" y2="1.5" stroke={chartConfig.deposits.color} strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="text-sand-600">Deposits</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="24" height="3" className="overflow-visible">
            <line x1="0" y1="1.5" x2="24" y2="1.5" stroke={chartConfig.remainders.color} strokeWidth="3" strokeDasharray="8 4" strokeLinecap="round" />
          </svg>
          <span className="text-sand-600">Remainders</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="24" height="3" className="overflow-visible">
            <line x1="0" y1="1.5" x2="24" y2="1.5" stroke={chartConfig.total.color} strokeWidth="3.5" strokeLinecap="round" />
          </svg>
          <span className="text-sand-600 font-medium">Total</span>
        </div>
      </div>
    </div>
  );
}
