'use client';

import { redirect, useParams } from 'next/navigation';

// Route cũ /wallets/{id} được giữ lại cho các link trỏ tới từ nơi khác - chỉ
// chuyển hướng sang trang Ví gộp (list + detail) với ví tương ứng được chọn
// sẵn qua query param, tránh trùng lặp UI chi tiết ví ở 2 nơi.
export default function WalletDetailRedirectPage() {
  const { id } = useParams<{ id: string }>();
  redirect(`/wallets?selected=${id}`);
}
