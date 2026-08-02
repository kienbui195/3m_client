'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoginMutation } from '@/api/authApi';
import { AppLogo } from '@/components/AppLogo';
import { getErrorMessage } from '@/lib/errors';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [login, { isLoading }] = useLoginMutation();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    try {
      const res = await login({ email, password, rememberMe }).unwrap();
      // Toast sống xuyên qua redirect (Toaster mount ở root layout) nên vẫn
      // hiện được trên trang chủ ngay sau khi chuyển trang.
      toast.success(`Chào mừng trở lại, ${res.data.fullName || res.data.username}!`);
      router.replace('/');
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
          <h2 className="text-xl font-bold text-foreground">Đăng nhập</h2>
          <p className="text-sm text-muted-foreground">Chào mừng bạn quay lại!</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
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
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <Label htmlFor="remember-me" className="text-sm font-normal text-muted-foreground">
                Ghi nhớ đăng nhập
              </Label>
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link href="/auth/register" className="font-semibold text-primary hover:underline">
              Đăng ký
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
