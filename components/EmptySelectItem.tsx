import { SelectItem } from '@/components/ui/select';

// Hiện khi danh sách option của 1 Select rỗng, để phân biệt với "đang tải"
// hoặc lỗi hiển thị - dùng chung cho mọi Select có thể rỗng trong app.
export function EmptySelectItem() {
  return (
    <SelectItem value="__empty__" disabled>
      Danh sách rỗng
    </SelectItem>
  );
}
