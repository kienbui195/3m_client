import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types/api';

interface AuthState {
  token: string | null;
  user: User | null;
  isBootstrapping: boolean;
}

const initialState: AuthState = {
  token: null,
  user: null,
  isBootstrapping: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsSet(state, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    userUpdated(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    bootstrapped(state, action: PayloadAction<{ token: string; user: User } | null>) {
      state.token = action.payload?.token ?? null;
      state.user = action.payload?.user ?? null;
      state.isBootstrapping = false;
    },
    loggedOut(state) {
      state.token = null;
      state.user = null;
    },
  },
});

export const { credentialsSet, userUpdated, bootstrapped, loggedOut } = authSlice.actions;
export default authSlice.reducer;
