'use client';

import { Cell, Pie, PieChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/format';
import type { ReportCategoryBreakdown } from '@/types/api';

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export function CategoryPieChart({ data }: { data: ReportCategoryBreakdown[] }) {
  const chartConfig: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.categoryId, { label: d.categoryName, color: COLORS[i % COLORS.length] }]),
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-56 w-full sm:w-auto">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="categoryId" />} />
          <Pie data={data} dataKey="amount" nameKey="categoryId" innerRadius={45}>
            {data.map((entry, index) => (
              <Cell key={entry.categoryId} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="flex-1 space-y-2">
        {data.map((entry, index) => (
          <li key={entry.categoryId} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              {entry.categoryName}
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(entry.amount)} · {entry.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
