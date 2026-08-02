'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useResendMailMutation, useVerifyEmailMutation } from '@/api/authApi';
import { AppLogo } from '@/components/AppLogo';
import { getErrorMessage } from '@/lib/errors';

type Status = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div>
          <AppLogo />
          <Card>
            <CardContent className="flex justify-center py-10">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  console.log(token);
  

  const [verifyEmail] = useVerifyEmailMutation();
  const [resendMail, { isLoading: isResending }] = useResendMailMutation();

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState(token ? '' : 'Liên kết xác thực không hợp lệ.');
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    verifyEmail({ verifytoken: token })
      .unwrap()
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(getErrorMessage(err, 'Xác thực email thất bại.'));
      });
  }, [token, verifyEmail]);

  const onResend = async () => {
    if (!token) return;
    setResendMessage(null);
    try {
      const res = await resendMail({ invalidtoken: token }).unwrap();
      setResendMessage(res.message);
    } catch (err) {
      setResendMessage(getErrorMessage(err));
    }
  };

  return (
    <div>
      <AppLogo />

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-foreground">Xác thực email</h2>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          {status === 'verifying' && (
            <>
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Đang xác thực email của bạn...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircleIcon className="size-12 text-emerald-500" weight="fill" />
              <p className="text-sm text-foreground">{message}</p>
              <Button nativeButton={false} render={<Link href="/auth/login">Đăng nhập ngay</Link>} />
            </>
          )}

          {status === 'error' && (
            <>
              <XCircleIcon className="size-12 text-destructive" weight="fill" />
              <p className="text-sm text-foreground">{message}</p>

              {token ? (
                <div className="flex flex-col items-center gap-2">
                  <Button variant="outline" onClick={onResend} disabled={isResending}>
                    {isResending ? 'Đang gửi lại...' : 'Gửi lại email xác thực'}
                  </Button>
                  {resendMessage ? (
                    <p className="text-xs text-muted-foreground">{resendMessage}</p>
                  ) : null}
                </div>
              ) : null}

              <Link href="/auth/login" className="text-sm font-semibold text-primary hover:underline">
                Về trang đăng nhập
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
