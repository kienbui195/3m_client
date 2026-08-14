'use client';

import { useState } from 'react';
import { PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetCategoriesQuery } from '@/api/categoryApi';
import { useDeleteCategoryMutation } from '@/api/categoryApi';
import { useLazyCountTransactionsByCategoryQuery } from '@/api/transactionApi';
import { CategoryFormDialog } from '@/components/CategoryFormDialog';
import { CategoryIconView } from '@/components/CategoryIconView';
import { SingleSelectToggle } from '@/components/SingleSelectToggle';
import { getCategoryColorClass } from '@/lib/categoryColors';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import type { Category, CategoryType } from '@/types/api';

type TypeFilter = CategoryType | 'all';

const TYPE_FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'expense', label: 'Chi tiêu' },
  { value: 'income', label: 'Thu nhập' },
];

function ParentCategoryCard({
  category,
  childCategories,
  onAddChild,
  onEdit,
  onEditChild,
  onDeleteChild,
  onDelete,
}: {
  category: Category;
  childCategories: Category[];
  onAddChild: () => void;
  onEdit: () => void;
  onEditChild: (child: Category) => void;
  onDeleteChild: (child: Category) => void;
  onDelete: (target: Category) => void;
}) {
  const isIncome = category.type === 'income';

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-full',
                getCategoryColorClass(category.color),
              )}
            >
              <CategoryIconView icon={category.icon} className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">{category.name}</span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                    isIncome
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400',
                  )}
                >
                  {isIncome ? 'Thu nhập' : 'Chi tiêu'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Gồm {childCategories.length} danh mục con</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="outline" size="sm" onClick={onAddChild}>
              <PlusIcon />
              Thêm danh mục con
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onEdit} title="Sửa danh mục">
              <PencilSimpleIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(category)}
              disabled={childCategories.length > 0}
              title={
                childCategories.length > 0
                  ? 'Xóa các danh mục con trước'
                  : 'Xóa danh mục'
              }
            >
              <TrashIcon className="text-destructive" />
            </Button>
          </div>
        </div>

        {childCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {childCategories.map((child) => (
              <div
                key={child.documentId}
                className="flex items-center gap-1 rounded-full border border-input bg-muted/40 py-1.5 pr-1 pl-3"
              >
                <button
                  type="button"
                  onClick={() => onEditChild(child)}
                  className="flex items-center gap-1.5 text-xs font-medium text-foreground transition-colors hover:text-primary"
                  title="Sửa danh mục con"
                >
                  <CategoryIconView icon={child.icon} className="size-3.5" />
                  {child.name}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteChild(child)}
                  className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Xóa danh mục con"
                >
                  <TrashIcon className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CategoryManager() {
  const { data: categories, isLoading } = useGetCategoriesQuery();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();
  const [countTransactions] = useLazyCountTransactionsByCategoryQuery();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [presetParent, setPresetParent] = useState<Category | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Danh mục chờ xác nhận xóa + số giao dịch đang dùng nó (null = đang đếm).
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleteUsageCount, setDeleteUsageCount] = useState<number | null>(null);

  const topLevel = (categories ?? []).filter((c) => !c.parent);
  const visibleTopLevel = topLevel.filter((c) => typeFilter === 'all' || c.type === typeFilter);
  const childrenOf = (parentDocumentId: string) =>
    (categories ?? []).filter((c) => c.parent?.documentId === parentDocumentId);

  const openCreateParent = () => {
    setEditingCategory(undefined);
    setPresetParent(undefined);
    setFormOpen(true);
  };

  const openAddChild = (parent: Category) => {
    setEditingCategory(undefined);
    setPresetParent(parent);
    setFormOpen(true);
  };

  const openEdit = (target: Category) => {
    setEditingCategory(target);
    setPresetParent(undefined);
    setFormOpen(true);
  };

  const requestDelete = async (target: Category) => {
    setPendingDelete(target);
    setDeleteUsageCount(null);
    try {
      const total = await countTransactions(target.documentId).unwrap();
      setDeleteUsageCount(total);
    } catch {
      // Không đếm được thì vẫn cho xóa, chỉ không hiện số chính xác.
      setDeleteUsageCount(0);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteCategory(pendingDelete.documentId).unwrap();
      toast.success('Đã xóa danh mục.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Xóa danh mục thất bại.'));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Quản Lý Danh Mục Thu - Chi (Cấu Trúc Cha - Con 2 Cấp)
          </h2>
          <p className="text-sm text-muted-foreground">
            Mỗi danh mục cha đại diện cho 1 nhóm thu hoặc chi và có thể chứa nhiều danh mục con bên trong.
          </p>
        </div>
        <Button onClick={openCreateParent}>
          <PlusIcon />
          Tạo Danh Mục Cha Mới
        </Button>
      </div>

      <SingleSelectToggle options={TYPE_FILTER_OPTIONS} value={typeFilter} onChange={setTypeFilter} />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : topLevel.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Chưa có danh mục nào. Nhấn &quot;Tạo Danh Mục Cha Mới&quot; để bắt đầu.
          </CardContent>
        </Card>
      ) : visibleTopLevel.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Không có danh mục nào thuộc loại này.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleTopLevel.map((top) => (
            <ParentCategoryCard
              key={top.documentId}
              category={top}
              childCategories={childrenOf(top.documentId)}
              onAddChild={() => openAddChild(top)}
              onEdit={() => openEdit(top)}
              onEditChild={openEdit}
              onDeleteChild={requestDelete}
              onDelete={requestDelete}
            />
          ))}
        </div>
      )}

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        presetParent={presetParent}
        topLevelCategories={topLevel}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Xóa danh mục "${pendingDelete?.name}"?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUsageCount === null ? (
                'Đang kiểm tra các giao dịch sử dụng danh mục này...'
              ) : deleteUsageCount > 0 ? (
                <>
                  Danh mục này đang được <span className="font-semibold text-destructive">{deleteUsageCount}</span>{' '}
                  giao dịch sử dụng. Sau khi xóa, các giao dịch đó sẽ hiển thị là &quot;Chưa phân loại&quot; và bạn
                  có thể gán lại danh mục khác bất kỳ lúc nào.
                </>
              ) : (
                'Danh mục này không được giao dịch nào sử dụng. Hành động này không thể hoàn tác.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
