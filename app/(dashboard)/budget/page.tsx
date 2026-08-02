'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  BellIcon,
  PencilSimpleIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
  TrophyIcon,
  WalletIcon,
} from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteBudgetMutation, useGetBudgetsQuery } from '@/api/budgetApi';
import { BudgetFormDialog } from '@/components/BudgetFormDialog';
import { BudgetProgress, useBudgetProgress } from '@/components/BudgetProgress';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import type { Budget, BudgetType } from '@/types/api';

function budgetStatusMeta(type: BudgetType, percent: number) {
  if (type === 'income') {
    if (percent >= 100) {
      return { label: 'Đã đạt mục tiêu', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600' };
    }
    if (percent >= 80) {
      return { label: 'Sắp đạt mục tiêu', className: 'border-amber-500/40 bg-amber-500/10 text-amber-600' };
    }
    return { label: 'Đang tích lũy', className: 'border-border bg-muted text-muted-foreground' };
  }
  if (percent >= 100) {
    return { label: 'Vượt mức', className: 'border-destructive/40 bg-destructive/10 text-destructive' };
  }
  if (percent >= 80) {
    return { label: 'Cảnh báo', className: 'border-amber-500/40 bg-amber-500/10 text-amber-600' };
  }
  return { label: 'An toàn', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600' };
}

function BudgetStatusBadge({ budget }: { budget: Budget }) {
  const { percent, isLoading } = useBudgetProgress({
    type: budget.type,
    walletId: budget.walletId?.documentId ?? '',
    categoryId: budget.categoryId?.documentId ?? null,
    month: budget.periodMonth,
    year: budget.periodYear,
    amountLimit: budget.amountLimit,
  });

  if (!budget.walletId || isLoading) return null;

  const meta = budgetStatusMeta(budget.type, percent);
  return <Badge className={cn('border px-2 py-0.5', meta.className)}>{meta.label}</Badge>;
}

function budgetName(budget: Budget) {
  if (budget.name) return budget.name;
  if (budget.type === 'income') return 'Quỹ tích lũy';
  return budget.categoryId ? budget.categoryId.name : 'Toàn bộ ví';
}

export default function BudgetPage() {
  const { data: budgets, isLoading } = useGetBudgetsQuery();
  const [deleteBudget] = useDeleteBudgetMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);

  const openCreate = () => {
    setEditingBudget(undefined);
    setFormOpen(true);
  };

  const openEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!deletingBudget) return;
    try {
      await deleteBudget(deletingBudget.documentId).unwrap();
      toast.success('Đã xóa ngân sách.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Xóa ngân sách thất bại.'));
    } finally {
      setDeletingBudget(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge className="border border-primary/30 bg-primary/10 px-2 py-1 text-primary">
                Quản lý hạn mức
              </Badge>
              <CardTitle>Ngân Sách Chi Tiêu & Cảnh Báo Push Notification</CardTitle>
              <CardDescription>
                Đặt hạn mức chi tiêu theo ví, theo danh mục hoặc mục tiêu tích lũy cho từng ví.
              </CardDescription>
            </div>
            <Button onClick={openCreate}>
              <PlusIcon />
              Tạo Ngân Sách Mới
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="flex items-start gap-3 border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <BellIcon className="mt-0.5 size-5 shrink-0 text-amber-600" weight="fill" />
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">Cơ chế Cảnh báo Tự động (&gt;80%)</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Mỗi khi giao dịch mới làm ngân sách chạm hoặc vượt mốc 80% hạn mức đã đặt, hệ thống sẽ tự động gửi Push
            Notification để bạn kịp kiểm soát chi tiêu.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !budgets || budgets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Chưa có ngân sách nào. Tạo ngân sách để nhận cảnh báo khi chi tiêu sắp vượt hạn mức.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {budgets.map((budget) => (
            <Card key={budget.documentId}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {budget.type === 'income' && <TrophyIcon className="size-4 text-amber-500" weight="fill" />}
                      <p className="text-sm font-semibold text-foreground">{budgetName(budget)}</p>
                      <BudgetStatusBadge budget={budget} />
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <WalletIcon className="size-3.5" />
                      Ví áp dụng: {budget.walletId?.name ?? '—'}
                    </p>
                    {budget.type === 'expense' && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TagIcon className="size-3.5" />
                        Danh mục: {budget.categoryId ? budget.categoryId.name : 'Tất cả chi tiêu'}
                        {' · '}Tháng {budget.periodMonth}/{budget.periodYear}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(budget)}>
                      <PencilSimpleIcon />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeletingBudget(budget)}>
                      <TrashIcon className="text-destructive" />
                    </Button>
                  </div>
                </div>

                {budget.walletId && (
                  <BudgetProgress
                    type={budget.type}
                    walletId={budget.walletId.documentId}
                    categoryId={budget.categoryId?.documentId ?? null}
                    month={budget.periodMonth}
                    year={budget.periodYear}
                    amountLimit={budget.amountLimit}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BudgetFormDialog open={formOpen} onOpenChange={setFormOpen} budget={editingBudget} />

      <AlertDialog open={!!deletingBudget} onOpenChange={(open) => !open && setDeletingBudget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ngân sách này?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
