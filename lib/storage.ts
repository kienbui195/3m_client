const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

const isBrowser = () => typeof window !== 'undefined';

// "Ghi nhớ đăng nhập": true -> localStorage (giữ qua các lần đóng/mở trình
// duyệt), false -> sessionStorage (mất khi đóng tab/trình duyệt).
export const authStorage = {
  getToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
  },
  getUser<T>(): T | null {
    if (!isBrowser()) return null;
    const raw = window.localStorage.getItem(USER_KEY) ?? window.sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  save(token: string, user: unknown, rememberMe = true) {
    if (!isBrowser()) return;
    const store = rememberMe ? window.localStorage : window.sessionStorage;
    const other = rememberMe ? window.sessionStorage : window.localStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
  },
  clear() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
  },
};
