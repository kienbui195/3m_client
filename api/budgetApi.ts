import { baseApi } from '@/api/baseApi';
import type { Budget, BudgetType, StrapiItemResponse, StrapiListResponse } from '@/types/api';

interface BudgetFormBody {
  name?: string;
  type: BudgetType;
  walletId: string;
  // Bỏ qua (undefined) khi type === 'income' - BE tự ép về null.
  categoryId?: string | null;
  amountLimit: number;
  periodMonth?: number | null;
  periodYear?: number | null;
}

export const budgetApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBudgets: builder.query<Budget[], void>({
      query: () =>
        '/budgets?populate[walletId]=true&populate[categoryId]=true&sort=periodYear:desc,periodMonth:desc',
      transformResponse: (response: StrapiListResponse<Budget>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ documentId }) => ({ type: 'Budget' as const, id: documentId })),
              { type: 'Budget' as const, id: 'LIST' },
            ]
          : [{ type: 'Budget' as const, id: 'LIST' }],
    }),

    createBudget: builder.mutation<Budget, BudgetFormBody>({
      query: (data) => ({ url: '/budgets', method: 'POST', body: { data } }),
      transformResponse: (response: StrapiItemResponse<Budget>) => response.data,
      invalidatesTags: [{ type: 'Budget', id: 'LIST' }],
    }),

    updateBudget: builder.mutation<Budget, { documentId: string; data: BudgetFormBody }>({
      query: ({ documentId, data }) => ({
        url: `/budgets/${documentId}`,
        method: 'PUT',
        body: { data },
      }),
      transformResponse: (response: StrapiItemResponse<Budget>) => response.data,
      invalidatesTags: [{ type: 'Budget', id: 'LIST' }],
    }),

    deleteBudget: builder.mutation<void, string>({
      query: (documentId) => ({ url: `/budgets/${documentId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Budget', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetBudgetsQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} = budgetApi;
