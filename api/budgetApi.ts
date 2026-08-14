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

export interface BudgetProgressResult {
  active: boolean;
  spent: number;
  limit: number;
  percent: number;
  budgetDocumentId?: string;
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
      invalidatesTags: [{ type: 'Budget', id: 'LIST' }, { type: 'Budget', id: 'PROGRESS' }],
    }),

    updateBudget: builder.mutation<Budget, { documentId: string; data: BudgetFormBody }>({
      query: ({ documentId, data }) => ({
        url: `/budgets/${documentId}`,
        method: 'PUT',
        body: { data },
      }),
      transformResponse: (response: StrapiItemResponse<Budget>) => response.data,
      invalidatesTags: [{ type: 'Budget', id: 'LIST' }, { type: 'Budget', id: 'PROGRESS' }],
    }),

    deleteBudget: builder.mutation<void, string>({
      query: (documentId) => ({ url: `/budgets/${documentId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Budget', id: 'LIST' }, { type: 'Budget', id: 'PROGRESS' }],
    }),

    // Tiến độ budget "expense" do BE tính sẵn (spent/limit/percent) - tránh
    // duplicate logic calculateSpent sang client. Income budget (quỹ tích lũy)
    // tính theo số dư ví nên không dùng endpoint này.
    getBudgetProgress: builder.query<BudgetProgressResult, { walletId: string; categoryId?: string | null; month: number; year: number }>({
      query: ({ walletId, categoryId, month, year }) => {
        const params = [`month=${month}`, `year=${year}`];
        if (categoryId) params.push(`categoryId=${categoryId}`);
        return `/budgets/progress/${walletId}?${params.join('&')}`;
      },
      transformResponse: (response: { data: BudgetProgressResult }) => response.data,
      providesTags: [{ type: 'Budget', id: 'PROGRESS' }],
    }),
  }),
});

export const {
  useGetBudgetsQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
  useGetBudgetProgressQuery,
} = budgetApi;
