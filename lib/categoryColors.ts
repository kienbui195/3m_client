// Bảng màu cố định cho danh mục CHA (field `category.color`, một trong các
// key dưới đây) - danh mục con luôn kế thừa màu của cha khi hiển thị, không
// tự chọn riêng. Dùng chung cho mọi nơi vẽ icon avatar danh mục (trang chủ,
// chi tiết ví, quản lý danh mục, báo cáo) để tránh mỗi nơi tự chế 1 kiểu.
export const CATEGORY_COLOR_NAMES = [
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'blue',
  'indigo',
  'violet',
  'pink',
  'gray',
] as const;

export type CategoryColorName = (typeof CATEGORY_COLOR_NAMES)[number];

const CATEGORY_COLOR_CLASSES: Record<CategoryColorName, string> = {
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

const DEFAULT_CATEGORY_COLOR_CLASS = 'bg-primary/10 text-primary';

// `color` truyền vào có thể là màu của chính danh mục (nếu là cha) hoặc màu
// của `category.parent?.color` (nếu là con) - luôn fallback về màu mặc định
// khi không có màu nào (danh mục chưa đặt màu).
export function getCategoryColorClass(color: string | null | undefined): string {
  if (color && color in CATEGORY_COLOR_CLASSES) {
    return CATEGORY_COLOR_CLASSES[color as CategoryColorName];
  }
  return DEFAULT_CATEGORY_COLOR_CLASS;
}
