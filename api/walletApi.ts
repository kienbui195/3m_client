import { baseApi } from '@/api/baseApi';
import type {
  StrapiItemResponse,
  StrapiListResponse,
  Wallet,
  WalletDetail,
  WalletType,
} from '@/types/api';

interface WalletFormBody {
  name: string;
  type: WalletType;
  balance?: number;
  accountNumber?: string;
  note?: string;
}

export const walletApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWallets: builder.query<Wallet[], void>({
      query: () => '/wallets',
      transformResponse: (response: StrapiListResponse<Wallet>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ documentId }) => ({ type: 'Wallet' as const, id: documentId })),
              { type: 'Wallet' as const, id: 'LIST' },
            ]
          : [{ type: 'Wallet' as const, id: 'LIST' }],
    }),

    getWallet: builder.query<WalletDetail, string>({
      query: (documentId) => `/wallets/${documentId}`,
      transformResponse: (response: StrapiItemResponse<WalletDetail>) => response.data,
      providesTags: (_result, _error, documentId) => [{ type: 'Wallet', id: documentId }],
    }),

    createWallet: builder.mutation<Wallet, WalletFormBody>({
      query: (data) => ({ url: '/wallets', method: 'POST', body: { data } }),
      transformResponse: (response: StrapiItemResponse<Wallet>) => response.data,
      // Tạo ví đầu tiên khiến BE seed bộ danh mục mặc định (xem wallet
      // controller) -> phải invalidate Category để FE refetch, nếu không cache
      // danh mục rỗng cũ (vd: query từ trang báo cáo trước khi có ví) vẫn giữ
      // nguyên, UI hiện 0 danh mục dù BE đã tạo xong.
      invalidatesTags: [
        { type: 'Wallet', id: 'LIST' },
        { type: 'Category', id: 'LIST' },
      ],
    }),

    updateWallet: builder.mutation<void, { documentId: string; data: WalletFormBody }>({
      query: ({ documentId, data }) => ({
        url: `/wallets/${documentId}`,
        method: 'PUT',
        body: { data },
      }),
      // Sửa ví (đổi tên/số dư) cũng làm thay đổi danh sách ví ở dashboard/wallets
      // -> invalidate cả LIST để các màn khác refetch, không giữ tên/số dư cũ.
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'Wallet', id: documentId },
        { type: 'Wallet', id: 'LIST' },
      ],
    }),

    deleteWallet: builder.mutation<void, string>({
      query: (documentId) => ({ url: `/wallets/delete-wallet/${documentId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, documentId) => [
        { type: 'Wallet', id: 'LIST' },
        { type: 'Wallet', id: documentId },
        { type: 'Transaction', id: 'RECENT' },
      ],
    }),
  }),
});

export const {
  useGetWalletsQuery,
  useGetWalletQuery,
  useCreateWalletMutation,
  useUpdateWalletMutation,
  useDeleteWalletMutation,
} = walletApi;
