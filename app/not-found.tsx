'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Bắt mọi URL không khớp route nào trong app (kể từ Next.js 13.3, root
// app/not-found.tsx tự xử lý toàn bộ unmatched URL) - khác với việc 1 API
// trả về 404 (đó là lỗi dữ liệu, xử lý riêng ở từng page/query, không qua đây).
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
