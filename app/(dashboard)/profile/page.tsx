'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircleIcon, SignOutIcon } from '@phosphor-icons/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogoutMutation } from '@/api/authApi';
import { CategoryManager } from '@/components/CategoryManager';
import { ReportCharts } from '@/components/ReportCharts';
import { SingleSelectToggle } from '@/components/SingleSelectToggle';
import { authStorage } from '@/lib/storage';
import { loggedOut } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const TAB_OPTIONS = [
  { value: 'reports', label: '📊 Báo Cáo Biểu Đồ' },
  { value: 'categories', label: '📑 Quản Lý Danh Mục (2 Cấp)' },
  { value: 'profile', label: '👤 Hồ Sơ Cá Nhân' },
] as const;

type TabValue = (typeof TAB_OPTIONS)[number]['value'];

export default function ProfilePage() {
  const [tab, setTab] = useState<TabValue>('reports');
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [logout] = useLogoutMutation();

  const onLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // best-effort: vẫn xóa session cục bộ dù request logout thất bại
    }
    authStorage.clear();
    dispatch(loggedOut());
    toast.success('Đã đăng xuất.');
    router.replace('/auth/login');
  };

  const onSaveProfile = () => toast.info('Tính năng đang được phát triển.');

  const initials = (user?.fullName || user?.username || '?').slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SingleSelectToggle options={[...TAB_OPTIONS]} value={tab} onChange={setTab} />
        <Button variant="outline" onClick={onLogout}>
          <SignOutIcon />
          Đăng xuất
        </Button>
      </div>

      {tab === 'reports' && <ReportCharts />}

      {tab === 'categories' && <CategoryManager />}

      {tab === 'profile' && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <Avatar className="size-14">
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-bold text-foreground">{user?.fullName || user?.username}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chỉnh Sửa Thông Tin Cá Nhân</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-fullname">Họ và tên *</Label>
                <Input id="profile-fullname" value={user?.fullName || user?.username || ''} disabled />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Địa chỉ Email</Label>
                <Input id="profile-email" value={user?.email ?? ''} disabled />
                {user?.confirmed && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircleIcon className="size-3.5" />
                    Email đã xác thực thành công
                  </span>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={onSaveProfile}>Lưu Hồ Sơ</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
