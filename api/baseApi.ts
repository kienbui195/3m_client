import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { loggedOut } from '@/store/authSlice';
import { authStorage } from '@/lib/storage';
import type { RootState } from '@/store';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Không có refresh-token flow khả dụng ở BE hiện tại (xem ghi chú trong
// customLogin), nên khi access token hết hạn (401) chỉ có thể đăng xuất
// và yêu cầu đăng nhập lại, không thể tự làm mới token ngầm.
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    authStorage.clear();
    api.dispatch(loggedOut());
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Wallet', 'User', 'Transaction', 'Category', 'Budget', 'Notification', 'Report'],
  endpoints: () => ({}),
});
