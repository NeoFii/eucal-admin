"use client";

import { useEffect, useMemo, useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import type {
  Category,
  ModelCreate,
  ModelListItem,
  ModelUpdate,
  Vendor,
} from "@/lib/api/testing";

const emptyForm = (vendorId: number): ModelCreate => ({
  vendor_id: vendorId,
  slug: "",
  name: "",
  description: "",
  capability_tags: [],
  context_window: undefined,
  max_output_tokens: undefined,
  is_reasoning_model: false,
  sort_order: 0,
  is_active: true,
  categories: [],
});

interface ModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  fixedVendor: Vendor;
  model?: ModelListItem | null;
  saving?: boolean;
  onSubmit: (data: ModelCreate | ModelUpdate) => Promise<void> | void;
}

export function ModelFormDialog({
  open,
  onOpenChange,
  categories,
  fixedVendor,
  model,
  saving = false,
  onSubmit,
}: ModelFormDialogProps) {
  const [form, setForm] = useState<ModelCreate>(emptyForm(fixedVendor.id));
  const [tagsInput, setTagsInput] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());

  const categoryIdByKey = useMemo(
    () =>
      new Map(categories.map((category) => [category.key, category.id])),
    [categories]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (model) {
      setForm({
        vendor_id: fixedVendor.id,
        slug: model.slug,
        name: model.name,
        description: model.description ?? "",
        capability_tags: model.capability_tags,
        context_window: model.context_window,
        max_output_tokens: model.max_output_tokens,
        is_reasoning_model: model.is_reasoning_model,
        sort_order: model.sort_order,
        is_active: model.is_active ?? true,
        categories: model.categories
          .map((category) => ({
            category_id: categoryIdByKey.get(category.key) ?? 0,
            sort_order: category.sort_order,
          }))
          .filter((category) => category.category_id > 0),
      });
      setTagsInput(model.capability_tags.join(", "));
      setSelectedCategoryIds(
        new Set(
          model.categories
            .map((category) => categoryIdByKey.get(category.key))
            .filter((categoryId): categoryId is number => categoryId !== undefined)
        )
      );
      return;
    }

    setForm(emptyForm(fixedVendor.id));
    setTagsInput("");
    setSelectedCategoryIds(new Set());
  }, [categoryIdByKey, fixedVendor.id, model, open]);

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const categoriesPayload = Array.from(selectedCategoryIds).map((categoryId) => ({
      category_id: categoryId,
      sort_order: 0,
    }));
    const payload: ModelCreate = {
      ...form,
      vendor_id: fixedVendor.id,
      slug: form.slug.trim(),
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      capability_tags: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      categories: categoriesPayload,
    };

    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{model ? "编辑模型" : "新增模型"}</DialogTitle>
          <DialogDescription>
            {model ? "修改当前研发商下的模型信息" : "在当前研发商下创建一个新模型"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">所属研发商</label>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
              {fixedVendor.logo_url ? (
                <img
                  src={fixedVendor.logo_url}
                  alt={fixedVendor.name}
                  className="h-8 w-8 rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                  {fixedVendor.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-foreground">{fixedVendor.name}</div>
                <div className="text-xs text-muted-foreground">{fixedVendor.slug}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">模型名称 *</label>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="例如：GPT-4o"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Slug *</label>
              <Input
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                placeholder="例如：gpt-4o"
                disabled={!!model}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">描述</label>
            <Textarea
              rows={10}
              value={form.description ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="输入模型描述，支持 Markdown。"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              能力标签
              <span className="ml-1 font-normal text-muted-foreground">使用逗号分隔</span>
            </label>
            <Input
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="例如：chat, vision, tool_calling"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">上下文窗口</label>
              <Input
                type="number"
                value={form.context_window ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    context_window: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
                placeholder="例如：128000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">最大输出 tokens</label>
              <Input
                type="number"
                value={form.max_output_tokens ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    max_output_tokens: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
                placeholder="例如：4096"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">排序权重</label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))
                }
              />
            </div>
            <div className="flex items-end gap-5 pb-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.is_reasoning_model}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_reasoning_model: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-orange-500"
                />
                推理模型
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, is_active: event.target.checked }))
                  }
                  className="h-4 w-4 accent-orange-500"
                />
                启用
              </label>
            </div>
          </div>

          {categories.length > 0 ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">所属分类</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      selectedCategoryIds.has(category.id)
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={saving || !form.name.trim() || !form.slug.trim()}
          >
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
