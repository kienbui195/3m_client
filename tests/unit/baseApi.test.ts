import { authApi } from '@/api/authApi';
import { makeStore } from '@/store';
import { credentialsSet } from '@/store/authSlice';
import { authStorage } from '@/lib/storage';
import type { User } from '@/types/api';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const user: User = {
  id: 1,
  documentId: '',
  username: 'u1',
  email: 'u1@test.local',
  fullName: 'User One',
  confirmed: true,
  blocked: false,
};

function jsonResponse(status: number, body: unknown) {
  const text = JSON.stringify(body);
  const headers = new Headers({ 'content-type': 'application/json' });
  const make = () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'OK',
    headers,
    json: async () => JSON.parse(text),
    text: async () => text,
    clone: () => make(),
  });
  return make();
}

describe('baseApi 401 re-auth handling', () => {
  const fetchMock = global.fetch as jest.Mock;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    fetchMock.mockReset();
  });

  it('clears persisted credentials and logs the user out when the API returns 401', async () => {
    authStorage.save('expired-jwt', user, true);
    fetchMock.mockResolvedValue(
      jsonResponse(401, { data: null, error: { status: 401, name: 'UnauthorizedError', message: 'Invalid token.' } }),
    );

    const store = makeStore();
    store.dispatch(credentialsSet({ token: 'expired-jwt', user }));

    await store.dispatch(authApi.endpoints.getMe.initiate() as never);

    expect(fetchMock).toHaveBeenCalled();
    expect(store.getState().auth.token).toBeNull();
    expect(authStorage.getToken()).toBeNull();
    expect(authStorage.getUser()).toBeNull();
  });

  it('keeps the session intact when the API returns a non-401 error', async () => {
    authStorage.save('valid-jwt', user, true);
    fetchMock.mockResolvedValue(
      jsonResponse(500, { data: null, error: { status: 500, name: 'ServerError', message: 'Server broke.' } }),
    );

    const store = makeStore();
    store.dispatch(credentialsSet({ token: 'valid-jwt', user }));

    await store.dispatch(authApi.endpoints.getMe.initiate() as never);

    expect(store.getState().auth.token).toBe('valid-jwt');
    expect(authStorage.getToken()).toBe('valid-jwt');
  });

  it('attaches the Bearer token from the auth slice on every request', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: user }));

    const store = makeStore();
    store.dispatch(credentialsSet({ token: 'abc-123', user }));

    await store.dispatch(authApi.endpoints.getMe.initiate() as never);

    const request = fetchMock.mock.calls[0][0] as { headers: Headers };
    expect(request.headers.get('Authorization')).toBe('Bearer abc-123');
  });
});

describe('authApi.login onQueryStarted', () => {
  const fetchMock = global.fetch as jest.Mock;

  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('persists jwt/user to storage and dispatches credentialsSet with rememberMe=false', async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        status: 'success',
        message: 'Đăng nhập thành công!',
        data: { jwt: 'jwt-new', id: 1, username: 'u1', fullName: 'User One' },
      }),
    );

    const store = makeStore();
    await store.dispatch(
      authApi.endpoints.login.initiate({ email: 'u1@test.local', password: 'Passw0rd!23', rememberMe: false }) as never,
    );

    expect(authStorage.getToken()).toBe('jwt-new');
    expect(window.sessionStorage.getItem('auth_token')).toBe('jwt-new');
    expect(window.localStorage.getItem('auth_token')).toBeNull();
    expect(store.getState().auth.token).toBe('jwt-new');
    expect(store.getState().auth.user?.fullName).toBe('User One');
  });
});
