import { baseApi } from '@/api/baseApi';
import { authStorage } from '@/lib/storage';
import { credentialsSet, userUpdated } from '@/store/authSlice';
import type { ApiMessage, User } from '@/types/api';

interface RegisterBody {
  fullName: string;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
  // Chỉ dùng ở client để chọn nơi lưu token (localStorage/sessionStorage),
  // không gửi lên API.
  rememberMe?: boolean;
}

interface LoginResponseData {
  jwt: string;
  id: number;
  username: string;
  fullName: string | null;
}

interface LoginResponse extends ApiMessage {
  data: LoginResponseData;
}

interface ChangePasswordBody {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<ApiMessage, RegisterBody>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),

    login: builder.mutation<LoginResponse, LoginBody>({
      query: ({ email, password }) => ({ url: '/auth/login', method: 'POST', body: { email, password } }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        const user: User = {
          id: data.data.id,
          documentId: '',
          username: data.data.username,
          email: arg.email,
          fullName: data.data.fullName,
          confirmed: true,
          blocked: false,
        };
        authStorage.save(data.data.jwt, user, arg.rememberMe ?? true);
        dispatch(credentialsSet({ token: data.data.jwt, user }));
      },
    }),

    resendMail: builder.mutation<ApiMessage, { email: string }>({
      query: ({ email }) => ({
        url: '/auth/resend-mail',
        method: 'POST',
        body: { email },
      }),
    }),

    verifyEmail: builder.mutation<ApiMessage, { verifytoken: string; email: string }>({
      query: ({ verifytoken, email }) => ({
        url: '/auth/verify-email',
        method: 'POST',
        headers: { verifytoken },
        body: { email },
      }),
    }),

    getMe: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: ['User'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(userUpdated(data));
      },
    }),

    changePassword: builder.mutation<ApiMessage, ChangePasswordBody>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),

    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useResendMailMutation,
  useVerifyEmailMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useChangePasswordMutation,
  useLogoutMutation,
} = authApi;
