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
      invalidatesTags: [{ type: 'Wallet', id: 'LIST' }],
    }),

    updateWallet: builder.mutation<void, { documentId: string; data: WalletFormBody }>({
      query: ({ documentId, data }) => ({
        url: `/wallets/${documentId}`,
        method: 'PUT',
        body: { data },
      }),
      invalidatesTags: (_result, _error, { documentId }) => [{ type: 'Wallet', id: documentId }],
    }),

    deleteWallet: builder.mutation<void, string>({
      query: (documentId) => ({ url: `/wallets/delete-wallet/${documentId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Wallet', id: 'LIST' }],
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
