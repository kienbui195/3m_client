import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { toast } from 'sonner';
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
// Tránh spam toast khi nhiều request cùng lúc đều fail 401.
let lastSessionExpiredAt = 0;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    authStorage.clear();
    api.dispatch(loggedOut());
    // AuthGuard sẽ redirect về /auth/login khi token thành null; toast này
    // (Toaster mount ở root layout) sống xuyên qua redirect.
    const now = Date.now();
    if (now - lastSessionExpiredAt > 1000) {
      lastSessionExpiredAt = now;
      toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Wallet', 'User', 'Transaction', 'Category', 'Budget', 'Notification', 'Report'],
  // Đảm bảo dữ liệu luôn mới cho demo / UX: không giữ cache khi màn hình không
  // còn dùng, và refetch lại ngay khi màn hình mount lại hoặc cửa sổ được focus.
  // Kết hợp với invalidation đầy đủ ở các mutation -> sau create/update/delete
  // luôn lấy dữ liệu mới thay vì tái sử dụng cache cũ.
  keepUnusedDataFor: 0,
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  endpoints: () => ({}),
});
