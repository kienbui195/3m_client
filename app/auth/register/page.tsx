'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegisterMutation } from '@/api/authApi';
import { AppLogo } from '@/components/AppLogo';
import { getErrorMessage } from '@/lib/errors';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,64}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [register, { isLoading }] = useRegisterMutation();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName || !email || !password || !confirmPassword) {
      setFormError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setFormError(
        'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&#).',
      );
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      const res = await register({ fullName, email, password }).unwrap();
      // Toast (mount ở root layout) sống xuyên qua cả redirect, để user còn
      // kịp đọc nhắc nhở "vào email kích hoạt tài khoản" trên trang login.
      toast.success(res.message, { duration: 8000 });
      setTimeout(() => router.replace('/auth/login'), 1500);
    } catch (err) {
      const message = getErrorMessage(err);
      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <div>
      <AppLogo />

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-foreground">Tạo tài khoản</h2>
          <p className="text-sm text-muted-foreground">Bắt đầu quản lý chi tiêu của bạn.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Họ và tên</Label>
              <Input
                id="fullName"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link href="/auth/login" className="font-semibold text-primary hover:underline">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
