'use client';

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const chartConfig: ChartConfig = {
  income: { label: 'Thu', color: 'var(--chart-2)' },
  expense: { label: 'Chi', color: 'var(--chart-1)' },
};

export interface IncomeExpensePoint {
  label: string;
  income: number;
  expense: number;
}

// Dùng chung cho: widget trang chủ, biểu đồ thu-chi theo thời gian và biểu đồ
// so sánh cùng kỳ ở trang /reports - mỗi nơi tự map dữ liệu API về đúng shape
// {label, income, expense}.
export function IncomeExpenseBarChart({ data, className }: { data: IncomeExpensePoint[]; className?: string }) {
  return (
    <ChartContainer config={chartConfig} className={className}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="income" fill="var(--color-income)" radius={4} />
        <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
