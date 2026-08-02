import {
  BriefcaseIcon,
  CalendarCheckIcon,
  CarIcon,
  ChartLineUpIcon,
  ForkKnifeIcon,
  GameControllerIcon,
  GiftIcon,
  GraduationCapIcon,
  HeartbeatIcon,
  HouseIcon,
  LightningIcon,
  MedalIcon,
  MoneyIcon,
  PawPrintIcon,
  PiggyBankIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  TagIcon,
  TrendUpIcon,
  UsersIcon,
  type IconWeight,
} from '@phosphor-icons/react';
import type { ComponentType } from 'react';

export interface CategoryIconProps {
  className?: string;
  size?: number | string;
  weight?: IconWeight;
}

// Tên icon lưu ở BE (field `icon`, kiểu string) là key trong map này. Dùng
// Phosphor để đồng nhất với icon toàn bộ app (không dùng lucide).
export const CATEGORY_ICON_MAP: Record<string, ComponentType<CategoryIconProps>> = {
  ShoppingCart: ShoppingCartIcon,
  ForkKnife: ForkKnifeIcon,
  Car: CarIcon,
  PawPrint: PawPrintIcon,
  Lightning: LightningIcon,
  ShoppingBag: ShoppingBagIcon,
  GameController: GameControllerIcon,
  Heartbeat: HeartbeatIcon,
  CalendarCheck: CalendarCheckIcon,
  Receipt: ReceiptIcon,
  House: HouseIcon,
  Users: UsersIcon,
  ChartLineUp: ChartLineUpIcon,
  PiggyBank: PiggyBankIcon,
  TrendUp: TrendUpIcon,
  GraduationCap: GraduationCapIcon,
  Briefcase: BriefcaseIcon,
  Money: MoneyIcon,
  Medal: MedalIcon,
  Gift: GiftIcon,
  Tag: TagIcon,
};

// Danh sách cho icon-picker trong form tạo/sửa danh mục.
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICON_MAP);

export function getCategoryIcon(icon: string | null | undefined): ComponentType<CategoryIconProps> {
  if (icon && CATEGORY_ICON_MAP[icon]) return CATEGORY_ICON_MAP[icon];
  return TagIcon;
}
