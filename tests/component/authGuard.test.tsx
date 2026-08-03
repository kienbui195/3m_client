import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore } from '@/store';

const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

const getMe = jest.fn();
jest.mock('@/api/authApi', () => ({
  useGetMeQuery: (...args: unknown[]) => getMe(...args),
}));

const getToken = jest.fn();
const getUser = jest.fn();
jest.mock('@/lib/storage', () => ({
  authStorage: { getToken: (...args: unknown[]) => getToken(...args), getUser: (...args: unknown[]) => getUser(...args) },
}));

import { AuthGuard } from '@/components/AuthGuard';

function renderGuard() {
  return render(
    <Provider store={makeStore()}>
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    </Provider>,
  );
}

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMe.mockReturnValue({ data: undefined });
  });

  it('shows a spinner and redirects to /auth/login when there is no stored token', async () => {
    getToken.mockReturnValue(null);
    getUser.mockReturnValue(null);

    renderGuard();

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auth/login'));
  });

  it('renders children once bootstrapped with a valid stored token+user', async () => {
    getToken.mockReturnValue('jwt-token');
    getUser.mockReturnValue({ id: 1, documentId: 'd1', fullName: 'User' });

    renderGuard();

    expect(await screen.findByText('Protected content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('calls useGetMeQuery skipped (no token) rather than firing a request with an empty token', async () => {
    getToken.mockReturnValue(null);
    getUser.mockReturnValue(null);

    renderGuard();

    await waitFor(() => {
      const lastCall = getMe.mock.calls[getMe.mock.calls.length - 1];
      expect(lastCall?.[1]).toEqual({ skip: true });
    });
  });

  it('does not skip useGetMeQuery once a token is bootstrapped', async () => {
    getToken.mockReturnValue('jwt-token');
    getUser.mockReturnValue({ id: 1, documentId: 'd1', fullName: 'User' });

    renderGuard();

    await waitFor(() => {
      const lastCall = getMe.mock.calls[getMe.mock.calls.length - 1];
      expect(lastCall?.[1]).toEqual({ skip: false });
    });
  });
});
