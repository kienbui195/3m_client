import authReducer, {
  credentialsSet,
  userUpdated,
  bootstrapped,
  loggedOut,
} from '@/store/authSlice';
import type { User } from '@/types/api';

const initialState = { token: null, user: null, isBootstrapping: true };

const user: User = {
  id: 1,
  documentId: 'doc-1',
  username: 'user1',
  email: 'user1@test.local',
  fullName: 'User One',
  confirmed: true,
  blocked: false,
} as User;

describe('authSlice', () => {
  it('returns the initial state', () => {
    expect(authReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('credentialsSet stores token+user without touching isBootstrapping', () => {
    const state = authReducer(initialState, credentialsSet({ token: 'jwt', user }));
    expect(state).toEqual({ token: 'jwt', user, isBootstrapping: true });
  });

  it('userUpdated replaces only the user', () => {
    const start = { token: 'jwt', user, isBootstrapping: false };
    const updated: User = { ...user, fullName: 'New Name' };
    const state = authReducer(start, userUpdated(updated));
    expect(state).toEqual({ token: 'jwt', user: updated, isBootstrapping: false });
  });

  it('bootstrapped(payload) sets token/user and flips isBootstrapping to false', () => {
    const state = authReducer(initialState, bootstrapped({ token: 'jwt', user }));
    expect(state).toEqual({ token: 'jwt', user, isBootstrapping: false });
  });

  it('bootstrapped(null) resets token/user to null (the "not logged in" path)', () => {
    const start = { token: 'jwt', user, isBootstrapping: true };
    const state = authReducer(start, bootstrapped(null));
    expect(state).toEqual({ token: null, user: null, isBootstrapping: false });
  });

  it('loggedOut clears token/user but leaves isBootstrapping untouched', () => {
    const start = { token: 'jwt', user, isBootstrapping: false };
    const state = authReducer(start, loggedOut());
    expect(state).toEqual({ token: null, user: null, isBootstrapping: false });
  });
});
