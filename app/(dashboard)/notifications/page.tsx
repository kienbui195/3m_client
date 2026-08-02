'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { TrophyIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from '@/api/notificationApi';
import { formatTriggeredAt } from '@/components/NotificationBell';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency } from '@/lib/format';
import type { AppNotification } from '@/types/api';

function NotificationRow({ notification }: { notification: AppNotification }) {
  const [markRead] = useMarkNotificationReadMutation();
  const budget = notification.budgetId;
  const walletName = budget?.walletId?.name ?? 'ví';
  const isOver = notification.thresholdPercent >= 100;
  const isGoal = budget?.type === 'income';
  const scope = budget?.categoryId?.name ?? (isGoal ? 'Quỹ tích lũy' : 'Toàn bộ ví');

  const message = isGoal
    ? `${scope} (${walletName}) đã đạt ${notification.thresholdPercent}% mục tiêu`
    : `${scope} (${walletName}) đã ${isOver ? 'vượt' : 'đạt'} ${notification.thresholdPercent}% ngân sách`;

  const amountLabel = isGoal ? 'Đã tích lũy' : 'Đã chi';

  return (
    <li className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => !notification.isRead && markRead(notification.documentId)}
        className="flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/50"
      >
        {isGoal ? (
          <TrophyIcon className="mt-0.5 size-5 shrink-0 text-amber-500" weight="fill" />
        ) : (
          <WarningCircleIcon
            className={`mt-0.5 size-5 shrink-0 ${isOver ? 'text-destructive' : 'text-amber-600'}`}
            weight="fill"
          />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground">
            {amountLabel} {formatCurrency(notification.amountSpentAtTrigger)} ·{' '}
            {formatTriggeredAt(notification.triggeredAt)}
          </p>
        </div>
        {!notification.isRead && (
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
        )}
      </button>
    </li>
  );
}

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markingAll, setMarkingAll] = useState(false);

  const unread = (notifications ?? []).filter((n) => !n.isRead);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await Promise.all(unread.map((n) => markRead(n.documentId).unwrap()));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Đánh dấu đã đọc thất bại.'));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Thông báo</h1>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={markingAll}>
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Không có thông báo nào
            </p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <NotificationRow key={n.documentId} notification={n} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
