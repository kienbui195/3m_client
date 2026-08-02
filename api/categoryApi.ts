import { baseApi } from '@/api/baseApi';
import type { Category, CategoryType, StrapiItemResponse, StrapiListResponse } from '@/types/api';

interface CategoryFormBody {
  name: string;
  slug?: string;
  desc?: string;
  // null = bỏ danh mục cha (chuyển thành danh mục gốc), undefined = giữ nguyên.
  parent?: string | null;
  icon?: string;
  // Chỉ có ý nghĩa khi tạo/sửa danh mục gốc - BE tự ép theo cha nếu là con.
  type?: CategoryType;
  color?: string | null;
}

export const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<Category[], void>({
      query: () => '/categories?populate[parent]=true&populate[children]=true&sort=name:asc',
      transformResponse: (response: StrapiListResponse<Category>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ documentId }) => ({ type: 'Category' as const, id: documentId })),
              { type: 'Category' as const, id: 'LIST' },
            ]
          : [{ type: 'Category' as const, id: 'LIST' }],
    }),

    // create idempotent ở BE theo (slug, user) - gọi lại với slug đã tồn tại
    // sẽ trả về bản ghi cũ thay vì lỗi/tạo trùng (vd: khi tạo danh mục con
    // ngay sau khi danh mục mặc định vừa được BE tự seed lúc tạo ví đầu tiên).
    createCategory: builder.mutation<Category, CategoryFormBody>({
      query: (data) => ({ url: '/categories', method: 'POST', body: { data } }),
      transformResponse: (response: StrapiItemResponse<Category>) => response.data,
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    updateCategory: builder.mutation<Category, { documentId: string; data: CategoryFormBody }>({
      query: ({ documentId, data }) => ({
        url: `/categories/${documentId}`,
        method: 'PUT',
        body: { data },
      }),
      transformResponse: (response: StrapiItemResponse<Category>) => response.data,
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    deleteCategory: builder.mutation<void, string>({
      query: (documentId) => ({ url: `/categories/${documentId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
