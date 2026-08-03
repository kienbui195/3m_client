import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let searchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

const verifyEmail = jest.fn();
const resendMail = jest.fn();
jest.mock('@/api/authApi', () => ({
  useVerifyEmailMutation: () => [verifyEmail],
  useResendMailMutation: () => [resendMail, { isLoading: false }],
}));

import VerifyEmailPage from '@/app/auth/verify-email/page';

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
  });

  it('shows an error and a resend button when verification fails', async () => {
    searchParams = new URLSearchParams({ token: 'expired-token' });
    verifyEmail.mockReturnValue({ unwrap: () => Promise.reject({ data: { error: { message: 'Mã không hợp lệ!' } } }) });

    render(<VerifyEmailPage />);

    expect(await screen.findByText('Mã không hợp lệ!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gửi lại email xác thực/i })).toBeInTheDocument();
  });

  it('resend button calls resendMail with the invalidtoken header payload', async () => {
    searchParams = new URLSearchParams({ token: 'expired-token' });
    verifyEmail.mockReturnValue({ unwrap: () => Promise.reject({ data: { error: { message: 'Mã không hợp lệ!' } } }) });
    resendMail.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'Đã gửi lại email.' }) });

    const user = userEvent.setup();
    render(<VerifyEmailPage />);
    await screen.findByRole('button', { name: /gửi lại email xác thực/i });

    await user.click(screen.getByRole('button', { name: /gửi lại email xác thực/i }));

    await waitFor(() => expect(resendMail).toHaveBeenCalledWith({ invalidtoken: 'expired-token' }));
    expect(await screen.findByText('Đã gửi lại email.')).toBeInTheDocument();
  });
});
