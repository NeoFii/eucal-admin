"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ModelCategoryCreate, ModelCategoryItem } from "@/types";

const emptyForm: ModelCategoryCreate = {
  key: "",
  name: "",
  sort_order: 0,
  is_active: true,
};

interface CategoryEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ModelCategoryItem | null;
  saving?: boolean;
  onSubmit: (data: ModelCategoryCreate) => Promise<void> | void;
}

export function CategoryEditorDialog({
  open,
  onOpenChange,
  category,
  saving = false,
  onSubmit,
}: CategoryEditorDialogProps) {
  const [form, setForm] = useState<ModelCategoryCreate>(emptyForm);

  useEffect(() => {
    if (!open) return;

    if (category) {
      setForm({
        key: category.key,
        name: category.name,
        sort_order: category.sort_order,
        is_active: category.is_active,
      });
      return;
    }

    setForm(emptyForm);
  }, [open, category]);

  const handleSubmit = async () => {
    await onSubmit({
      key: form.key.trim(),
      name: form.name.trim(),
      sort_order: form.sort_order,
      is_active: form.is_active,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "编辑分类" : "新增分类"}</DialogTitle>
          <DialogDescription>
            {category ? "修改分类信息" : "创建一个新的模型能力分类"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">分类名称 *</label>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="例如：文本生成"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Key *</label>
            <Input
              value={form.key}
              onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
              placeholder="例如：text-generation"
              disabled={!!category}
            />
            {!category && (
              <p className="mt-1 text-xs text-muted-foreground">
                唯一标识，创建后不可修改
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">排序权重</label>
            <Input
              type="number"
              min={0}
              max={9999}
              value={form.sort_order ?? 0}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sort_order: Math.max(0, Math.min(9999, Number(event.target.value) || 0)),
                }))
              }
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted-foreground">数值越大排序越靠前</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={saving || !form.name.trim() || !form.key.trim()}
          >
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
