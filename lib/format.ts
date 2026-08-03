import type { TransactionType, WalletType } from '@/types/api';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

// Rút gọn số tiền cho trục biểu đồ, vd 18000000 -> "18M", 500000 -> "500K".
export function formatCompactAmount(value: number) {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const trim = (n: number) => Number(n.toFixed(1)).toString();

  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}K`;
  return `${sign}${abs}`;
}

export const WALLET_TYPE_LABEL: Record<WalletType, string> = {
  cash: 'Tiền mặt',
  bank: 'Ngân hàng',
  ewallet: 'Ví điện tử',
  card: 'Thẻ',
};

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  income: 'Thu nhập',
  expense: 'Chi tiêu',
  transfer: 'Chuyển khoản',
};
