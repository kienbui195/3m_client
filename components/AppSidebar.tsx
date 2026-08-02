'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ChartPieIcon,
  HouseIcon,
  PlusIcon,
  SignOutIcon,
  UserIcon,
  WalletIcon,
} from '@phosphor-icons/react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogoutMutation } from '@/api/authApi';
import { TransactionFormDialog } from '@/components/TransactionFormDialog';
import { authStorage } from '@/lib/storage';
import { loggedOut } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const NAV_ITEMS = [
  { href: '/', label: 'Trang chủ', icon: HouseIcon },
  { href: '/wallets', label: 'Quản lý Ví', icon: WalletIcon },
  { href: '/budget', label: 'Ngân sách', icon: ChartPieIcon },
  { href: '/profile', label: 'Thống kê & Cá nhân', icon: UserIcon },
];

export function AppSidebar() {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [logout] = useLogoutMutation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const onNavigate = () => {
    if (isMobile) setOpenMobile(false);
  };

  const onLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // best-effort: vẫn xóa session cục bộ dù request logout thất bại
    }
    authStorage.clear();
    dispatch(loggedOut());
    toast.success('Đã đăng xuất.');
    router.replace('/auth/login');
  };

  const initials = (user?.fullName || user?.username || '?').slice(0, 1).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* Dùng chung SidebarMenuButton với các nav item bên dưới (thay vì
            div tự padding) để cách lề khớp nhau khi sidebar thu gọn còn
            icon - tự viết padding riêng sẽ lệch vì không theo cùng công
            thức padding icon-mode của SidebarMenuButton. */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link href="/" onClick={onNavigate}>
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground">
                    3M
                  </div>
                  <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
                    My Money Manager
                  </span>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Thêm giao dịch nhanh"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                  onClick={() => setQuickAddOpen(true)}
                >
                  <PlusIcon />
                  <span>Thêm giao dịch</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    render={
                      <Link href={item.href} onClick={onNavigate}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg">
                <Avatar className="size-6 rounded-lg">
                  <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">
                    {user?.fullName || user?.username}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={onLogout}>
              <SignOutIcon />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <TransactionFormDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </Sidebar>
  );
}
