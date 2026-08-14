import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let searchParams = new URLSearchParams();
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ replace }),
}));

const verifyEmail = jest.fn();
const resendMail = jest.fn();
jest.mock('@/api/authApi', () => ({
  useVerifyEmailMutation: () => [verifyEmail],
  useResendMailMutation: () => [resendMail, { isLoading: false }],
}));

import VerifyEmailPage from '@/app/auth/verify-email/page';

const rejectWith = (message: string, code?: string) => ({
  unwrap: () => Promise.reject({ data: { error: { message, details: code ? { code } : undefined } } }),
});

/** Chạy hết 3s đếm ngược của màn hình xác thực. */
const advanceCountdown = async () => {
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
};

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchParams = new URLSearchParams();
  });

  it('shows an invalid-link error immediately when there is no token, without calling the API', () => {
    render(<VerifyEmailPage />);
    expect(screen.getByText(/liên kết xác thực không hợp lệ/i)).toBeInTheDocument();
    expect(verifyEmail).not.toHaveBeenCalled();
  });

  it('does not show the resend button when there is no token', () => {
    render(<VerifyEmailPage />);
    expect(screen.queryByRole('button', { name: /gửi lại email xác thực/i })).not.toBeInTheDocument();
  });

  it('verifies automatically on mount when a token is present, and shows success', async () => {
    searchParams = new URLSearchParams({ token: 'abc123' });
    verifyEmail.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'Xác thực thành công!' }) });

    render(<VerifyEmailPage />);

    await waitFor(() => expect(verifyEmail).toHaveBeenCalledWith({ verifytoken: 'abc123' }));
    expect(await screen.findByText('Xác thực thành công!')).toBeInTheDocument();
    expect(screen.getByText(/tự động chuyển về trang đăng nhập/i)).toBeInTheDocument();
  });

  describe('with fake timers', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('redirects to login 3s after a successful verification', async () => {
      searchParams = new URLSearchParams({ token: 'abc123' });
      verifyEmail.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'Xác thực thành công!' }) });

      render(<VerifyEmailPage />);
      await act(async () => {});

      expect(replace).not.toHaveBeenCalled();
      await advanceCountdown();
      expect(replace).toHaveBeenCalledWith('/auth/login');
    });

    it.each([
      ['ALREADY_CONFIRMED', 'Tài khoản đã được xác thực, vui lòng đăng nhập.'],
      ['ACCOUNT_BLOCKED', 'Tài khoản của bạn đã bị khóa.'],
      ['ACCOUNT_DELETED', 'Tài khoản đã bị xóa.'],
    ])('shows %s and redirects to login after 3s without offering a resend', async (code, message) => {
      searchParams = new URLSearchParams({ token: 'abc123' });
      verifyEmail.mockReturnValue(rejectWith(message, code));

      render(<VerifyEmailPage />);
      await act(async () => {});

      expect(screen.getByText(message)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /gửi lại email xác thực/i })).not.toBeInTheDocument();

      await advanceCountdown();
      expect(replace).toHaveBeenCalledWith('/auth/login');
    });

    it('keeps the resend button disabled for 3s on an invalid token, then enables it', async () => {
      searchParams = new URLSearchParams({ token: 'expired-token' });
      verifyEmail.mockReturnValue(rejectWith('Mã không hợp lệ!', 'INVALID_TOKEN'));

      render(<VerifyEmailPage />);
      await act(async () => {});

      expect(screen.getByText('Mã không hợp lệ!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /gửi lại email xác thực/i })).toBeDisabled();

      await advanceCountdown();

      expect(screen.getByRole('button', { name: /gửi lại email xác thực/i })).toBeEnabled();
      expect(replace).not.toHaveBeenCalled();
    });
  });

  it('resend button calls resendMail with the invalidtoken header payload', async () => {
    searchParams = new URLSearchParams({ token: 'expired-token' });
    verifyEmail.mockReturnValue(rejectWith('Mã không hợp lệ!', 'INVALID_TOKEN'));
    resendMail.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'Đã gửi lại email.' }) });

    const user = userEvent.setup();
    render(<VerifyEmailPage />);

    // Nút chỉ mở sau 3s đếm ngược nên phải nới timeout mặc định (1s) của waitFor.
    await waitFor(
      () => expect(screen.getByRole('button', { name: /gửi lại email xác thực/i })).toBeEnabled(),
      { timeout: 5000 },
    );

    await user.click(screen.getByRole('button', { name: /gửi lại email xác thực/i }));

    await waitFor(() => expect(resendMail).toHaveBeenCalledWith({ invalidtoken: 'expired-token' }));
    expect(await screen.findByText('Đã gửi lại email.')).toBeInTheDocument();
  });
});
