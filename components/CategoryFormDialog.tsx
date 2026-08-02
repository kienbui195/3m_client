'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCategoryMutation, useUpdateCategoryMutation } from '@/api/categoryApi';
import { CategoryIconView } from '@/components/CategoryIconView';
import { SingleSelectToggle } from '@/components/SingleSelectToggle';
import { CATEGORY_COLOR_NAMES, type CategoryColorName } from '@/lib/categoryColors';
import { CATEGORY_ICON_NAMES } from '@/lib/categoryIcons';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import type { Category, CategoryType } from '@/types/api';

const NO_PARENT = '__none__';

const CATEGORY_TYPE_OPTIONS: { value: CategoryType; label: string }[] = [
  { value: 'expense', label: 'Chi tiêu' },
  { value: 'income', label: 'Thu nhập' },
];

// Swatch màu đặc (không dùng bản mờ /10 như avatar hiển thị) để người dùng
// dễ phân biệt khi chọn - key khớp CATEGORY_COLOR_NAMES.
const COLOR_SWATCH_CLASSES: Record<CategoryColorName, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
  gray: 'bg-gray-500',
};

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
  // Khi tạo mới (không phải edit) 1 danh mục con, truyền sẵn cha cố định -
  // dialog không cho đổi cha, chỉ hiện tên. Không truyền -> tạo danh mục gốc.
  presetParent?: Category;
  // Chỉ danh mục gốc (parent === null) mới được chọn làm cha - khớp giới hạn
  // "tối đa 2 cấp" ở BE. Chỉ dùng khi edit (cho phép đổi cha).
  topLevelCategories: Category[];
  onSuccess?: () => void;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  presetParent,
  topLevelCategories,
  onSuccess,
}: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <CategoryFormBody
            key={category?.documentId ?? presetParent?.documentId ?? 'create-root'}
            category={category}
            presetParent={presetParent}
            topLevelCategories={topLevelCategories}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryFormBody({
  category,
  presetParent,
  topLevelCategories,
  onOpenChange,
  onSuccess,
}: {
  category?: Category;
  presetParent?: Category;
  topLevelCategories: Category[];
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(category);
  const hasChildren = (category?.children.length ?? 0) > 0;
  // Loại danh mục + màu chỉ có ý nghĩa ở danh mục CHA - danh mục con luôn kế
  // thừa từ cha (BE tự ép), nên chỉ hiện 2 control này khi đang tạo/sửa gốc.
  const isRootContext = !presetParent && !category?.parent;

  const [name, setName] = useState(category?.name ?? '');
  const [parentId, setParentId] = useState(category?.parent?.documentId ?? NO_PARENT);
  const [icon, setIcon] = useState<string | null>(category?.icon ?? null);
  const [type, setType] = useState<CategoryType>(category?.type ?? 'expense');
  const [color, setColor] = useState<CategoryColorName | null>(
    (category?.color as CategoryColorName | null) ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
  const isSubmitting = isCreating || isUpdating;

  const parentOptions = topLevelCategories.filter((c) => c.documentId !== category?.documentId);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Vui lòng nhập tên danh mục.');
      return;
    }

    // Tạo mới: cha là presetParent cố định (tạo con) hoặc null (tạo gốc từ
    // nút chính) - không phụ thuộc `parentId`/Select nữa. Edit: giữ hành vi
    // cũ (đổi cha qua Select), trừ khi đang có con.
    const parent = !isEdit
      ? (presetParent?.documentId ?? null)
      : hasChildren
        ? undefined
        : parentId === NO_PARENT
          ? null
          : parentId;

    try {
      if (isEdit && category) {
        await updateCategory({
          documentId: category.documentId,
          data: {
            name: name.trim(),
            icon: icon ?? undefined,
            ...(parent !== undefined ? { parent } : {}),
            ...(isRootContext ? { type, color } : {}),
          },
        }).unwrap();
        toast.success('Đã cập nhật danh mục.');
      } else {
        await createCategory({
          name: name.trim(),
          icon: icon ?? undefined,
          parent: parent || undefined,
          ...(isRootContext ? { type, color } : {}),
        }).unwrap();
        toast.success('Đã tạo danh mục.');
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>
          {isEdit
            ? 'Sửa danh mục'
            : presetParent
              ? `Thêm danh mục con của "${presetParent.name}"`
              : 'Tạo danh mục cha mới'}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Cập nhật thông tin danh mục.'
            : presetParent
              ? `Danh mục mới sẽ thuộc "${presetParent.name}" và tự động dùng chung loại, màu với danh mục cha.`
              : 'Tạo một danh mục gốc mới. Sau khi tạo, bạn có thể thêm danh mục con bên trong.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="category-name">Tên danh mục</Label>
          <Input
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Ăn uống"
          />
        </div>

        {isRootContext && (
          <div className="space-y-1.5">
            <Label>Loại danh mục *</Label>
            <SingleSelectToggle options={CATEGORY_TYPE_OPTIONS} value={type} onChange={setType} />
          </div>
        )}

        {isEdit && (
          <div className="space-y-1.5">
            <Label>Danh mục cha</Label>
            {hasChildren ? (
              <p className="text-xs text-muted-foreground">
                Danh mục này đang có danh mục con nên không thể chuyển thành danh mục con của danh
                mục khác.
              </p>
            ) : (
              <Select
                value={parentId}
                onValueChange={(value) => setParentId(value ?? NO_PARENT)}
                items={[
                  { value: NO_PARENT, label: 'Không có (danh mục gốc)' },
                  ...parentOptions.map((p) => ({ value: p.documentId, label: p.name })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Không có (danh mục gốc)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>Không có (danh mục gốc)</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.documentId} value={p.documentId}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Icon</Label>
          <div className="grid grid-cols-8 gap-2">
            {CATEGORY_ICON_NAMES.map((iconName) => {
              const selected = icon === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(selected ? null : iconName)}
                  className={`flex size-9 items-center justify-center rounded-lg border transition-colors ${
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-transparent text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <CategoryIconView icon={iconName} className="size-4" />
                </button>
              );
            })}
          </div>
        </div>

        {isRootContext && (
          <div className="space-y-1.5">
            <Label>Màu biểu tượng</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLOR_NAMES.map((colorName) => {
                const selected = color === colorName;
                return (
                  <button
                    key={colorName}
                    type="button"
                    onClick={() => setColor(selected ? null : colorName)}
                    aria-label={colorName}
                    className={cn(
                      'size-8 rounded-full border-2 transition-colors',
                      COLOR_SWATCH_CLASSES[colorName],
                      selected ? 'border-foreground' : 'border-transparent',
                    )}
                  />
                );
              })}
            </div>
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo danh mục'}
        </Button>
      </DialogFooter>
    </form>
  );
}
