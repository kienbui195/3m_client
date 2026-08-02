'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGetMeQuery } from '@/api/authApi';
import { authStorage } from '@/lib/storage';
import { bootstrapped } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { User } from '@/types/api';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { token, isBootstrapping } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const storedToken = authStorage.getToken();
    const storedUser = authStorage.getUser<User>();
    dispatch(bootstrapped(storedToken && storedUser ? { token: storedToken, user: storedUser } : null));
  }, [dispatch]);

  // Xác thực lại token đã lưu khi mở app - nếu token hết hạn, baseApi sẽ tự
  // logout (xem baseQueryWithReauth trong src/api/baseApi.ts).
  useGetMeQuery(undefined, { skip: !token });

  useEffect(() => {
    if (!isBootstrapping && !token) {
      router.replace('/auth/login');
    }
  }, [isBootstrapping, token, router]);

  if (isBootstrapping || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
