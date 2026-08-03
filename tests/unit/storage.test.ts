import { authStorage } from '@/lib/storage';

describe('authStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('returns null token/user when nothing stored', () => {
    expect(authStorage.getToken()).toBeNull();
    expect(authStorage.getUser()).toBeNull();
  });

  it('save() with rememberMe=true writes to localStorage and clears sessionStorage', () => {
    authStorage.save('jwt-1', { id: 1 }, true);
    expect(window.localStorage.getItem('auth_token')).toBe('jwt-1');
    expect(window.sessionStorage.getItem('auth_token')).toBeNull();
  });

  it('save() with rememberMe=false writes to sessionStorage and clears localStorage', () => {
    authStorage.save('jwt-2', { id: 2 }, false);
    expect(window.sessionStorage.getItem('auth_token')).toBe('jwt-2');
    expect(window.localStorage.getItem('auth_token')).toBeNull();
  });

  it('switching rememberMe between logins clears the previously-used store', () => {
    authStorage.save('jwt-1', { id: 1 }, true);
    authStorage.save('jwt-2', { id: 2 }, false);

    expect(window.localStorage.getItem('auth_token')).toBeNull();
    expect(window.sessionStorage.getItem('auth_token')).toBe('jwt-2');
  });

  it('getToken() falls back to sessionStorage when not in localStorage', () => {
    window.sessionStorage.setItem('auth_token', 'session-jwt');
    expect(authStorage.getToken()).toBe('session-jwt');
  });

  it('getToken() prefers localStorage over sessionStorage', () => {
    window.localStorage.setItem('auth_token', 'local-jwt');
    window.sessionStorage.setItem('auth_token', 'session-jwt');
    expect(authStorage.getToken()).toBe('local-jwt');
  });

  it('getUser() parses the stored JSON', () => {
    authStorage.save('jwt', { id: 42, fullName: 'Ánh' }, true);
    expect(authStorage.getUser()).toEqual({ id: 42, fullName: 'Ánh' });
  });

  it('getUser() degrades to null instead of throwing on corrupted JSON', () => {
    window.localStorage.setItem('auth_user', '{not valid json');
    expect(() => authStorage.getUser()).not.toThrow();
    expect(authStorage.getUser()).toBeNull();
  });

  it('getUser() clears the corrupted entry so it does not keep failing', () => {
    window.localStorage.setItem('auth_user', 'not json at all');
    authStorage.getUser();
    expect(window.localStorage.getItem('auth_user')).toBeNull();
  });

  it('clear() removes token/user from both storages', () => {
    window.localStorage.setItem('auth_token', 'a');
    window.sessionStorage.setItem('auth_token', 'b');
    authStorage.clear();
    expect(authStorage.getToken()).toBeNull();
  });
});
