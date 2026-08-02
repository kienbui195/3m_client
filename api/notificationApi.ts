import { baseApi } from '@/api/baseApi';
import type { AppNotification, StrapiListResponse } from '@/types/api';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<AppNotification[], void>({
      query: () =>
        '/notifications?populate[budgetId][populate][walletId]=true&populate[budgetId][populate][categoryId]=true' +
        '&sort=triggeredAt:desc&pagination[pageSize]=50',
      transformResponse: (response: StrapiListResponse<AppNotification>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ documentId }) => ({ type: 'Notification' as const, id: documentId })),
              { type: 'Notification' as const, id: 'LIST' },
            ]
          : [{ type: 'Notification' as const, id: 'LIST' }],
    }),

    markNotificationRead: builder.mutation<void, string>({
      query: (documentId) => ({
        url: `/notifications/${documentId}`,
        method: 'PUT',
        body: { data: { isRead: true } },
      }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkNotificationReadMutation } = notificationApi;
