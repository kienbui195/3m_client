import { baseApi } from '@/api/baseApi';
import type {
  ReportCategoryBreakdown,
  ReportCompareResult,
  ReportGranularity,
  ReportSummaryPoint,
} from '@/types/api';

interface ReportResponse<T> {
  data: T;
}

interface SummaryParams {
  granularity: ReportGranularity;
  from: string;
  to: string;
  walletId?: string;
}

interface ByCategoryParams {
  type: 'income' | 'expense';
  from: string;
  to: string;
  walletId?: string;
}

interface CompareParams {
  month: number;
  year: number;
  compareWith?: 'previous_month' | 'previous_year';
  walletId?: string;
}

export const reportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReportSummary: builder.query<ReportSummaryPoint[], SummaryParams>({
      query: ({ granularity, from, to, walletId }) => {
        const params = [
          `granularity=${granularity}`,
          `from=${encodeURIComponent(from)}`,
          `to=${encodeURIComponent(to)}`,
        ];
        if (walletId) params.push(`walletId=${walletId}`);
        return `/reports/summary?${params.join('&')}`;
      },
      transformResponse: (response: ReportResponse<ReportSummaryPoint[]>) => response.data,
      providesTags: [{ type: 'Report', id: 'LIST' }],
    }),

    getReportByCategory: builder.query<ReportCategoryBreakdown[], ByCategoryParams>({
      query: ({ type, from, to, walletId }) => {
        const params = [`type=${type}`, `from=${encodeURIComponent(from)}`, `to=${encodeURIComponent(to)}`];
        if (walletId) params.push(`walletId=${walletId}`);
        return `/reports/by-category?${params.join('&')}`;
      },
      transformResponse: (response: ReportResponse<ReportCategoryBreakdown[]>) => response.data,
      providesTags: [{ type: 'Report', id: 'LIST' }],
    }),

    getReportCompare: builder.query<ReportCompareResult, CompareParams>({
      query: ({ month, year, compareWith = 'previous_month', walletId }) => {
        const params = [`month=${month}`, `year=${year}`, `compareWith=${compareWith}`];
        if (walletId) params.push(`walletId=${walletId}`);
        return `/reports/compare?${params.join('&')}`;
      },
      transformResponse: (response: ReportResponse<ReportCompareResult>) => response.data,
      providesTags: [{ type: 'Report', id: 'LIST' }],
    }),
  }),
});

export const { useGetReportSummaryQuery, useGetReportByCategoryQuery, useGetReportCompareQuery } =
  reportApi;
