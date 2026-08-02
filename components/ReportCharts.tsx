'use client';

import { useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetCategoriesQuery } from '@/api/categoryApi';
import { useGetReportByCategoryQuery, useGetReportCompareQuery, useGetReportSummaryQuery } from '@/api/reportApi';
import { useGetWalletsQuery } from '@/api/walletApi';
import { CategoryPieChart } from '@/components/CategoryPieChart';
import { IncomeExpenseBarChart } from '@/components/IncomeExpenseBarChart';
import { SingleSelectToggle } from '@/components/SingleSelectToggle';
import { formatCurrency } from '@/lib/format';
import { formatPeriodLabel } from '@/lib/reportDates';
import type { Category, ReportCategoryBreakdown, ReportGranularity } from '@/types/api';

const ALL_WALLETS = '__all__';

const GRANULARITY_OPTIONS: { value: ReportGranularity; label: string }[] = [
  { value: 'day', label: 'Ngày' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
];

const COMPARE_OPTIONS: { value: 'previous_month' | 'previous_year'; label: string }[] = [
  { value: 'previous_month', label: 'So với tháng trước' },
  { value: 'previous_year', label: 'So với cùng kỳ năm trước' },
];

const CATEGORY_TYPE_OPTIONS: { value: 'expense' | 'income'; label: string }[] = [
  { value: 'expense', label: 'Chi tiêu' },
  { value: 'income', label: 'Thu nhập' },
];

const pad2 = (n: number) => String(n).padStart(2, '0');

function defaultInputsFor(granularity: ReportGranularity) {
  const now = new Date();

  if (granularity === 'day') {
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return { from, to };
  }

  if (granularity === 'year') {
    const y = now.getFullYear();
    return { from: String(y - 4), to: String(y) };
  }

  const to = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const from = `${sixAgo.getFullYear()}-${pad2(sixAgo.getMonth() + 1)}`;
  return { from, to };
}

function resolveRange(granularity: ReportGranularity, fromInput: string, toInput: string) {
  if (!fromInput || !toInput) return null;

  if (granularity === 'day') {
    const from = new Date(`${fromInput}T00:00:00Z`);
    const to = new Date(`${toInput}T23:59:59Z`);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  if (granularity === 'year') {
    const fy = Number(fromInput);
    const ty = Number(toInput);
    if (!Number.isInteger(fy) || !Number.isInteger(ty)) return null;
    return {
      from: new Date(Date.UTC(fy, 0, 1)).toISOString(),
      to: new Date(Date.UTC(ty, 11, 31, 23, 59, 59)).toISOString(),
    };
  }

  const [fy, fm] = fromInput.split('-').map(Number);
  const [ty, tm] = toInput.split('-').map(Number);
  if (!fy || !fm || !ty || !tm) return null;

  return {
    from: new Date(Date.UTC(fy, fm - 1, 1)).toISOString(),
    to: new Date(Date.UTC(ty, tm, 0, 23, 59, 59)).toISOString(),
  };
}

// byCategory trả về từ BE nhóm theo danh mục CON (mỗi transaction chỉ gắn 1
// categoryId là con) - gộp lại theo tên danh mục CHA để hiển thị trực quan
// hơn ở chart tròn + bảng chi tiết bên dưới.
function groupByParentCategory(
  byCategory: ReportCategoryBreakdown[] | undefined,
  categories: Category[] | undefined,
): ReportCategoryBreakdown[] {
  if (!byCategory || byCategory.length === 0) return [];

  const catById = new Map((categories ?? []).map((c) => [c.documentId, c]));
  const totals = new Map<string, number>();
  const order: string[] = [];

  for (const item of byCategory) {
    const groupName = catById.get(item.categoryId)?.parent?.name ?? item.categoryName;
    if (!totals.has(groupName)) {
      totals.set(groupName, 0);
      order.push(groupName);
    }
    totals.set(groupName, totals.get(groupName)! + item.amount);
  }

  const totalAmount = Array.from(totals.values()).reduce((sum, v) => sum + v, 0);

  return order.map((groupName) => {
    const amount = totals.get(groupName)!;
    return {
      categoryId: groupName,
      categoryName: groupName,
      amount,
      percent: totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0,
    };
  });
}

export function ReportCharts() {
  const { data: wallets } = useGetWalletsQuery();
  const { data: categories } = useGetCategoriesQuery();

  const [granularity, setGranularity] = useState<ReportGranularity>('month');
  const [walletId, setWalletId] = useState(ALL_WALLETS);
  const [{ from, to }, setInputs] = useState(defaultInputsFor('month'));
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');

  const now = new Date();
  const [compareMonth, setCompareMonth] = useState(now.getMonth() + 1);
  const [compareYear, setCompareYear] = useState(now.getFullYear());
  const [compareWith, setCompareWith] = useState<'previous_month' | 'previous_year'>('previous_month');

  const onGranularityChange = (g: ReportGranularity) => {
    setGranularity(g);
    setInputs(defaultInputsFor(g));
  };

  const range = resolveRange(granularity, from, to);
  const effectiveWalletId = walletId === ALL_WALLETS ? undefined : walletId;

  const { data: summary, isLoading: isLoadingSummary } = useGetReportSummaryQuery(
    range ? { granularity, from: range.from, to: range.to, walletId: effectiveWalletId } : skipToken,
  );

  const { data: byCategory, isLoading: isLoadingCategory } = useGetReportByCategoryQuery(
    range ? { type: categoryType, from: range.from, to: range.to, walletId: effectiveWalletId } : skipToken,
  );

  const { data: compareResult, isLoading: isLoadingCompare } = useGetReportCompareQuery({
    month: compareMonth,
    year: compareYear,
    compareWith,
    walletId: effectiveWalletId,
  });

  const chartData = (summary ?? []).map((p) => ({
    label: formatPeriodLabel(p.period),
    income: p.income,
    expense: p.expense,
  }));

  const avgIncome = summary?.length ? summary.reduce((s, p) => s + p.income, 0) / summary.length : 0;
  const avgExpense = summary?.length ? summary.reduce((s, p) => s + p.expense, 0) / summary.length : 0;

  const byParentCategory = groupByParentCategory(byCategory, categories);

  const compareMonthInput = `${compareYear}-${pad2(compareMonth)}`;
  const onCompareMonthInputChange = (value: string) => {
    const [y, m] = value.split('-').map(Number);
    if (y && m) {
      setCompareYear(y);
      setCompareMonth(m);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Xem theo</Label>
            <SingleSelectToggle options={GRANULARITY_OPTIONS} value={granularity} onChange={onGranularityChange} />
          </div>

          <div className="space-y-1.5">
            <Label>Ví</Label>
            <Select
              value={walletId}
              onValueChange={(v) => v && setWalletId(v)}
              items={[
                { value: ALL_WALLETS, label: 'Tất cả ví' },
                ...(wallets ?? []).map((w) => ({ value: w.documentId, label: w.name })),
              ]}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_WALLETS}>Tất cả ví</SelectItem>
                {(wallets ?? []).map((w) => (
                  <SelectItem key={w.documentId} value={w.documentId}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Từ</Label>
            {granularity === 'year' ? (
              <input
                type="number"
                value={from}
                onChange={(e) => setInputs((s) => ({ ...s, from: e.target.value }))}
                className="h-9 w-28 rounded-md border border-input bg-transparent px-3 text-sm"
              />
            ) : (
              <input
                type={granularity === 'day' ? 'date' : 'month'}
                value={from}
                onChange={(e) => setInputs((s) => ({ ...s, from: e.target.value }))}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm uppercase"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Đến</Label>
            {granularity === 'year' ? (
              <input
                type="number"
                value={to}
                onChange={(e) => setInputs((s) => ({ ...s, to: e.target.value }))}
                className="h-9 w-28 rounded-md border border-input bg-transparent px-3 text-sm"
              />
            ) : (
              <input
                type={granularity === 'day' ? 'date' : 'month'}
                value={to}
                onChange={(e) => setInputs((s) => ({ ...s, to: e.target.value }))}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm uppercase"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-2">
            <p className="text-sm text-muted-foreground">Thu trung bình / kỳ</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">{formatCurrency(avgIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2">
            <p className="text-sm text-muted-foreground">Chi trung bình / kỳ</p>
            <p className="mt-1 text-xl font-bold text-destructive">{formatCurrency(avgExpense)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thu chi theo thời gian</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSummary ? (
            <Skeleton className="aspect-video w-full" />
          ) : chartData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Chưa có dữ liệu để hiển thị</p>
          ) : (
            <IncomeExpenseBarChart data={chartData} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thống Kê Trực Quan Phân Bổ Chi Tiêu &amp; So Sánh Cùng Kỳ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">Phân bổ theo danh mục</p>
              <SingleSelectToggle options={CATEGORY_TYPE_OPTIONS} value={categoryType} onChange={setCategoryType} />
            </div>

            {isLoadingCategory ? (
              <Skeleton className="aspect-video w-full" />
            ) : byParentCategory.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Chưa có dữ liệu để hiển thị</p>
            ) : (
              <>
                <CategoryPieChart data={byParentCategory} />

                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                        <th className="px-4 py-2">Danh mục cha</th>
                        <th className="px-4 py-2 text-right">Số tiền đã chi</th>
                        <th className="px-4 py-2 text-right">Tỷ lệ % chi chiếm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byParentCategory.map((row) => (
                        <tr key={row.categoryId} className="border-b last:border-b-0">
                          <td className="px-4 py-2 font-medium text-foreground">{row.categoryName}</td>
                          <td className="px-4 py-2 text-right text-foreground">{formatCurrency(row.amount)}</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{row.percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t pt-6">
            <p className="text-sm font-semibold text-foreground">So sánh cùng kỳ</p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label>Tháng</Label>
                <input
                  type="month"
                  value={compareMonthInput}
                  onChange={(e) => onCompareMonthInputChange(e.target.value)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm uppercase"
                />
              </div>
              <SingleSelectToggle options={COMPARE_OPTIONS} value={compareWith} onChange={setCompareWith} />
            </div>

            {isLoadingCompare ? (
              <Skeleton className="aspect-video w-full" />
            ) : !compareResult ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Chưa có dữ liệu để hiển thị</p>
            ) : (
              <IncomeExpenseBarChart
                data={[
                  {
                    label: compareResult.previous.label,
                    income: compareResult.previous.income,
                    expense: compareResult.previous.expense,
                  },
                  {
                    label: compareResult.current.label,
                    income: compareResult.current.income,
                    expense: compareResult.current.expense,
                  },
                ]}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
