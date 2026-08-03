import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

const registerMutation = jest.fn();
jest.mock('@/api/authApi', () => ({
  useRegisterMutation: () => [registerMutation, { isLoading: false }],
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args), error: (...args: unknown[]) => toastError(...args) },
}));

import RegisterPage from '@/app/auth/register/page';

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  { fullName = 'Nguyen Van A', email = 'a@test.com', password = 'Passw0rd!23', confirm = 'Passw0rd!23' } = {},
) {
  await user.type(screen.getByLabelText(/họ và tên/i), fullName);
  await user.type(screen.getByLabelText(/^email$/i), email);
  await user.type(screen.getByLabelText(/^mật khẩu$/i), password);
  await user.type(screen.getByLabelText(/xác nhận mật khẩu/i), confirm);
}

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects an empty submit without calling the API', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RegisterPage />);
    await user.click(screen.getByRole('button', { name: /đăng ký/i }));
    expect(registerMutation).not.toHaveBeenCalled();
    expect(screen.getByText(/vui lòng nhập đầy đủ thông tin/i)).toBeInTheDocument();
  });

  it('rejects a weak password before checking password confirmation match', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RegisterPage />);
    // Weak password AND mismatched confirm - password error should win.
    await fillForm(user, { password: 'weak', confirm: 'somethingElse' });
    await user.click(screen.getByRole('button', { name: /đăng ký/i }));

    expect(registerMutation).not.toHaveBeenCalled();
    expect(screen.getByText(/ít nhất 8 ký tự/i)).toBeInTheDocument();
  });

  it('rejects a strong-but-mismatched confirm password', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RegisterPage />);
    await fillForm(user, { password: 'Passw0rd!23', confirm: 'Different!23' });
    await user.click(screen.getByRole('button', { name: /đăng ký/i }));

    expect(registerMutation).not.toHaveBeenCalled();
    expect(screen.getByText(/xác nhận không khớp/i)).toBeInTheDocument();
  });

  it.each([
    ['no uppercase', 'passw0rd!23'],
    ['no lowercase', 'PASSW0RD!23'],
    ['no digit', 'Password!ab'],
    ['no special char', 'Passw0rd123'],
    ['too short', 'Pas0!'],
  ])('rejects password: %s', async (_label, password) => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RegisterPage />);
    await fillForm(user, { password, confirm: password });
    await user.click(screen.getByRole('button', { name: /đăng ký/i }));
    expect(registerMutation).not.toHaveBeenCalled();
  });

  it('accepts a valid password exactly at the 64-char boundary', async () => {
    const password = `Aa1!${'a'.repeat(60)}`; // 64 chars total
    expect(password).toHaveLength(64);
    registerMutation.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'ok' }) });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RegisterPage />);
    await fillForm(user, { password, confirm: password });
    await user.click(screen.getByRole('button', { name: /đăng ký/i }));

    await waitFor(() => expect(registerMutation).toHaveBeenCalled());
  });

  it('submits and redirects to login after a delay on success', async () => {
    registerMutation.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'Đăng ký thành công!' }) });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RegisterPage />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /đăng ký/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Đăng ký thành công!', { duration: 8000 }));
    expect(replace).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1500);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auth/login'));
  });

  it('shows the API error message on failure', async () => {
    registerMutation.mockReturnValue({
      unwrap: () => Promise.reject({ data: { error: { message: 'Email này đã được đăng ký' } } }),
    });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RegisterPage />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /đăng ký/i }));

    expect(await screen.findByText('Email này đã được đăng ký')).toBeInTheDocument();
  });
});
