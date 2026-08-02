'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
import { EmptySelectItem } from '@/components/EmptySelectItem';
import { useGetCategoriesQuery } from '@/api/categoryApi';
import { useCreateTransactionMutation } from '@/api/transactionApi';
import { useGetWalletsQuery } from '@/api/walletApi';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Category, TransactionType, Wallet } from '@/types/api';

const TRANSACTION_TYPE_META: Record<
  TransactionType,
  { emoji: string; label: string; activeClass: string; submitClass: string }
> = {
  expense: {
    emoji: '🛍️',
    label: 'Chi tiêu',
    activeClass: 'border-destructive bg-destructive/10 text-destructive',
    submitClass: 'bg-destructive text-white hover:bg-destructive/80',
  },
  income: {
    emoji: '💰',
    label: 'Thu nhập',
    activeClass: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    submitClass: 'bg-amber-500 text-white hover:bg-amber-500/80',
  },
  transfer: {
    emoji: '🔄',
    label: 'Chuyển tiền',
    activeClass: 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    submitClass: 'bg-blue-500 text-white hover:bg-blue-500/80',
  },
};
const TRANSACTION_TYPE_ORDER: TransactionType[] = ['expense', 'income', 'transfer'];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWalletId?: string;
  onSuccess?: () => void;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  defaultWalletId,
  onSuccess,
}: TransactionFormDialogProps) {
  const { data: wallets } = useGetWalletsQuery();
  const { data: categories } = useGetCategoriesQuery();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Chỉ mount form khi dialog mở -> mỗi lần mở lại là 1 instance mới,
            state tự khởi tạo lại từ props, không cần effect để reset. */}
        {open && (
          <TransactionFormBody
            key={defaultWalletId ?? 'none'}
            wallets={wallets ?? []}
            categories={categories ?? []}
            defaultWalletId={defaultWalletId}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TransactionFormBody({
  wallets,
  categories,
  defaultWalletId,
  onOpenChange,
  onSuccess,
}: {
  wallets: Wallet[];
  categories: Category[];
  defaultWalletId?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [createTransaction, { isLoading: isSubmitting }] = useCreateTransactionMutation();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState(defaultWalletId ?? wallets[0]?.documentId ?? '');
  const [toWalletId, setToWalletId] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState(todayIsoDate);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toWalletOptions = wallets.filter((w) => w.documentId !== walletId);

  const onTypeChange = (value: TransactionType) => {
    setType(value);
    setParentCategoryId('');
    setCategoryId('');
  };

  // Danh mục cha chỉ để gom nhóm quản lý, không phải nơi ghi nhận giao dịch
  // thật - chỉ liệt kê cha còn con để chọn tiếp, danh mục con mới là giá trị
  // thực sự gửi lên API (assertAssignable ở BE chặn gán category cha).
  const parentCategories =
    type === 'transfer'
      ? []
      : categories.filter((c) => !c.parent && c.type === type && c.children.length > 0);
  const childCategories = parentCategoryId
    ? categories.filter((c) => c.parent?.documentId === parentCategoryId)
    : [];

  const onParentCategoryChange = (value: string) => {
    setParentCategoryId(value);
    setCategoryId('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount.replace(/,/g, ''));
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ.');
      return;
    }

    if (!walletId) {
      setError(type === 'transfer' ? 'Vui lòng chọn ví nguồn.' : 'Vui lòng chọn ví.');
      return;
    }

    if (type === 'transfer' && !toWalletId) {
      setError('Vui lòng chọn ví đích.');
      return;
    }

    if (type !== 'transfer' && !categoryId) {
      setError('Vui lòng chọn danh mục con.');
      return;
    }

    const toWallet = wallets.find((w) => w.documentId === toWalletId);

    try {
      await createTransaction({
        type,
        amount: parsedAmount,
        note: note.trim() || undefined,
        categoryId: type === 'transfer' ? undefined : categoryId,
        transactionDate: new Date(transactionDate).toISOString(),
        walletId,
        toWallet:
          type === 'transfer' && toWallet ? { id: toWallet.documentId, name: toWallet.name } : undefined,
      }).unwrap();
      toast.success('Đã thêm giao dịch.');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>Thêm giao dịch</DialogTitle>
        <DialogDescription>Ghi lại một khoản thu, chi hoặc chuyển khoản.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-3 gap-2">
          {TRANSACTION_TYPE_ORDER.map((value) => {
            const meta = TRANSACTION_TYPE_META[value];
            const active = type === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onTypeChange(value)}
                className={cn(
                  'flex flex-col items-center gap-1 border px-2 py-2.5 text-xs font-semibold transition-colors',
                  active ? meta.activeClass : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                <span className="text-lg">{meta.emoji}</span>
                {meta.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="transaction-amount">Số tiền *</Label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-sm text-muted-foreground">
              đ
            </span>
            <Input
              id="transaction-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="pl-4"
            />
          </div>
        </div>

        {wallets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Bạn cần tạo ví trước khi thêm giao dịch.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>{type === 'transfer' ? 'Từ ví *' : 'Chọn ví *'}</Label>
              <Select
                value={walletId}
                onValueChange={(value) => setWalletId(value ?? '')}
                items={wallets.map((w) => ({
                  value: w.documentId,
                  label: `${w.name} - Số dư: ${formatCurrency(w.balance)}`,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn ví" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.documentId} value={w.documentId}>
                      {`${w.name} - Số dư: ${formatCurrency(w.balance)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === 'transfer' && (
              <div className="space-y-1.5">
                <Label>Đến ví *</Label>
                <Select
                  value={toWalletId}
                  onValueChange={(value) => setToWalletId(value ?? '')}
                  items={toWalletOptions.map((w) => ({ value: w.documentId, label: w.name }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn ví đích" />
                  </SelectTrigger>
                  <SelectContent>
                    {toWalletOptions.length === 0 ? (
                      <EmptySelectItem />
                    ) : (
                      toWalletOptions.map((w) => (
                        <SelectItem key={w.documentId} value={w.documentId}>
                          {w.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        {type !== 'transfer' && (
          <>
            <div className="space-y-1.5">
              <Label>Danh mục cha (Cấp 1) *</Label>
              <Select
                value={parentCategoryId}
                onValueChange={(value) => onParentCategoryChange(value ?? '')}
                items={parentCategories.map((c) => ({ value: c.documentId, label: c.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn danh mục cha" />
                </SelectTrigger>
                <SelectContent>
                  {parentCategories.length === 0 ? (
                    <EmptySelectItem />
                  ) : (
                    parentCategories.map((c) => (
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
                onValueChange={(value) => setCategoryId(value ?? '')}
                items={childCategories.map((c) => ({ value: c.documentId, label: c.name }))}
                disabled={!parentCategoryId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn danh mục con" />
                </SelectTrigger>
                <SelectContent>
                  {childCategories.length === 0 ? (
                    <EmptySelectItem />
                  ) : (
                    childCategories.map((c) => (
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

        <div className="space-y-1.5">
          <Label htmlFor="transaction-date">Ngày thực hiện *</Label>
          <Input
            id="transaction-date"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="transaction-note">Ghi chú thêm</Label>
          <Input
            id="transaction-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Lương tháng 12"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button
          type="submit"
          disabled={isSubmitting}
          className={TRANSACTION_TYPE_META[type].submitClass}
        >
          {isSubmitting ? 'Đang lưu...' : 'Xác Nhận Tạo Giao Dịch'}
        </Button>
      </DialogFooter>
    </form>
  );
}
