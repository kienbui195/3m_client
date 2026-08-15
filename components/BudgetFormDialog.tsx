'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { BellIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetCategoriesQuery } from '@/api/categoryApi';
import { useCreateBudgetMutation, useUpdateBudgetMutation } from '@/api/budgetApi';
import { useGetWalletsQuery } from '@/api/walletApi';
import { EmptySelectItem } from '@/components/EmptySelectItem';
import { SingleSelectToggle } from '@/components/SingleSelectToggle';
import { getErrorMessage } from '@/lib/errors';
import type { Budget, BudgetType } from '@/types/api';
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 1 + i);

const BUDGET_TYPE_OPTIONS: { value: BudgetType; label: string }[] = [
  { value: 'expense', label: 'Hạn mức chi tiêu' },
  { value: 'income', label: 'Quỹ tích lũy' },
];

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget;
  onSuccess?: () => void;
}

export function BudgetFormDialog({ open, onOpenChange, budget, onSuccess }: BudgetFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col">
        {open && (
          <BudgetFormBody
            key={budget?.documentId ?? 'create'}
            budget={budget}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BudgetFormBody({
  budget,
  onOpenChange,
  onSuccess,
}: {
  budget?: Budget;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(budget);
  const { data: wallets } = useGetWalletsQuery();
  const { data: categories } = useGetCategoriesQuery();
  const [createBudget, { isLoading: isCreating }] = useCreateBudgetMutation();
  const [updateBudget, { isLoading: isUpdating }] = useUpdateBudgetMutation();
  const isSubmitting = isCreating || isUpdating;

  const [name, setName] = useState(budget?.name ?? '');

  // Khi sửa: tìm danh mục cha từ cây danh mục (budget.categoryId không populate
  // parent, nhưng query categories thì có).
  const existingCategory = budget?.categoryId
    ? (categories ?? []).find((c) => c.documentId === budget.categoryId?.documentId)
    : undefined;
  const existingParentId = existingCategory?.parent?.documentId ?? '';

  const [type, setType] = useState<BudgetType>(budget?.type ?? 'expense');
  const [walletId, setWalletId] = useState(budget?.walletId?.documentId ?? '');
  const [categoryScope, setCategoryScope] = useState<'all' | 'category'>(budget?.categoryId ? 'category' : 'all');
  const [parentCategoryId, setParentCategoryId] = useState(existingParentId);
  const [categoryId, setCategoryId] = useState(budget?.categoryId?.documentId ?? '');
  const [amountLimit, setAmountLimit] = useState(budget ? String(budget.amountLimit) : '');
  const [periodMonth, setPeriodMonth] = useState(String(budget?.periodMonth ?? new Date().getMonth() + 1));
  const [periodYear, setPeriodYear] = useState(String(budget?.periodYear ?? CURRENT_YEAR));
  const [error, setError] = useState<string | null>(null);

  // Ngân sách chỉ theo dõi chi tiêu nên lọc bớt danh mục thu nhập; chỉ chọn
  // được danh mục con (cha chỉ để gom nhóm quản lý, giao dịch không gán vào đó).
  const expenseParents = (categories ?? []).filter(
    (c) => !c.parent && c.type === 'expense' && c.children.length > 0,
  );
  const expenseChildren = parentCategoryId
    ? (categories ?? []).filter((c) => c.parent?.documentId === parentCategoryId)
    : [];

  const onTypeChange = (value: BudgetType) => {
    setType(value);
    // Quỹ tích lũy chỉ áp dụng toàn ví, không theo category/tháng - reset lại
    // lựa chọn danh mục cho khỏi gây hiểu nhầm.
    if (value === 'income') {
      setCategoryScope('all');
      setParentCategoryId('');
      setCategoryId('');
    }
  };

  const onParentCategoryChange = (value: string) => {
    setParentCategoryId(value);
    setCategoryId('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amountLimit.replace(/,/g, ''));
    if (!amountLimit || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Vui lòng nhập hạn mức hợp lệ.');
      return;
    }

    if (!walletId) {
      setError('Vui lòng chọn ví.');
      return;
    }

    if (type === 'expense' && categoryScope === 'category' && !categoryId) {
      setError('Vui lòng chọn danh mục con.');
      return;
    }

    const body = {
      name: name.trim() ? name.trim() : undefined,
      type,
      walletId,
      categoryId: type === 'income' || categoryScope === 'all' ? null : categoryId,
      amountLimit: parsedAmount,
      periodMonth: type === 'income' ? null : Number(periodMonth),
      periodYear: type === 'income' ? null : Number(periodYear),
    };

    try {
      if (isEdit && budget) {
        await updateBudget({ documentId: budget.documentId, data: body }).unwrap();
        toast.success('Đã cập nhật ngân sách.');
      } else {
        await createBudget(body).unwrap();
        toast.success('Đã tạo ngân sách.');
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Chỉnh Sửa Ngân Sách' : 'Tạo Ngân Sách Mới'}</DialogTitle>
        <DialogDescription>
          {type === 'income'
            ? 'Đặt mục tiêu tích lũy cho 1 ví - tiến độ tính theo số dư ví hiện tại, không reset theo tháng.'
            : 'Đặt hạn mức chi tiêu cho 1 ví (hoặc 1 danh mục cụ thể trong ví) theo tháng.'}
        </DialogDescription>
      </DialogHeader>

      {/* Header cố định đến hết Loại ngân sách */}
      <div className="space-y-1.5">
        <Label>Loại ngân sách</Label>
        <SingleSelectToggle options={BUDGET_TYPE_OPTIONS} value={type} onChange={onTypeChange} />
      </div>

      {/* Phần giữa scroll được, từ Tên ngân sách đến khung cảnh báo */}
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1">
        <div className="space-y-1.5">
          <Label htmlFor="budget-name">Tên ngân sách (tùy chọn)</Label>
          <Input
            id="budget-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Hạn mức Ăn uống MoMo hàng tháng..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Áp dụng cho ví *</Label>
          <Select
            value={walletId}
            onValueChange={(v) => setWalletId(v ?? '')}
            items={(wallets ?? []).map((w) => ({ value: w.documentId, label: w.name }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn ví" />
            </SelectTrigger>
            <SelectContent>
              {(wallets ?? []).map((w) => (
                <SelectItem key={w.documentId} value={w.documentId}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {type === 'expense' && (
          <>
            <div className="space-y-1.5">
              <Label>Phạm vi áp dụng</Label>
              <SingleSelectToggle
                options={[
                  { value: 'all', label: 'Toàn bộ ví' },
                  { value: 'category', label: 'Theo danh mục cụ thể' },
                ]}
                value={categoryScope}
                onChange={setCategoryScope}
              />
            </div>

            {categoryScope === 'category' && (
              <>
                <div className="space-y-1.5">
                  <Label>Danh mục cha (Cấp 1) *</Label>
                  <Select
                    value={parentCategoryId}
                    onValueChange={(v) => onParentCategoryChange(v ?? '')}
                    items={expenseParents.map((c) => ({ value: c.documentId, label: c.name }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn danh mục cha" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseParents.length === 0 ? (
                        <EmptySelectItem />
                      ) : (
                        expenseParents.map((c) => (
                          <SelectItem key={c.documentId} value={c.documentId}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Danh mục con (Cấp 2) *</Label>
                  <Select
                    value={categoryId}
                    onValueChange={(v) => setCategoryId(v ?? '')}
                    items={expenseChildren.map((c) => ({ value: c.documentId, label: c.name }))}
                    disabled={!parentCategoryId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn danh mục con" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseChildren.length === 0 ? (
                        <EmptySelectItem />
                      ) : (
                        expenseChildren.map((c) => (
                          <SelectItem key={c.documentId} value={c.documentId}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="budget-amount">
            {type === 'income' ? 'Mục tiêu tích lũy (đ) *' : 'Hạn mức chi tiêu tối đa (đ) *'}
          </Label>
          <Input
            id="budget-amount"
            inputMode="numeric"
            value={amountLimit}
            onChange={(e) => setAmountLimit(e.target.value)}
            placeholder="0"
          />
        </div>

        {type === 'expense' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tháng</Label>
              <Select
                value={periodMonth}
                onValueChange={(v) => v && setPeriodMonth(v)}
                items={MONTHS.map((m) => ({ value: String(m), label: `Tháng ${m}` }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      Tháng {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Năm</Label>
              <Select
                value={periodYear}
                onValueChange={(v) => v && setPeriodYear(v)}
                items={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <BellIcon className="mt-0.5 size-5 shrink-0 text-amber-600" weight="fill" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Hệ thống sẽ tự động gửi cảnh báo Push Notification khi tổng chi tiêu cho ví và danh mục này vượt quá 80%
            hạn mức đã đặt!
          </p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Khởi Tạo Ngân Sách'}
        </Button>
      </DialogFooter>
    </form>
  );
}
