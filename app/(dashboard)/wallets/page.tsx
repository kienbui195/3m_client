'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  BankIcon,
  CheckCircleIcon,
  CreditCardIcon,
  DeviceMobileIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  MoneyIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetCategoriesQuery } from '@/api/categoryApi';
import { useDeleteTransactionMutation } from '@/api/transactionApi';
import { useDeleteWalletMutation, useGetWalletQuery, useGetWalletsQuery } from '@/api/walletApi';
import { CategoryIconView } from '@/components/CategoryIconView';
import { TransactionFormDialog } from '@/components/TransactionFormDialog';
import { WalletFormDialog } from '@/components/WalletFormDialog';
import { getCategoryColorClass } from '@/lib/categoryColors';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency, TRANSACTION_TYPE_LABEL, WALLET_TYPE_LABEL } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Transaction, TransactionType, WalletType } from '@/types/api';

const WALLET_TYPE_ICON: Record<WalletType, typeof BankIcon> = {
  bank: BankIcon,
  ewallet: DeviceMobileIcon,
  card: CreditCardIcon,
  cash: MoneyIcon,
};

const WALLET_TYPE_COLOR: Record<WalletType, string> = {
  bank: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  ewallet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  card: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  cash: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

const TRANSACTION_COLOR: Record<Transaction['type'], string> = {
  income: 'text-emerald-600',
  expense: 'text-destructive',
  transfer: 'text-muted-foreground',
};

// Màu định danh riêng cho từng ví (khác với WALLET_TYPE_COLOR - đó là màu
// theo LOẠI ví bank/cash/card/ewallet). Gán tuần hoàn theo vị trí trong danh
// sách đã sắp xếp, dùng làm border-left của thẻ ví + nền (bản light) cho
// panel chi tiết ví đang chọn.
const WALLET_IDENTITY_PALETTE = [
  { border: 'border-l-red-700 dark:border-l-red-500', bg: 'bg-red-100 dark:bg-red-950/40' },
  { border: 'border-l-blue-700 dark:border-l-blue-500', bg: 'bg-blue-100 dark:bg-blue-950/40' },
  { border: 'border-l-yellow-500 dark:border-l-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-950/40' },
  { border: 'border-l-emerald-700 dark:border-l-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950/40' },
  { border: 'border-l-violet-700 dark:border-l-violet-500', bg: 'bg-violet-100 dark:bg-violet-950/40' },
  { border: 'border-l-pink-700 dark:border-l-pink-500', bg: 'bg-pink-100 dark:bg-pink-950/40' },
  { border: 'border-l-teal-700 dark:border-l-teal-500', bg: 'bg-teal-100 dark:bg-teal-950/40' },
  { border: 'border-l-orange-700 dark:border-l-orange-500', bg: 'bg-orange-100 dark:bg-orange-950/40' },
];

function getWalletIdentityColor(position: number) {
  return WALLET_IDENTITY_PALETTE[position % WALLET_IDENTITY_PALETTE.length];
}

type TypeFilter = TransactionType | 'all';
type TimeFilter = 'all' | 'this' | 'last';

const ALL_TYPE = 'all';
const ALL_CATEGORY = '__all__';
const UNCATEGORIZED = '__uncategorized__';
const TX_PAGE_SIZE = 20;

export default function WalletsPage() {
  return (
    <Suspense fallback={<WalletsPageSkeleton />}>
      <WalletsPageContent />
    </Suspense>
  );
}

function WalletsPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Skeleton className="h-24 w-full" />
      <div className="flex flex-row gap-4 overflow-x-auto pb-1">
        <Skeleton className="h-28 w-56 shrink-0" />
        <Skeleton className="h-28 w-56 shrink-0" />
        <Skeleton className="h-28 w-56 shrink-0" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function WalletsPageContent() {
  const searchParams = useSearchParams();
  const paramSelected = searchParams.get('selected');
  const { data: wallets, isLoading } = useGetWalletsQuery();
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const sortedWallets = [...(wallets ?? [])].sort((a, b) => a.index - b.index);
  const candidateId = selectedWalletId ?? paramSelected;
  const activeWallet = candidateId ? sortedWallets.find((w) => w.documentId === candidateId) : undefined;
  const activeWalletId = activeWallet?.documentId ?? sortedWallets[0]?.documentId ?? null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Quản Lý Ví &amp; Nguồn Tiền ({sortedWallets.length})
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Theo dõi số dư và lịch sử giao dịch của từng ví, tài khoản ngân hàng, thẻ.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Tạo Ví Mới
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-row gap-4 overflow-x-auto pb-1">
          <Skeleton className="h-28 w-56 shrink-0" />
          <Skeleton className="h-28 w-56 shrink-0" />
          <Skeleton className="h-28 w-56 shrink-0" />
        </div>
      ) : sortedWallets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Chưa có ví nào. Nhấn &quot;Tạo Ví Mới&quot; để bắt đầu.
          </CardContent>
        </Card>
      ) : (
        // Carousel (shadcn/ui, dựng trên embla-carousel-react) thay vì grid -
        // nhiều ví xếp lưới sẽ kéo trang rất dài, khó tập trung vào ví đang
        // xem chi tiết bên dưới. Embla tự xử lý kéo/trượt bằng JS transform,
        // không dùng overflow-x CSS nên không bị lỗi tràn cuộn ra cả trang
        // như cách làm thủ công trước đó.
        <Carousel opts={{ align: 'start', dragFree: true }} className="w-full">
          <CarouselContent>
            {sortedWallets.map((wallet, position) => {
              const Icon = WALLET_TYPE_ICON[wallet.type];
              const active = wallet.documentId === activeWalletId;
              const identityColor = getWalletIdentityColor(position);
              return (
                <CarouselItem key={wallet.documentId} className="basis-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedWalletId(wallet.documentId)}
                    className={cn(
                      'relative flex w-56 flex-col gap-3 border-y overflow-hidden border-r border-border border-l-4 bg-card p-4 text-left transition-colors hover:bg-muted/50',
                      identityColor.border,
                      active && 'ring-2 ring-foreground/20',
                    )}
                  >
                    {active && (
                      <CheckCircleIcon
                        weight="fill"
                        className="absolute top-2 right-2 size-5 text-foreground/70"
                      />
                    )}
                    <div className={cn('flex size-10 items-center justify-center rounded-full', WALLET_TYPE_COLOR[wallet.type])}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{wallet.name}</p>
                      <p className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                        {WALLET_TYPE_LABEL[wallet.type]}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Số dư hiện tại</p>
                      <p className="text-base font-bold text-foreground">{formatCurrency(wallet.balance)}</p>
                    </div>
                  </button>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="left-2 border-none bg-background/90 shadow-md" />
          <CarouselNext className="right-2 border-none bg-background/90 shadow-md" />
        </Carousel>
      )}

      {activeWalletId ? (
        <WalletDetailPanel
          key={activeWalletId}
          walletId={activeWalletId}
          identityColor={getWalletIdentityColor(sortedWallets.findIndex((w) => w.documentId === activeWalletId))}
        />
      ) : null}

      <WalletFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function WalletDetailPanel({
  walletId,
  identityColor,
}: {
  walletId: string;
  identityColor: { border: string; bg: string };
}) {
  const { data: wallet, isLoading } = useGetWalletQuery(walletId);
  const { data: categories } = useGetCategoriesQuery();
  const [deleteWallet, { isLoading: isDeleting }] = useDeleteWalletMutation();
  const [deleteTransaction, { isLoading: isDeletingTx }] = useDeleteTransactionMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [visibleCount, setVisibleCount] = useState(TX_PAGE_SIZE);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(ALL_TYPE);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORY);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const onDelete = async () => {
    if (!wallet) return;
    try {
      await deleteWallet(wallet.documentId).unwrap();
      toast.success('Đã xóa ví.');
      setConfirmDeleteOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Xóa ví thất bại, vui lòng thử lại.'));
    }
  };

  const onDeleteTx = async () => {
    if (!deletingTx) return;
    try {
      await deleteTransaction({
        documentId: deletingTx.documentId,
        walletId: deletingTx.walletId?.documentId,
        toWalletId: deletingTx.toWallet?.id,
      }).unwrap();
      toast.success('Đã xóa giao dịch.');
      setDeletingTx(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Xóa giao dịch thất bại, vui lòng thử lại.'));
    }
  };

  if (isLoading || !wallet) {
    return <Skeleton className="h-96 w-full" />;
  }

  const totalIncome = wallet.transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = wallet.transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const usedCategoryIds = new Set(
    wallet.transactions.map((t) => t.categoryId?.documentId).filter((id): id is string => Boolean(id)),
  );
  const filterableCategories = (categories ?? []).filter(
    (c) => c.parent && usedCategoryIds.has(c.documentId),
  );
  const categoryByDocumentId = new Map((categories ?? []).map((c) => [c.documentId, c]));

  const now = new Date();
  const isInTimeRange = (dateStr: string | null) => {
    if (timeFilter === 'all') return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (timeFilter === 'this') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth();
  };

  // Lịch sử giao dịch: mới nhất lên đầu (theo ngày giao dịch), giao dịch cùng
  // ngày thì mới tạo trước (id giảm dần) - BE chỉ sort theo transactionDate
  // nên thứ tự các giao dịch trùng ngày không đảm bảo.
  const sortedTransactions = [...wallet.transactions].sort((a, b) => {
    const dateA = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
    const dateB = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    return b.id - a.id;
  });

  const searchQuery = search.trim().toLowerCase();
  const filteredTransactions = sortedTransactions.filter((t) => {
    if (typeFilter !== ALL_TYPE && t.type !== typeFilter) return false;
    if (categoryFilter === UNCATEGORIZED) {
      // "Chưa phân loại" = giao dịch thu/chi không gắn danh mục (transfer không tính).
      if (t.type === 'transfer' || t.categoryId) return false;
    } else if (categoryFilter !== ALL_CATEGORY && t.categoryId?.documentId !== categoryFilter) {
      return false;
    }
    if (!isInTimeRange(t.transactionDate)) return false;
    if (searchQuery) {
      const noteMatch = t.note?.toLowerCase().includes(searchQuery) ?? false;
      const categoryMatch = t.categoryId?.name.toLowerCase().includes(searchQuery) ?? false;
      if (!noteMatch && !categoryMatch) return false;
    }
    return true;
  });

  const visibleTransactions = filteredTransactions.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-4">
      <Card className={cn('overflow-hidden border-l-4 p-0', identityColor.border)}>
        <div className={cn('flex flex-wrap items-start justify-between gap-4 p-6', identityColor.bg)}>
          <div>
            <span className="inline-block bg-foreground/10 px-2 py-1 text-[0.65rem] font-semibold tracking-wider text-foreground uppercase">
              Chi tiết ví đang chọn
            </span>
            {wallet.accountNumber ? (
              <p className="mt-2 text-xs text-muted-foreground">Số TK: {wallet.accountNumber}</p>
            ) : null}
            <h2 className="mt-1 text-2xl font-bold text-foreground">{wallet.name}</h2>
          </div>
          <div className="flex flex-col items-end gap-3">
            <p className="text-2xl font-bold text-foreground">{formatCurrency(wallet.balance)}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" size="icon" onClick={() => setEditOpen(true)}>
                <PencilSimpleIcon />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={isDeleting}
              >
                <TrashIcon className="text-destructive" />
              </Button>
              <Button onClick={() => setAddTxOpen(true)}>
                <PlusIcon />
                Thêm thu chi ví này
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
          <div className="border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
              Tổng Thu Vào Ví Này
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-xs font-semibold tracking-wider text-destructive uppercase">
              Tổng Chi Bởi Ví Này
            </p>
            <p className="mt-1 text-xl font-bold text-destructive">{formatCurrency(totalExpense)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 py-4">
          <h3 className="text-base font-bold text-foreground">
            Lịch Sử Giao Dịch Ví ({filteredTransactions.length})
          </h3>

          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo ghi chú hoặc danh mục..."
              className="pl-6"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter((v as TypeFilter) ?? ALL_TYPE)}
              items={[
                { value: ALL_TYPE, label: 'Tất cả loại' },
                { value: 'income', label: 'Thu' },
                { value: 'expense', label: 'Chi' },
                { value: 'transfer', label: 'Chuyển khoản' },
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPE}>Tất cả loại</SelectItem>
                <SelectItem value="income">Thu</SelectItem>
                <SelectItem value="expense">Chi</SelectItem>
                <SelectItem value="transfer">Chuyển khoản</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v ?? ALL_CATEGORY)}
              items={[
                { value: ALL_CATEGORY, label: 'Tất cả danh mục' },
                { value: UNCATEGORIZED, label: 'Chưa phân loại' },
                ...filterableCategories.map((c) => ({ value: c.documentId, label: c.name })),
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORY}>Tất cả danh mục</SelectItem>
                <SelectItem value={UNCATEGORIZED}>Chưa phân loại</SelectItem>
                {filterableCategories.map((c) => (
                  <SelectItem key={c.documentId} value={c.documentId}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={timeFilter}
              onValueChange={(v) => setTimeFilter((v as TimeFilter) ?? 'all')}
              items={[
                { value: 'all', label: 'Tất cả thời gian' },
                { value: 'this', label: 'Tháng này' },
                { value: 'last', label: 'Tháng trước' },
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả thời gian</SelectItem>
                <SelectItem value="this">Tháng này</SelectItem>
                <SelectItem value="last">Tháng trước</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {wallet.transactions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Chưa có giao dịch nào</p>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <InfoIcon className="size-6" />
              Không tìm thấy giao dịch nào phù hợp với bộ lọc.
            </div>
          ) : (
            <ul className="-mx-(--card-spacing)">
              {visibleTransactions.map((item) => {
                const sign = item.type === 'expense' ? '-' : item.type === 'income' ? '+' : '';
                const transferLabel = item.toWallet
                  ? `Chuyển đến ${item.toWallet.name ?? 'ví khác'}`
                  : item.fromWallet
                    ? `Nhận từ ${item.fromWallet.name ?? 'ví khác'}`
                    : TRANSACTION_TYPE_LABEL[item.type];
                const isOrphan = item.type !== 'transfer' && !item.categoryId;
                const fullCategory = item.categoryId
                  ? categoryByDocumentId.get(item.categoryId.documentId)
                  : undefined;
                const colorClass = getCategoryColorClass(fullCategory?.parent?.color ?? fullCategory?.color);
                // Giao dịch đối ứng (bản mirror) không cho sửa trực tiếp - chỉ
                // sửa từ giao dịch gốc của ví chuyển đi.
                const isTransferMirror = item.type === 'transfer' && item.fromWallet && !item.toWallet;

                return (
                  <li
                    key={item.documentId}
                    className="flex items-center justify-between border-b px-(--card-spacing) py-3 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn('flex size-9 items-center justify-center rounded-full', colorClass)}>
                        <CategoryIconView icon={fullCategory?.icon} className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {item.type === 'transfer'
                            ? transferLabel
                            : (item.categoryId?.name ?? 'Chưa phân loại')}
                        </p>
                        <p className={cn('text-xs', isOrphan ? 'text-destructive' : 'text-muted-foreground')}>
                          {isOrphan
                            ? 'Chưa phân loại - nhấn nút sửa để gán danh mục'
                            : item.note
                              ? item.note
                              : TRANSACTION_TYPE_LABEL[item.type]}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className={`text-sm font-semibold ${TRANSACTION_COLOR[item.type]}`}>
                        {sign}
                        {formatCurrency(item.amount)}
                      </span>
                      {!isTransferMirror && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditTx(item)}
                            title="Sửa giao dịch"
                          >
                            <PencilSimpleIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeletingTx(item)}
                            title="Xóa giao dịch"
                          >
                            <TrashIcon className="size-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {filteredTransactions.length > visibleCount ? (
            <Button variant="outline" className="w-full" onClick={() => setVisibleCount((n) => n + TX_PAGE_SIZE)}>
              Xem thêm ({filteredTransactions.length - visibleCount} giao dịch)
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <WalletFormDialog open={editOpen} onOpenChange={setEditOpen} wallet={wallet} />
      <TransactionFormDialog
        open={addTxOpen}
        onOpenChange={setAddTxOpen}
        defaultWalletId={wallet.documentId}
      />
      <TransactionFormDialog
        open={!!editTx}
        onOpenChange={(o) => !o && setEditTx(null)}
        transaction={editTx ?? undefined}
        defaultWalletId={wallet.documentId}
      />

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Xóa ví "${wallet.name}"?`}</AlertDialogTitle>
            <AlertDialogDescription>
              Ví này đang có {wallet.transactions.length} giao dịch. Hành động này không thể hoàn tác. Ví sẽ bị ẩn
              khỏi danh sách; các giao dịch cũ vẫn được giữ lại trong hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingTx} onOpenChange={(open) => !open && setDeletingTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa giao dịch này?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTx?.type === 'transfer'
                ? 'Cả giao dịch chuyển tiền gốc lẫn giao dịch đối ứng ở ví kia sẽ bị xóa. Số dư các ví liên quan được tính lại tự động.'
                : 'Số dư của ví sẽ được tính lại tự động. Hành động này không thể hoàn tác.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteTx} disabled={isDeletingTx}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
