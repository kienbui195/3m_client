'use client';

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { formatCompactAmount } from '@/lib/format';

const chartConfig: ChartConfig = {
  net: { label: 'Dòng tiền ròng' },
};

// Khớp màu với 2 stat card "Thu/Chi trung bình" ở ReportCharts (emerald-600 / destructive)
// để người dùng liên hệ ngay: cột dương = kỳ có thu > chi, cột âm = kỳ chi vượt thu.
const POSITIVE_COLOR = '#059669';
const NEGATIVE_COLOR = 'var(--destructive)';

export interface NetCashFlowPoint {
  label: string;
  net: number;
}

export function NetCashFlowChart({ data, className }: { data: NetCashFlowPoint[]; className?: string }) {
  return (
    <ChartContainer config={chartConfig} className={className}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatCompactAmount} width={40} />
        <ReferenceLine y={0} stroke="var(--border)" />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="net" radius={[6, 6, 6, 6]} maxBarSize={40}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.net >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
