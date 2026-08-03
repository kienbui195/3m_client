'use client';

import { Cell, Pie, PieChart, type PieLabelRenderProps } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/format';
import type { ReportCategoryBreakdown } from '@/types/api';

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const OTHER_ID = '__other__';
const OTHER_COLOR = '#6b7280'; // gray-500 - khớp màu "gray" mặc định trong lib/categoryColors.ts
const OTHER_LABEL_THRESHOLD = 8; // % - lát nhỏ hơn mức này gộp chung vào "Khác" để nhãn ngoài không rối
const RADIAN = Math.PI / 180;

interface CategoryPieChartProps {
  data: ReportCategoryBreakdown[];
  totalLabel: string;
  insightPrefix: string;
  amountClassName: string;
}

// Gộp các danh mục chiếm tỷ lệ nhỏ vào 1 lát "Khác" để biểu đồ tròn không bị
// quá nhiều nhãn chi chít khi có nhiều danh mục cha.
function groupSmallSlices(data: ReportCategoryBreakdown[]): ReportCategoryBreakdown[] {
  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  const major = sorted.filter((d) => d.percent >= OTHER_LABEL_THRESHOLD);
  const minor = sorted.filter((d) => d.percent < OTHER_LABEL_THRESHOLD);

  if (minor.length <= 1) return sorted;

  const otherAmount = minor.reduce((sum, d) => sum + d.amount, 0);
  const otherPercent = Math.round(minor.reduce((sum, d) => sum + d.percent, 0) * 10) / 10;

  return [
    ...major,
    { categoryId: OTHER_ID, categoryName: `Khác (${minor.length} danh mục)`, amount: otherAmount, percent: otherPercent },
  ];
}

function renderOutwardLabel(colorByCategoryId: Map<string, string>) {
  return function OutwardLabel(props: PieLabelRenderProps) {
    const { cx, cy, midAngle, outerRadius, percent, payload } = props;
    const entry = payload as ReportCategoryBreakdown;
    if (!percent || percent < 0.03 || cx == null || cy == null || outerRadius == null || midAngle == null) return null;

    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = Number(cx) + Number(outerRadius) * cos;
    const sy = Number(cy) + Number(outerRadius) * sin;
    const mx = Number(cx) + (Number(outerRadius) + 14) * cos;
    const my = Number(cy) + (Number(outerRadius) + 14) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 12;
    const ey = my;
    const color = colorByCategoryId.get(entry.categoryId) ?? 'currentColor';

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={color} fill="none" />
        <text
          x={ex + (cos >= 0 ? 4 : -4)}
          y={ey}
          textAnchor={cos >= 0 ? 'start' : 'end'}
          dominantBaseline="central"
          fill={color}
          fontSize={12}
          fontWeight={600}
        >
          {`${entry.categoryName}: ${entry.percent}%`}
        </text>
      </g>
    );
  };
}

export function CategoryPieChart({ data, totalLabel, insightPrefix, amountClassName }: CategoryPieChartProps) {
  const grouped = groupSmallSlices(data);

  // Màu gán theo categoryId (không theo vị trí) để lát bánh, nhãn ngoài và
  // bảng chi tiết bên dưới luôn đồng bộ với nhau.
  const colorByCategoryId = new Map(
    grouped.map((d, i) => [d.categoryId, d.categoryId === OTHER_ID ? OTHER_COLOR : COLORS[i % COLORS.length]]),
  );
  const chartConfig: ChartConfig = Object.fromEntries(
    grouped.map((d) => [d.categoryId, { label: d.categoryName, color: colorByCategoryId.get(d.categoryId) }]),
  );

  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const top = data.reduce((max, d) => (d.amount > max.amount ? d : max), data[0]);

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground">
        {insightPrefix}{' '}
        <span className="font-semibold" style={{ color: colorByCategoryId.get(top.categoryId) ?? OTHER_COLOR }}>
          {top.categoryName}
        </span>{' '}
        · {formatCurrency(top.amount)} ({top.percent}%)
      </p>

      <div className="relative mx-auto aspect-[4/3] max-h-72 w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <PieChart margin={{ top: 24, right: 60, bottom: 24, left: 60 }}>
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="categoryId" />} />
            <Pie
              data={grouped}
              dataKey="amount"
              nameKey="categoryId"
              innerRadius={50}
              outerRadius={80}
              label={renderOutwardLabel(colorByCategoryId)}
              labelLine={false}
            >
              {grouped.map((entry) => (
                <Cell key={entry.categoryId} fill={colorByCategoryId.get(entry.categoryId)} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-muted-foreground">{totalLabel}</span>
          <span className="text-xs font-bold text-foreground">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-2">Danh mục</th>
              <th className="px-4 py-2 text-right">Số tiền</th>
              <th className="px-4 py-2 text-right">Tỷ lệ %</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((row) => (
              <tr key={row.categoryId} className="border-b last:border-b-0">
                <td className="px-4 py-2 font-medium text-foreground">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colorByCategoryId.get(row.categoryId) }}
                    />
                    {row.categoryName}
                  </span>
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${amountClassName}`}>
                  {formatCurrency(row.amount)}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                  {row.percent}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
