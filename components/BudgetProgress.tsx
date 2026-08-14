'use client';

import { Progress as ProgressPrimitive } from '@base-ui/react/progress';
import { ProgressIndicator, ProgressTrack } from '@/components/ui/progress';
import { useGetBudgetProgressQuery } from '@/api/budgetApi';
import { useGetWalletsQuery } from '@/api/walletApi';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { BudgetType } from '@/types/api';

export interface BudgetProgressInput {
  type: BudgetType;
  walletId: string;
  categoryId?: string | null;
  month?: number | null;
  year?: number | null;
  amountLimit: number;
}

export interface BudgetProgressResult {
  current: number;
  percent: number;
  isLoading: boolean;
}

export function useBudgetProgress({
  type,
  walletId,
  categoryId,
  month,
  year,
  amountLimit,
}: BudgetProgressInput): BudgetProgressResult {
  const resolvedMonth = month ?? new Date().getMonth() + 1;
  const resolvedYear = year ?? new Date().getFullYear();

  const { data: progress, isLoading: isProgressLoading } = useGetBudgetProgressQuery(
    { walletId, categoryId, month: resolvedMonth, year: resolvedYear },
    { skip: type !== 'expense' },
  );
  const { data: wallets, isLoading: isWalletsLoading } = useGetWalletsQuery(undefined, {
    skip: type !== 'income',
  });

  if (type === 'income') {
    const balance = wallets?.find((w) => w.documentId === walletId)?.balance ?? 0;
    const percent = amountLimit > 0 ? Math.round((balance / amountLimit) * 100) : 0;
    return { current: balance, percent, isLoading: isWalletsLoading };
  }

  // Đã chi / % do BE tính (budget.services.calculateSpent) - không duplicate
  // logic sang client nữa. active:false => không có budget áp dụng -> 0%.
  const current = progress?.spent ?? 0;
  const percent = progress?.percent ?? 0;
  return { current, percent, isLoading: isProgressLoading || progress === undefined };
}

export function getBudgetToneClasses(type: BudgetType, percent: number) {
  if (type === 'income') {
    if (percent >= 100) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
    if (percent >= 80) return { bar: 'bg-amber-500', text: 'text-amber-600' };
    return { bar: 'bg-primary', text: 'text-muted-foreground' };
  }
  if (percent >= 100) return { bar: 'bg-destructive', text: 'text-destructive' };
  if (percent >= 80) return { bar: 'bg-amber-500', text: 'text-amber-600' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
}

type BudgetProgressProps = BudgetProgressInput;

export function BudgetProgress(props: BudgetProgressProps) {
  const { amountLimit, type } = props;
  const { current, percent, isLoading } = useBudgetProgress(props);

  if (isLoading) {
    return <div className="h-1 w-full animate-pulse bg-muted" />;
  }

  const tone = getBudgetToneClasses(type, percent);

  return (
    <div className="space-y-1.5">
      {/* balance ví có thể âm (chi vượt số dư) -> percent có thể âm, progress
          bar vẫn phải kẹp về [0, 100] để hiển thị hợp lệ dù % thật (chưa kẹp)
          vẫn được dùng nguyên cho badge trạng thái/logic cảnh báo bên trên. */}
      <ProgressPrimitive.Root value={Math.max(0, Math.min(percent, 100))} className="w-full">
        <ProgressTrack>
          <ProgressIndicator className={tone.bar} />
        </ProgressTrack>
      </ProgressPrimitive.Root>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs">
        <span className="text-muted-foreground">
          {type === 'income' ? 'Đã tích lũy' : 'Đã tiêu'}: <span className="font-medium text-foreground">{formatCurrency(current)}</span>
          {' '}· Hạn mức: <span className="font-medium text-foreground">{formatCurrency(amountLimit)}</span>
        </span>
        <span className={cn('font-semibold', tone.text)}>{percent}%</span>
      </div>
    </div>
  );
}
