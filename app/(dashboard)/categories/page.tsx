import { redirect } from 'next/navigation';

// Nội dung quản lý danh mục đã gộp vào tab "Quản Lý Danh Mục" của trang
// /profile - route này chỉ còn giữ lại để không phá link cũ/tương lai còn
// trỏ tới đây.
export default function CategoriesPage() {
  redirect('/profile');
}
