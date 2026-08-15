import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const markRead = jest.fn();
jest.mock('@/api/notificationApi', () => ({
  useGetNotificationsQuery: jest.fn(),
  useMarkNotificationReadMutation: () => [markRead, { isLoading: false }],
}));

jest.mock('@/lib/notificationSound', () => ({ playNotificationSound: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), warning: jest.fn() } }));

import { useGetNotificationsQuery } from '@/api/notificationApi';
import { NotificationBell } from '@/components/NotificationBell';
import { playNotificationSound } from '@/lib/notificationSound';
import { toast } from 'sonner';

const mockedUseGetNotificationsQuery = useGetNotificationsQuery as jest.Mock;

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Regression test: DropdownMenuLabel wraps Base UI's Menu.GroupLabel, which
  // throws "MenuGroupContext is missing" unless rendered inside a Menu.Group
  // ancestor. Opening the dropdown used to crash the whole header - this
  // must render (and open) without throwing.
  it('opens without crashing when there are no notifications', async () => {
    mockedUseGetNotificationsQuery.mockReturnValue({ data: [] });
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole('button'));

    expect(await screen.findByText('Thông báo')).toBeInTheDocument();
    expect(screen.getByText('Không có thông báo nào')).toBeInTheDocument();
  });

  it('opens without crashing when there are notifications, and shows the unread badge', async () => {
    mockedUseGetNotificationsQuery.mockReturnValue({
      data: [
        {
          documentId: 'n1',
          thresholdPercent: 80,
          amountSpentAtTrigger: 85000,
          isRead: false,
          triggeredAt: '2026-08-01T00:00:00.000Z',
          budgetId: { type: 'expense', walletId: { name: 'Ví chính' }, categoryId: { name: 'Ăn uống' } },
        },
      ],
    });
    const user = userEvent.setup();
    render(<NotificationBell />);

    expect(screen.getByText('1')).toBeInTheDocument(); // unread badge count

    await user.click(screen.getByRole('button'));
    expect(await screen.findByText(/Ăn uống/)).toBeInTheDocument();
  });

  it('caps the unread badge at "9+"', () => {
    mockedUseGetNotificationsQuery.mockReturnValue({
      data: Array.from({ length: 12 }, (_, i) => ({
        documentId: `n${i}`,
        thresholdPercent: 80,
        amountSpentAtTrigger: 1000,
        isRead: false,
        triggeredAt: null,
        budgetId: null,
      })),
    });
    render(<NotificationBell />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('does not sound/toast for notifications already present on first load', () => {
    mockedUseGetNotificationsQuery.mockReturnValue({
      data: [
        {
          documentId: 'n1',
          thresholdPercent: 80,
          amountSpentAtTrigger: 85000,
          isRead: false,
          triggeredAt: '2026-08-01T00:00:00.000Z',
          budgetId: { type: 'expense', walletId: { name: 'Ví chính' }, categoryId: { name: 'Ăn uống' } },
        },
      ],
    });

    render(<NotificationBell />);

    expect(playNotificationSound).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('sounds + toasts when a NEW notification appears after mount', () => {
    mockedUseGetNotificationsQuery.mockReturnValue({ data: [] });
    const { rerender } = render(<NotificationBell />);
    expect(playNotificationSound).not.toHaveBeenCalled();

    mockedUseGetNotificationsQuery.mockReturnValue({
      data: [
        {
          documentId: 'n2',
          thresholdPercent: 80,
          amountSpentAtTrigger: 85000,
          isRead: false,
          triggeredAt: '2026-08-01T00:00:00.000Z',
          budgetId: { type: 'expense', walletId: { name: 'Ví chính' }, categoryId: { name: 'Ăn uống' } },
        },
      ],
    });
    rerender(<NotificationBell />);

    expect(playNotificationSound).toHaveBeenCalledTimes(1);
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('Ăn uống'),
      expect.objectContaining({ description: expect.stringContaining('85.000') }),
    );
  });

  it('uses toast.error for a threshold >= 100 notification', () => {
    mockedUseGetNotificationsQuery.mockReturnValue({ data: [] });
    const { rerender } = render(<NotificationBell />);

    mockedUseGetNotificationsQuery.mockReturnValue({
      data: [
        {
          documentId: 'n3',
          thresholdPercent: 100,
          amountSpentAtTrigger: 210000,
          isRead: false,
          triggeredAt: '2026-08-01T00:00:00.000Z',
          budgetId: { type: 'expense', walletId: { name: 'Ví chính' }, categoryId: { name: 'Ăn uống' } },
        },
      ],
    });
    rerender(<NotificationBell />);

    expect(playNotificationSound).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('vượt'),
      expect.objectContaining({ description: expect.stringContaining('210.000') }),
    );
  });
});
