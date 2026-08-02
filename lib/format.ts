import type { TransactionType, WalletType } from '@/types/api';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
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
