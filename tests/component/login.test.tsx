import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

const login = jest.fn();
jest.mock('@/api/authApi', () => ({
  useLoginMutation: () => [login, { isLoading: false }],
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args), error: (...args: unknown[]) => toastError(...args) },
}));

import LoginPage from '@/app/auth/login/page';

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call login when email/password are empty', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText(/vui lòng nhập đầy đủ/i)).toBeInTheDocument();
  });

  it('submits credentials and redirects on success', async () => {
    login.mockReturnValue({ unwrap: () => Promise.resolve({ data: { id: 1, username: 'u1', fullName: 'User One' } }) });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'user@test.com');
    await user.type(screen.getByLabelText(/mật khẩu/i), 'Passw0rd!23');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ email: 'user@test.com', password: 'Passw0rd!23', rememberMe: true });
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('shows the API error message and does not redirect on failure', async () => {
    login.mockReturnValue({
      unwrap: () => Promise.reject({ data: { error: { message: 'Email hoặc mật khẩu không chính xác!' } } }),
    });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'user@test.com');
    await user.type(screen.getByLabelText(/mật khẩu/i), 'WrongPass!23');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    expect(await screen.findByText('Email hoặc mật khẩu không chính xác!')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('unchecking "remember me" is passed through to login()', async () => {
    login.mockReturnValue({ unwrap: () => Promise.resolve({ data: { id: 1, username: 'u1', fullName: null } }) });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('checkbox', { name: /ghi nhớ đăng nhập/i }));
    await user.type(screen.getByLabelText(/email/i), 'user@test.com');
    await user.type(screen.getByLabelText(/mật khẩu/i), 'Passw0rd!23');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ email: 'user@test.com', password: 'Passw0rd!23', rememberMe: false });
    });
  });
});
