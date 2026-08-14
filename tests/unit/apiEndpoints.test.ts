import { transactionApi } from '@/api/transactionApi';
import { walletApi } from '@/api/walletApi';
import { budgetApi } from '@/api/budgetApi';
import { categoryApi } from '@/api/categoryApi';
import { reportApi } from '@/api/reportApi';
import { notificationApi } from '@/api/notificationApi';
import { makeStore } from '@/store';
function jsonResponse(status: number, body: unknown) {
  const text = JSON.stringify(body);
  const headers = new Headers({ 'content-type': 'application/json' });
  const make = () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers,
    json: async () => JSON.parse(text),
    text: async () => text,
    clone: () => make(),
  });
  return make();
}

const emptyList = { data: [], meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } } };

const fetchMock = global.fetch as jest.Mock;

afterEach(() => {
  fetchMock.mockReset();
});

/**
 * Runs a query against a real store with a mocked fetch, returning both the
 * request URLs RTK Query produced and the final (post-transform) result.
 */
async function runQuery<A>(initiate: (arg: A) => unknown, arg: A) {
  const calls: string[] = [];
  fetchMock.mockImplementation((input: { url: string }) => {
    calls.push(input.url);
    return Promise.resolve(jsonResponse(200, emptyList));
  });
  const store = makeStore();
  const res = await store.dispatch(initiate(arg) as never) as { data?: unknown };
  return { calls, data: res.data };
}

describe('transactionApi', () => {
  it('getRecentTransactions builds a URL with limit, sort and populates', async () => {
    const { calls } = await runQuery(transactionApi.endpoints.getRecentTransactions.initiate, { limit: 3 });
    const url = calls[0];
    expect(url).toContain('/transactions?');
    expect(url).toContain('sort=transactionDate:desc');
    expect(url).toContain('pagination[limit]=3');
    expect(url).toContain('populate[categoryId][populate][parent][fields][0]=name');
    expect(url).toContain('populate[walletId][fields][0]=name');
  });

  it('getRecentTransactions defaults to a limit of 5', async () => {
    const { calls } = await runQuery(transactionApi.endpoints.getRecentTransactions.initiate, undefined);
    expect(calls[0]).toContain('pagination[limit]=5');
  });

  it('getRecentTransactions unwraps the list payload', async () => {
    const { data } = await runQuery(transactionApi.endpoints.getRecentTransactions.initiate, { limit: 3 });
    expect(data).toEqual([]);
  });

  it('getBudgetSpent builds month/year UTC-range filters with a category filter', async () => {
    const { calls } = await runQuery(transactionApi.endpoints.getBudgetSpent.initiate, {
      walletId: 'w1',
      categoryId: 'c1',
      month: 2,
      year: 2026,
    });
    const url = calls[0];
    expect(url).toContain('filters[walletId][documentId]=w1');
    expect(url).toContain('filters[type]=expense');
    expect(url).toContain('filters[categoryId][documentId]=c1');
    expect(url).toContain('filters[transactionDate][$gte]=');
    expect(url).toContain('filters[transactionDate][$lt]=');
  });

  it('getBudgetSpent omits the category filter when no category is given', async () => {
    const { calls } = await runQuery(transactionApi.endpoints.getBudgetSpent.initiate, {
      walletId: 'w1',
      month: 1,
      year: 2026,
    });
    expect(calls[0]).not.toContain('categoryId');
  });

  it('getBudgetSpent transformResponse sums the amount fields', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        data: [{ amount: 100 }, { amount: 200 }, { amount: 0 }],
        meta: { pagination: { page: 1, pageSize: 200, pageCount: 1, total: 3 } },
      }),
    );
    const store = makeStore();
    const res = await store.dispatch(
      transactionApi.endpoints.getBudgetSpent.initiate({ walletId: 'w1', month: 2, year: 2026 }) as never,
    ) as { data?: number };
    expect(res.data).toBe(300);
  });
});

describe('walletApi', () => {
  it('getWallets hits the list endpoint', async () => {
    const { calls } = await runQuery(walletApi.endpoints.getWallets.initiate, undefined);
    expect(calls[0]).toContain('/wallets');
  });

  it('deleteWallet hits the custom soft-delete route', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { message: 'Thành công.' }));
    const store = makeStore();
    await store.dispatch(walletApi.endpoints.deleteWallet.initiate('w9') as never);
    const request = fetchMock.mock.calls[0][0] as { url: string; method: string };
    expect(request.url).toContain('/wallets/delete-wallet/w9');
    expect(request.method).toBe('DELETE');
  });

  it('createWallet invalidates the Category LIST tag so seeded default categories refetch', async () => {
    // Mô phỏng: user đã từng mở trang báo cáo -> danh mục bị cache rỗng
    // trước khi tạo ví đầu tiên (BE sẽ seed 22 danh mục mặc định).
    const store = makeStore();
    let categoryFetches = 0;
    fetchMock.mockImplementation((input: { url: string }) => {
      if (input.url.includes('/categories')) {
        categoryFetches += 1;
        return Promise.resolve(jsonResponse(200, emptyList));
      }
      return Promise.resolve(
        jsonResponse(200, { data: { documentId: 'w1', name: 'Ví', type: 'cash', balance: 0, index: 1 } }),
      );
    });

    await store.dispatch(categoryApi.endpoints.getCategories.initiate(undefined) as never);
    expect(categoryFetches).toBe(1);

    await store.dispatch(
      walletApi.endpoints.createWallet.initiate({ name: 'Ví', type: 'cash', balance: 0 }) as never,
    );

    // Chờ refetch do invalidation của RTK Query (Category LIST bị invalidate).
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(categoryFetches).toBeGreaterThanOrEqual(2);
  });
});

describe('budgetApi / categoryApi / notificationApi', () => {
  it('getBudgets populates wallet and category and sorts by period', async () => {
    const { calls } = await runQuery(budgetApi.endpoints.getBudgets.initiate, undefined);
    const url = calls[0];
    expect(url).toContain('populate[walletId]=true');
    expect(url).toContain('populate[categoryId]=true');
    expect(url).toContain('sort=periodYear:desc,periodMonth:desc');
  });

  it('getCategories populates parent and children', async () => {
    const { calls } = await runQuery(categoryApi.endpoints.getCategories.initiate, undefined);
    expect(calls[0]).toContain('populate[parent]=true');
    expect(calls[0]).toContain('populate[children]=true');
  });

  it('category create/update/delete invalidate the Category LIST so the list refetches', async () => {
    // Nếu invalidation không chạy, danh mục tạo/sửa/xóa sẽ không hiện/dừng
    // hiển thị ngay trên UI do tái sử dụng cache cũ.
    const store = makeStore();
    let listFetches = 0; // chỉ đếm GET danh sách, không đếm PUT/DELETE mutation
    fetchMock.mockImplementation((input: { url: string; method?: string }) => {
      const method = input.method ?? 'GET';
      if (input.url.includes('/categories')) {
        if (method === 'GET') listFetches += 1;
        return Promise.resolve(jsonResponse(200, emptyList));
      }
      return Promise.resolve(
        jsonResponse(200, { data: { documentId: 'c9', name: 'X', type: 'expense', color: null, icon: null } }),
      );
    });

    const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

    await store.dispatch(categoryApi.endpoints.getCategories.initiate(undefined) as never);
    expect(listFetches).toBe(1);

    await store.dispatch(categoryApi.endpoints.createCategory.initiate({ name: 'Mới' }) as never);
    await settle();
    expect(listFetches).toBeGreaterThanOrEqual(2);

    await store.dispatch(
      categoryApi.endpoints.updateCategory.initiate({ documentId: 'c9', data: { name: 'Sửa' } }) as never,
    );
    await settle();
    expect(listFetches).toBeGreaterThanOrEqual(3);

    await store.dispatch(categoryApi.endpoints.deleteCategory.initiate('c9') as never);
    await settle();
    expect(listFetches).toBeGreaterThanOrEqual(4);
  });

  it('markNotificationRead PUTs isRead:true', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { isRead: true } }));
    const store = makeStore();
    await store.dispatch(notificationApi.endpoints.markNotificationRead.initiate('n5') as never);
    const request = fetchMock.mock.calls[0][0] as { url: string; method: string; body?: string };
    expect(request.url).toContain('/notifications/n5');
    expect(request.method).toBe('PUT');
    expect(JSON.parse(request.body ?? '{}')).toEqual({ data: { isRead: true } });
  });
});

describe('reportApi', () => {
  it('getReportSummary appends walletId only when provided', async () => {
    const withWallet = await runQuery(reportApi.endpoints.getReportSummary.initiate, {
      granularity: 'month',
      from: '2026-01-01',
      to: '2026-01-31',
      walletId: 'w1',
    });
    expect(withWallet.calls[0]).toContain('walletId=w1');
    expect(withWallet.calls[0]).toContain('granularity=month');

    const withoutWallet = await runQuery(reportApi.endpoints.getReportSummary.initiate, {
      granularity: 'day',
      from: '2026-01-01',
      to: '2026-01-31',
    });
    expect(withoutWallet.calls[0]).not.toContain('walletId');
  });

  it('getReportCompare defaults compareWith to previous_month', async () => {
    const { calls } = await runQuery(reportApi.endpoints.getReportCompare.initiate, { month: 3, year: 2026 });
    expect(calls[0]).toContain('compareWith=previous_month');
  });

  it('transformResponse unwraps the data envelope', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        data: {
          current: { label: '1/2026', income: 10, expense: 5 },
          previous: { label: '12/2025', income: 8, expense: 6 },
        },
      }),
    );
    const store = makeStore();
    const res = await store.dispatch(
      reportApi.endpoints.getReportCompare.initiate({ month: 1, year: 2026 }) as never,
    ) as { data?: { current: { income: number }; previous: { label: string } } };
    expect(res.data?.current.income).toBe(10);
    expect(res.data?.previous.label).toBe('12/2025');
  });
});

describe('transactionApi update + count (items 5/6)', () => {
  it('updateTransaction PUTs to /transactions/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { documentId: 't1' } }));
    const store = makeStore();
    await store.dispatch(
      transactionApi.endpoints.updateTransaction.initiate({
        documentId: 't1',
        data: { type: 'expense', amount: 100, walletId: 'w1', categoryId: 'c1' },
      }) as never,
    );
    const request = fetchMock.mock.calls[0][0] as { url: string; method: string };
    expect(request.url).toContain('/transactions/t1');
    expect(request.method).toBe('PUT');
  });

  it('countTransactionsByCategory builds a total-count query for the category', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        data: [],
        meta: { pagination: { page: 1, pageSize: 1, pageCount: 0, total: 7 } },
      }),
    );
    const store = makeStore();
    const res = await store.dispatch(
      transactionApi.endpoints.countTransactionsByCategory.initiate('c1') as never,
    ) as { data?: number };
    const request = fetchMock.mock.calls[0][0] as { url: string };
    expect(request.url).toContain('filters[categoryId][documentId]=c1');
    expect(request.url).toContain('pagination[pageSize]=1');
    expect(res.data).toBe(7);
  });
});

describe('budgetApi progress endpoint (item 7)', () => {
  it('getBudgetProgress hits /budgets/progress/:walletId with month/year', async () => {
    const { calls } = await runQuery(budgetApi.endpoints.getBudgetProgress.initiate, {
      walletId: 'w1',
      month: 2,
      year: 2026,
    });
    expect(calls[0]).toContain('/budgets/progress/w1');
    expect(calls[0]).toContain('month=2');
    expect(calls[0]).toContain('year=2026');
  });

  it('getBudgetProgress appends categoryId only when provided', async () => {
    const { calls } = await runQuery(budgetApi.endpoints.getBudgetProgress.initiate, {
      walletId: 'w1',
      categoryId: 'c1',
      month: 2,
      year: 2026,
    });
    expect(calls[0]).toContain('categoryId=c1');

    const noCat = await runQuery(budgetApi.endpoints.getBudgetProgress.initiate, {
      walletId: 'w1',
      month: 2,
      year: 2026,
    });
    expect(noCat.calls[0]).not.toContain('categoryId');
  });

  it('getBudgetProgress transformResponse unwraps the data envelope', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: { active: true, spent: 85000, limit: 100000, percent: 85 } }),
    );
    const store = makeStore();
    const res = await store.dispatch(
      budgetApi.endpoints.getBudgetProgress.initiate({ walletId: 'w1', month: 2, year: 2026 }) as never,
    ) as { data?: { active: boolean; percent: number } };
    expect(res.data?.active).toBe(true);
    expect(res.data?.percent).toBe(85);
  });
});
