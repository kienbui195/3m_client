'use client';

import Link from 'next/link';
import { ArrowRightIcon, BellIcon, TrophyIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from '@/api/notificationApi';
import { formatCurrency } from '@/lib/format';
import type { AppNotification } from '@/types/api';

export function formatTriggeredAt(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function NotificationItem({ notification }: { notification: AppNotification }) {
  const [markRead] = useMarkNotificationReadMutation();
  const budget = notification.budgetId;
  const walletName = budget?.walletId?.name ?? 'ví';
  const isOver = notification.thresholdPercent >= 100;

  // Budget "income" (quỹ tích lũy) luôn toàn ví (không category) - khung ngôn
  // ngữ tích cực "đạt mục tiêu" thay vì "vượt hạn mức" như budget "expense".
  const isGoal = budget?.type === 'income';
  const scope = budget?.categoryId?.name ?? (isGoal ? 'Quỹ tích lũy' : 'Toàn bộ ví');

  const message = isGoal
    ? `${scope} (${walletName}) đã đạt ${notification.thresholdPercent}% mục tiêu`
    : `${scope} (${walletName}) đã ${isOver ? 'vượt' : 'đạt'} ${notification.thresholdPercent}% ngân sách`;

  const amountLabel = isGoal ? 'Đã tích lũy' : 'Đã chi';

  return (
    <DropdownMenuItem
      className="flex flex-col items-start gap-1 whitespace-normal py-2.5"
      onClick={() => !notification.isRead && markRead(notification.documentId)}
    >
      <div className="flex w-full items-start gap-2">
        {isGoal ? (
          <TrophyIcon className="mt-0.5 size-4 shrink-0 text-amber-500" weight="fill" />
        ) : (
          <WarningCircleIcon
            className={`mt-0.5 size-4 shrink-0 ${isOver ? 'text-destructive' : 'text-amber-600'}`}
            weight="fill"
          />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground">
            {amountLabel} {formatCurrency(notification.amountSpentAtTrigger)} · {formatTriggeredAt(notification.triggeredAt)}
          </p>
        </div>
        {!notification.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
      </div>
    </DropdownMenuItem>
  );
}

export function NotificationBell() {
  const { data: notifications } = useGetNotificationsQuery();
  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <BellIcon />
            {unreadCount > 0 && (
              <Badge className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full p-0 text-[10px]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Thông báo</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!notifications || notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            Không có thông báo nào
          </p>
        ) : (
          notifications.map((n) => <NotificationItem key={n.documentId} notification={n} />)
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/notifications" className="justify-center text-primary">
              Xem tất cả thông báo <ArrowRightIcon />
            </Link>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
