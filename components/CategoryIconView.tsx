import { createElement } from 'react';
import { getCategoryIcon, type CategoryIconProps } from '@/lib/categoryIcons';

interface CategoryIconViewProps extends CategoryIconProps {
  icon: string | null | undefined;
}

// Icon được chọn động theo tên lưu ở BE -> dùng createElement thay vì gán
// component vào biến rồi render <Icon/> (bị eslint coi là "tạo component lúc
// render" - react-hooks/static-components).
export function CategoryIconView({ icon, ...props }: CategoryIconViewProps) {
  return createElement(getCategoryIcon(icon), props);
}
