'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowsLeftRightIcon,
  BankIcon,
  ChartBarIcon,
  CreditCardIcon,
  PiggyBankIcon,
  PlusIcon,
  TrendDownIcon,
  TrendUpIcon,
  WalletIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetReportSummaryQuery } from '@/api/reportApi';
import { useGetRecentTransactionsQuery } from '@/api/transactionApi';
import { useGetWalletsQuery } from '@/api/walletApi';
import { CategoryIconView } from '@/components/CategoryIconView';
import { IncomeExpenseBarChart } from '@/components/IncomeExpenseBarChart';
import { TransactionFormDialog } from '@/components/TransactionFormDialog';
import { WalletFormDialog } from '@/components/WalletFormDialog';
import { getCategoryColorClass } from '@/lib/categoryColors';
import { formatCurrency, TRANSACTION_TYPE_LABEL, WALLET_TYPE_LABEL } from '@/lib/format';
import { formatPeriodLabel, lastNMonthsRange } from '@/lib/reportDates';
import type { Transaction, Wallet } from '@/types/api';

const HOME_CHART_RANGE = lastNMonthsRange(6);

const TRANSACTION_AMOUNT_COLOR: Record<Transaction['type'], string> = {
  income: 'text-emerald-600 dark:text-emerald-400',
  expense: 'text-destructive',
  transfer: 'text-violet-600 dark:text-violet-400',
};

const WALLET_ICON: Record<Wallet['type'], typeof BankIcon> = {
  cash: WalletIcon,
  bank: BankIcon,
  ewallet: WalletIcon,
  card: CreditCardIcon,
};

// "2026-08-02T..." -> "2/8/2026" (không thêm số 0 ở đầu).
function formatShortDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function StatCard({
  icon,
  iconClassName,
  label,
  value,
  valueClassName,
  subtitle,
}: {
  icon: ReactNode;
  iconClassName: string;
  label: string;
  value: string;
  valueClassName: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconClassName}`}>
            {icon}
          </div>
        </div>
        <p className={`text-xl font-bold ${valueClassName}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { data: wallets, isLoading: isLoadingWallets } = useGetWalletsQuery();
  const { data: transactions, isLoading: isLoadingTransactions } = useGetRecentTransactionsQuery(
    { limit: 5 },
    { skip: isLoadingWallets || (wallets?.length ?? 0) === 0 },
  );
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  const hasNoWallets = !isLoadingWallets && (wallets?.length ?? 0) === 0;

  const { data: summary, isLoading: isLoadingSummary } = useGetReportSummaryQuery(
    { granularity: 'month', ...HOME_CHART_RANGE },
    { skip: hasNoWallets },
  );
  const chartData = (summary ?? []).map((p) => ({
    label: formatPeriodLabel(p.period),
    income: p.income,
    expense: p.expense,
  }));

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = (summary ?? []).find((p) => p.period === currentPeriod) ?? {
    period: currentPeriod,
    income: 0,
    expense: 0,
    incomeCount: 0,
    expenseCount: 0,
  };
  const netSaving = currentMonth.income - currentMonth.expense;
  const savingRate =
    currentMonth.income > 0 ? ((netSaving / currentMonth.income) * 100).toFixed(1) : '0.0';
  const totalBalance = (wallets ?? []).reduce((sum, w) => sum + w.balance, 0);
  const sortedWallets = [...(wallets ?? [])].sort((a, b) => a.index - b.index);
  const isLoadingStats = isLoadingWallets || isLoadingSummary;
  const showContent = !isLoadingWallets && !hasNoWallets;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Trang chủ</h1>
        {!hasNoWallets && (
          <Button onClick={() => setTxDialogOpen(true)}>
            <PlusIcon />
            Thêm giao dịch
          </Button>
        )}
      </div>

      {isLoadingWallets ? (
        <Skeleton className="h-40 w-full" />
      ) : hasNoWallets ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <WalletIcon className="size-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Bạn chưa có ví nào</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Vui lòng tạo một ví đầu tiên để bắt đầu theo dõi thu chi.
              </p>
            </div>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" nativeButton={false} render={<Link href="/wallets">Đi tới Ví</Link>} />
              <Button onClick={() => setWalletDialogOpen(true)}>
                <PlusIcon />
                Tạo ví ngay
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showContent && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoadingStats ? (
            <>
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </>
          ) : (
            <>
              <StatCard
                label="Tổng số dư tất cả ví"
                value={formatCurrency(totalBalance)}
                valueClassName="text-foreground"
                subtitle={`${wallets?.length ?? 0} ví đang kết nối`}
                icon={<WalletIcon className="size-4" />}
                iconClassName="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              />
              <StatCard
                label="Tổng thu tháng này"
                value={formatCurrency(currentMonth.income)}
                valueClassName="text-emerald-600 dark:text-emerald-400"
                subtitle={`Từ ${currentMonth.incomeCount} khoản thu nhập`}
                icon={<TrendUpIcon className="size-4" />}
                iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              />
              <StatCard
                label="Tổng chi tháng này"
                value={formatCurrency(currentMonth.expense)}
                valueClassName="text-destructive"
                subtitle={`${currentMonth.expenseCount} khoản chi tiêu`}
                icon={<TrendDownIcon className="size-4" />}
                iconClassName="bg-destructive/10 text-destructive"
              />
              <StatCard
                label="Tích lũy ròng & tỷ lệ"
                value={formatCurrency(netSaving)}
                valueClassName="text-violet-600 dark:text-violet-400"
                subtitle={`Tỷ lệ tiết kiệm: ${savingRate}%`}
                icon={<PiggyBankIcon className="size-4" />}
                iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
              />
            </>
          )}
        </div>
      )}

      {showContent && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Giao dịch gần đây</CardTitle>
              <Link href="/wallets" className="text-sm font-medium text-primary hover:underline">
                Quản lý chi tiết →
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingTransactions ? (
                <div className="space-y-3 p-6">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !transactions || transactions.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Chưa có giao dịch nào
                </p>
              ) : (
                <ul>
                  {transactions.map((item) => {
                    const isTransfer = item.type === 'transfer';
                    const sign = item.type === 'expense' ? '-' : item.type === 'income' ? '+' : '';
                    const parent = item.categoryId?.parent ?? null;
                    const mainName = parent?.name ?? item.categoryId?.name ?? TRANSACTION_TYPE_LABEL[item.type];
                    const subName = parent ? item.categoryId?.name : null;
                    const transferSource = item.toWallet ? item.walletId?.name : item.fromWallet?.name;
                    const transferDest = item.toWallet ? item.toWallet.name : item.walletId?.name;

                    return (
                      <li
                        key={item.documentId}
                        className="flex items-center justify-between gap-3 border-b px-6 py-3 last:border-b-0"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                              isTransfer ? getCategoryColorClass('indigo') : getCategoryColorClass(parent?.color)
                            }`}
                          >
                            {isTransfer ? (
                              <ArrowsLeftRightIcon className="size-5" />
                            ) : (
                              <CategoryIconView icon={parent?.icon ?? null} className="size-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {isTransfer
                                ? `Chuyển: ${transferSource ?? 'ví khác'} → ${transferDest ?? 'ví khác'}`
                                : mainName}
                            </p>
                            {!isTransfer && subName ? (
                              <p className="truncate text-xs text-muted-foreground/80">{subName}</p>
                            ) : null}
                            <p className="truncate text-xs text-muted-foreground">
                              {item.walletId?.name ?? '—'} · {formatShortDate(item.transactionDate)}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-sm font-semibold ${TRANSACTION_AMOUNT_COLOR[item.type]}`}>
                            {sign}
                            {formatCurrency(item.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {TRANSACTION_TYPE_LABEL[item.type]}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ví & nguồn tiền</CardTitle>
              <Link href="/wallets" className="text-sm font-medium text-primary hover:underline">
                Xem tất cả
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {sortedWallets.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Chưa có ví nào
                </p>
              ) : (
                <ul>
                  {sortedWallets.map((wallet) => {
                    const Icon = WALLET_ICON[wallet.type];
                    return (
                      <li
                        key={wallet.documentId}
                        className="flex items-center justify-between gap-2 border-b px-6 py-3 last:border-b-0"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Icon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{wallet.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {WALLET_TYPE_LABEL[wallet.type]}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-foreground">
                          {formatCurrency(wallet.balance)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="p-6 pt-4">
                <Button variant="outline" className="w-full" onClick={() => setWalletDialogOpen(true)}>
                  <PlusIcon />
                  Thêm ví nguồn mới
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showContent && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Thu chi 6 tháng gần đây</CardTitle>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href="/profile">
                  <ChartBarIcon />
                  Xem chi tiết
                </Link>
              }
            />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="aspect-video w-full" />
            ) : chartData.every((d) => d.income === 0 && d.expense === 0) ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Chưa có dữ liệu để hiển thị
              </p>
            ) : (
              <IncomeExpenseBarChart data={chartData} />
            )}
          </CardContent>
        </Card>
      )}

      <TransactionFormDialog open={txDialogOpen} onOpenChange={setTxDialogOpen} />
      <WalletFormDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </div>
  );
}
