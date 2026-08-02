'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotificationBell } from '@/components/NotificationBell';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Trang chủ',
  '/wallets': 'Ví',
  '/budget': 'Ngân sách',
  '/profile': 'Cá nhân',
  '/categories': 'Danh mục',
  '/reports': 'Báo cáo',
};

function useBreadcrumb(pathname: string) {
  if (ROUTE_LABELS[pathname]) {
    return [{ label: ROUTE_LABELS[pathname], href: pathname }];
  }

  if (pathname.startsWith('/wallets/')) {
    return [
      { label: 'Ví', href: '/wallets' },
      { label: 'Chi tiết ví', href: pathname },
    ];
  }

  return [{ label: 'Trang chủ', href: '/' }];
}

export function AppHeader() {
  const pathname = usePathname();
  const crumbs = useBreadcrumb(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, index) => (
            <Fragment key={crumb.href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {index === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={crumb.href}>{crumb.label}</Link>} />
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto">
        <NotificationBell />
      </div>
    </header>
  );
}
