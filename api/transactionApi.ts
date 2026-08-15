import { baseApi } from '@/api/baseApi';
import type {
  StrapiItemResponse,
  StrapiListResponse,
  Transaction,
  TransactionType,
  TransactionWalletSnapshot,
} from '@/types/api';

interface CreateTransactionBody {
  type: TransactionType;
  amount: number;
  note?: string;
  categoryId?: string;
  transactionDate?: string;
  // Quy ước: thu/chi trong 1 ví -> chỉ điền walletId (ví nguồn).
  // Chuyển tiền giữa 2 ví -> điền cả walletId (ví nguồn) và toWallet (ví đích,
  // dạng {id, name} - không phải string như wallet/category khác, do BE lưu
  // snapshot JSON chứ không phải relation).
  walletId: string;
  toWallet?: TransactionWalletSnapshot;
}

export const transactionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRecentTransactions: builder.query<Transaction[], { limit?: number } | void>({
      query: (arg) => {
        const limit = arg?.limit ?? 5;
        return (
          `/transactions?sort=transactionDate:desc&pagination[limit]=${limit}` +
          `&populate[categoryId][populate][parent][fields][0]=name` +
          `&populate[categoryId][populate][parent][fields][1]=icon` +
          `&populate[categoryId][populate][parent][fields][2]=color` +
          `&populate[walletId][fields][0]=name`
        );
      },
      transformResponse: (response: StrapiListResponse<Transaction>) => response.data,
      providesTags: [{ type: 'Transaction', id: 'RECENT' }],
    }),

    createTransaction: builder.mutation<Transaction, CreateTransactionBody>({
      query: (data) => ({ url: '/transactions', method: 'POST', body: { data } }),
      transformResponse: (response: StrapiItemResponse<Transaction>) => response.data,
      // Giao dịch mới có thể làm thay đổi balance của ví -> invalidate cả Wallet
      // LIST lẫn chi tiết ví liên quan (nguồn + đích khi chuyển khoản) để
      // trang chi tiết ví (số dư + danh sách giao dịch) refetch đúng lúc.
      // Cũng invalidate SPENT để progress bar ngân sách cập nhật lại số đã chi.
      invalidatesTags: (_result, _error, { walletId, toWallet }) => [
        { type: 'Wallet', id: 'LIST' },
        { type: 'Wallet', id: walletId },
        ...(toWallet ? [{ type: 'Wallet' as const, id: toWallet.id }] : []),
        { type: 'Transaction', id: 'RECENT' },
        { type: 'Transaction', id: 'SPENT' },
        { type: 'Report', id: 'LIST' },
        { type: 'Budget', id: 'PROGRESS' },
        // Giao dịch chi có thể khiến BE sinh notification (vượt 80%/100% ngân
        // sách) -> invalidate để chuông thông báo cập nhật ngay.
        { type: 'Notification', id: 'LIST' },
      ],
    }),

    updateTransaction: builder.mutation<Transaction, { documentId: string; data: CreateTransactionBody }>({
      query: ({ documentId, data }) => ({
        url: `/transactions/${documentId}`,
        method: 'PUT',
        body: { data },
      }),
      transformResponse: (response: StrapiItemResponse<Transaction>) => response.data,
      // Sửa giao dịch có thể làm thay đổi balance của ví cũ/ví mới và cả ví
      // đối ứng (khi chuyển khoản) -> invalidate rộng như create, cộng thêm
      // tiến độ ngân sách.
      invalidatesTags: (_result, _error, { data }) => [
        { type: 'Wallet', id: 'LIST' },
        { type: 'Wallet', id: data.walletId },
        ...(data.toWallet ? [{ type: 'Wallet' as const, id: data.toWallet.id }] : []),
        { type: 'Transaction', id: 'RECENT' },
        { type: 'Transaction', id: 'SPENT' },
        { type: 'Report', id: 'LIST' },
        { type: 'Budget', id: 'PROGRESS' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),

    deleteTransaction: builder.mutation<
      void,
      { documentId: string; walletId?: string; toWalletId?: string }
    >({
      query: ({ documentId }) => ({
        url: `/transactions/${documentId}`,
        method: 'DELETE',
      }),
      // Xóa giao dịch làm revert balance ví nguồn (+ ví đối ứng khi transfer) và
      // thay đổi số đã chi/tiến độ ngân sách - invalidate rộng như update.
      invalidatesTags: (_result, _error, { walletId, toWalletId }) => [
        { type: 'Wallet', id: 'LIST' },
        ...(walletId ? [{ type: 'Wallet' as const, id: walletId }] : []),
        ...(toWalletId ? [{ type: 'Wallet' as const, id: toWalletId }] : []),
        { type: 'Transaction', id: 'RECENT' },
        { type: 'Transaction', id: 'SPENT' },
        { type: 'Report', id: 'LIST' },
        { type: 'Budget', id: 'PROGRESS' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),

    // Đếm số giao dịch đang dùng 1 danh mục - dùng để cảnh báo trước khi xóa
    // danh mục (các giao dịch đó sẽ thành "Chưa phân loại").
    countTransactionsByCategory: builder.query<number, string>({
      query: (categoryId) =>
        `/transactions?filters[categoryId][documentId]=${categoryId}&fields[0]=id&pagination[pageSize]=1`,
      transformResponse: (response: StrapiListResponse<unknown>) => response.meta.pagination.total,
    }),

    // Tính tổng đã chi cho 1 ví/danh mục/kỳ - dùng để vẽ progress bar ngân
    // sách. Đây là tính toán phía client, phỏng theo logic
    // budget.calculateSpent ở BE (server/src/api/budget/services/budget.ts)
    // vì hiện chưa có endpoint trả sẵn % đã dùng của ngân sách.
    getBudgetSpent: builder.query<
      number,
      { walletId: string; categoryId?: string | null; month: number; year: number }
    >({
      query: ({ walletId, categoryId, month, year }) => {
        const start = new Date(Date.UTC(year, month - 1, 1)).toISOString();
        const end = new Date(Date.UTC(year, month, 1)).toISOString();
        const params = [
          `filters[walletId][documentId]=${walletId}`,
          'filters[type]=expense',
          `filters[transactionDate][$gte]=${encodeURIComponent(start)}`,
          `filters[transactionDate][$lt]=${encodeURIComponent(end)}`,
          'fields[0]=amount',
          'pagination[pageSize]=200',
        ];
        if (categoryId) params.push(`filters[categoryId][documentId]=${categoryId}`);
        return `/transactions?${params.join('&')}`;
      },
      transformResponse: (response: StrapiListResponse<{ amount: number }>) =>
        response.data.reduce((sum, t) => sum + Number(t.amount ?? 0), 0),
      providesTags: [{ type: 'Transaction', id: 'SPENT' }],
    }),
  }),
});

export const {
  useGetRecentTransactionsQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  useGetBudgetSpentQuery,
  useLazyCountTransactionsByCategoryQuery,
} = transactionApi;
