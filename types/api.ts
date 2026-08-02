export type WalletType = 'cash' | 'bank' | 'ewallet' | 'card';

export interface User {
  id: number;
  documentId: string;
  username: string;
  email: string;
  fullName: string | null;
  confirmed: boolean;
  blocked: boolean;
}

export interface Wallet {
  id: number;
  documentId: string;
  name: string;
  type: WalletType;
  balance: number;
  isDeleted: boolean;
  index: number;
  accountNumber: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

// Snapshot JSON (không phải relation) lưu id + tên của ví đối ứng tại thời
// điểm chuyển khoản - xem server/src/api/transaction/services/transaction.ts.
export interface TransactionWalletSnapshot {
  id: string;
  name?: string;
}

export interface Transaction {
  id: number;
  documentId: string;
  type: TransactionType;
  amount: number;
  transactionDate: string | null;
  note: string | null;
  categoryId:
    | {
        id: number;
        documentId: string;
        name: string;
        // Chỉ populate ở getRecentTransactions (trang chủ) để hiển thị 2 dòng
        // tên danh mục cha/con - các endpoint khác không có field này.
        parent?: { name: string; icon: string | null; color: string | null } | null;
      }
    | null;
  walletId: { id: number; documentId: string; name: string } | null;
  fromWallet: TransactionWalletSnapshot | null;
  toWallet: TransactionWalletSnapshot | null;
  pairTransactionId: string | null;
}

export interface WalletDetail extends Wallet {
  transactions: Transaction[];
}

export type CategoryType = 'income' | 'expense';

export interface CategoryRef {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  icon: string | null;
  type: CategoryType;
  // Chỉ danh mục cha (không có parent) mới có màu riêng để phân biệt nhóm -
  // danh mục con luôn null, dùng chung màu/icon của cha khi hiển thị.
  color: string | null;
}

export interface Category extends CategoryRef {
  desc: string | null;
  parent: CategoryRef | null;
  children: CategoryRef[];
}

export type BudgetType = 'income' | 'expense';

export interface Budget {
  id: number;
  documentId: string;
  // Tên hiển thị người dùng tự đặt (vd: "Hạn mức Ăn uống MoMo hàng tháng") -
  // tùy chọn, FE tự fallback theo ví/danh mục nếu để trống.
  name: string | null;
  type: BudgetType;
  amountLimit: number;
  // null khi type === 'income' (quỹ tích lũy toàn ví, không reset theo tháng).
  periodMonth: number | null;
  periodYear: number | null;
  walletId: { id: number; documentId: string; name: string } | null;
  // Luôn null khi type === 'income' (chỉ áp dụng toàn ví).
  categoryId: { id: number; documentId: string; name: string } | null;
}

export interface AppNotification {
  id: number;
  documentId: string;
  thresholdPercent: number;
  amountSpentAtTrigger: number;
  isRead: boolean;
  triggeredAt: string | null;
  budgetId:
    | (Pick<Budget, 'id' | 'documentId' | 'type' | 'amountLimit' | 'walletId' | 'categoryId'> | null)
    | null;
}

export interface StrapiListResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiItemResponse<T> {
  data: T;
  meta: Record<string, unknown>;
}

export interface ApiMessage {
  status: 'success' | 'error';
  message: string;
}

export type ReportGranularity = 'day' | 'month' | 'year';

export interface ReportSummaryPoint {
  period: string;
  income: number;
  expense: number;
  incomeCount: number;
  expenseCount: number;
}

export interface ReportCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percent: number;
}

export interface ReportComparePeriod {
  label: string;
  income: number;
  expense: number;
}

export interface ReportCompareResult {
  current: ReportComparePeriod;
  previous: ReportComparePeriod;
}
