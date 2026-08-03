'use client';

import { useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { NetCashFlowChart } from '@/components/NetCashFlowChart';
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

const CATEGORY_LEVEL_OPTIONS: { value: 'parent' | 'child'; label: string }[] = [
  { value: 'child', label: 'Danh mục con' },
  { value: 'parent', label: 'Danh mục cha' },
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
  const [categoryLevel, setCategoryLevel] = useState<'parent' | 'child'>('child');

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

  const { data: byExpenseCategory, isLoading: isLoadingExpenseCategory } = useGetReportByCategoryQuery(
    range ? { type: 'expense', from: range.from, to: range.to, walletId: effectiveWalletId } : skipToken,
  );

  const { data: byIncomeCategory, isLoading: isLoadingIncomeCategory } = useGetReportByCategoryQuery(
    range ? { type: 'income', from: range.from, to: range.to, walletId: effectiveWalletId } : skipToken,
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

  const netData = chartData.map((p) => ({ label: p.label, net: p.income - p.expense }));

  const avgIncome = summary?.length ? summary.reduce((s, p) => s + p.income, 0) / summary.length : 0;
  const avgExpense = summary?.length ? summary.reduce((s, p) => s + p.expense, 0) / summary.length : 0;
  const totalIncome = summary?.reduce((s, p) => s + p.income, 0) ?? 0;
  const totalExpense = summary?.reduce((s, p) => s + p.expense, 0) ?? 0;
  const netTotal = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netTotal / totalIncome) * 1000) / 10 : 0;

  const byExpenseBreakdown =
    categoryLevel === 'parent' ? groupByParentCategory(byExpenseCategory, categories) : (byExpenseCategory ?? []);
  const byIncomeBreakdown =
    categoryLevel === 'parent' ? groupByParentCategory(byIncomeCategory, categories) : (byIncomeCategory ?? []);

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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
        <Card>
          <CardContent className="py-2">
            <p className="text-sm text-muted-foreground">Tiết kiệm ròng</p>
            <p className={`mt-1 text-xl font-bold ${netTotal >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {formatCurrency(netTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2">
            <p className="text-sm text-muted-foreground">Tỷ lệ tiết kiệm</p>
            <p className={`mt-1 text-xl font-bold ${savingsRate >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {savingsRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thu chi theo thời gian</CardTitle>
          <CardDescription>Đối chiếu tổng thu nhập và chi tiêu qua các mốc thời gian</CardDescription>
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
          <CardTitle>Dòng tiền ròng theo thời gian</CardTitle>
          <CardDescription>Cột xanh là kỳ dư ra, cột đỏ là kỳ chi vượt thu</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSummary ? (
            <Skeleton className="aspect-video w-full" />
          ) : netData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Chưa có dữ liệu để hiển thị</p>
          ) : (
            <NetCashFlowChart data={netData} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Phân bổ theo danh mục</CardTitle>
            <CardDescription>Bạn hay chi cho danh mục gì, và tiền hay đến từ danh mục gì</CardDescription>
          </div>
          <SingleSelectToggle options={CATEGORY_LEVEL_OPTIONS} value={categoryLevel} onChange={setCategoryLevel} />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">Chi tiêu theo danh mục</p>
            {isLoadingExpenseCategory ? (
              <Skeleton className="aspect-video w-full" />
            ) : byExpenseBreakdown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Chưa có dữ liệu để hiển thị</p>
            ) : (
              <CategoryPieChart
                data={byExpenseBreakdown}
                totalLabel="Tổng chi"
                insightPrefix="Bạn chi nhiều nhất cho danh mục"
                amountClassName="text-destructive"
              />
            )}
          </div>

          <div className="flex flex-col gap-3 border-t pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <p className="text-sm font-semibold text-foreground">Thu nhập theo danh mục</p>
            {isLoadingIncomeCategory ? (
              <Skeleton className="aspect-video w-full" />
            ) : byIncomeBreakdown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Chưa có dữ liệu để hiển thị</p>
            ) : (
              <CategoryPieChart
                data={byIncomeBreakdown}
                totalLabel="Tổng thu"
                insightPrefix="Tiền của bạn đến nhiều nhất từ danh mục"
                amountClassName="text-emerald-600 dark:text-emerald-400"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>So sánh cùng kỳ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
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
        </CardContent>
      </Card>
    </div>
  );
}
