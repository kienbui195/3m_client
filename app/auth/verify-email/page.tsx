'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircleIcon, WarningCircleIcon, XCircleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useResendMailMutation, useVerifyEmailMutation } from '@/api/authApi';
import { AppLogo } from '@/components/AppLogo';
import { getErrorCode, getErrorMessage } from '@/lib/errors';

// Thời gian đếm ngược (giây) trước khi tự chuyển về trang đăng nhập, cũng là
// thời gian chờ trước khi bật nút gửi lại mail xác thực.
const COUNTDOWN_SECONDS = 3;

const LOGIN_PATH = '/auth/login';

type Outcome =
  // Xác thực thành công -> chuyển về login
  | 'success'
  // Lỗi nhưng tài khoản đã tồn tại/không thể xác thực lại (đã xác thực, bị
  // khóa, bị xóa) -> chỉ báo và chuyển về login
  | 'redirect'
  // Token sai/hết hạn -> cho gửi lại mail xác thực
  | 'invalid';

type Status = 'verifying' | Outcome;

// Map code từ API sang cách UI xử lý. Code lạ (hoặc lỗi mạng/500) rơi vào
// 'invalid' để user vẫn còn đường gửi lại mail.
const OUTCOME_BY_CODE: Record<string, Outcome> = {
  ALREADY_CONFIRMED: 'redirect',
  ACCOUNT_BLOCKED: 'redirect',
  ACCOUNT_DELETED: 'redirect',
  INVALID_TOKEN: 'invalid',
};

function LoadingCard() {
  return (
    <Card>
      <CardContent className="flex justify-center py-10">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div>
      <AppLogo />
      <Suspense fallback={<LoadingCard />}>
        <VerifyEmailCard />
      </Suspense>
    </div>
  );
}

function VerifyEmailCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Link verify có sẵn cả token lẫn email đăng ký (xem send-mail.ts ở BE) -
  // email cần thiết để bấm gửi lại mail khi token sai/hết hạn.
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [verifyEmail] = useVerifyEmailMutation();
  const [resendMail, { isLoading: isResending }] = useResendMailMutation();

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'invalid');
  const [message, setMessage] = useState(
    token ? '' : 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.',
  );
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  // Chỉ gọi API 1 lần: StrictMode ở dev mount component 2 lần, gọi 2 lần sẽ
  // khiến lần thứ hai trả về ALREADY_CONFIRMED và ghi đè màn hình thành công.
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!token || verifiedRef.current) return;
    verifiedRef.current = true;

    verifyEmail({ verifytoken: token, email: email ?? '' })
      .unwrap()
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus(OUTCOME_BY_CODE[getErrorCode(err) ?? ''] ?? 'invalid');
        setMessage(getErrorMessage(err, 'Xác thực email thất bại.'));
      });
  }, [token, email, verifyEmail]);

  // Đếm ngược dùng chung cho cả 2 nhánh: chuyển hướng về login (success /
  // redirect) và mở khóa nút gửi lại mail (invalid).
  useEffect(() => {
    if (status === 'verifying') return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (countdown > 0) return;
    if (status !== 'success' && status !== 'redirect') return;

    router.replace(LOGIN_PATH);
  }, [countdown, status, router]);

  const onResend = useCallback(async () => {
    if (!email) return;
    setResendMessage(null);
    try {
      const res = await resendMail({ email }).unwrap();
      setResendMessage(res.message);
    } catch (err) {
      setResendMessage(getErrorMessage(err));
    }
  }, [resendMail, email]);

  if (status === 'verifying') {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-foreground">Xác thực email</h2>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang xác thực email của bạn...</p>
        </CardContent>
      </Card>
    );
  }

  const isRedirecting = status === 'success' || status === 'redirect';

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold text-foreground">
          {status === 'success' ? 'Xác thực thành công' : 'Xác thực không thành công'}
        </h2>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4 text-center">
        {status === 'success' ? (
          <CheckCircleIcon className="size-12 text-emerald-500" weight="fill" />
        ) : status === 'redirect' ? (
          <WarningCircleIcon className="size-12 text-amber-500" weight="fill" />
        ) : (
          <XCircleIcon className="size-12 text-destructive" weight="fill" />
        )}

        <p className="text-sm text-foreground">{message}</p>

        {isRedirecting ? (
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {countdown > 0
                ? `Tự động chuyển về trang đăng nhập sau ${countdown}s...`
                : 'Đang chuyển về trang đăng nhập...'}
            </p>
            <Button
              nativeButton={false}
              render={<Link href={LOGIN_PATH}>Đăng nhập ngay</Link>}
            />
          </>
        ) : (
          <div className="flex w-full flex-col items-center gap-2">
            {/* Không có email thì không gửi lại được (BE tìm user theo email
                từ link verify), chỉ còn đường quay về login. */}
            {email ? (
              <Button
                variant="outline"
                onClick={onResend}
                disabled={countdown > 0 || isResending}
              >
                {isResending
                  ? 'Đang gửi lại...'
                  : countdown > 0
                    ? `Gửi lại email xác thực (${countdown}s)`
                    : 'Gửi lại email xác thực'}
              </Button>
            ) : null}

            {resendMessage ? (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {resendMessage}
              </p>
            ) : null}

            <Link
              href={LOGIN_PATH}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Về trang đăng nhập
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
