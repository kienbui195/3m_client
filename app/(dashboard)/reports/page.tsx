import { redirect } from 'next/navigation';

// Nội dung báo cáo đã gộp vào tab "Báo Cáo Biểu Đồ" của trang /profile - route
// này chỉ còn giữ lại để không phá link cũ/tương lai còn trỏ tới đây.
export default function ReportsPage() {
  redirect('/profile');
}
