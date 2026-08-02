'use client';

import { useState } from 'react';
import { PencilSimpleIcon, PlusIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetCategoriesQuery } from '@/api/categoryApi';
import { CategoryFormDialog } from '@/components/CategoryFormDialog';
import { CategoryIconView } from '@/components/CategoryIconView';
import { SingleSelectToggle } from '@/components/SingleSelectToggle';
import { getCategoryColorClass } from '@/lib/categoryColors';
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
}: {
  category: Category;
  childCategories: Category[];
  onAddChild: () => void;
  onEdit: () => void;
  onEditChild: (child: Category) => void;
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
          </div>
        </div>

        {childCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {childCategories.map((child) => (
              <button
                key={child.documentId}
                type="button"
                onClick={() => onEditChild(child)}
                className="flex items-center gap-1.5 rounded-full border border-input bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <CategoryIconView icon={child.icon} className="size-3.5" />
                {child.name}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CategoryManager() {
  const { data: categories, isLoading } = useGetCategoriesQuery();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [presetParent, setPresetParent] = useState<Category | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

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
    </div>
  );
}
