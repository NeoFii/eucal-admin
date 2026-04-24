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
import type { ModelVendorCreate, ModelVendorItem } from "@/types";

const emptyForm: ModelVendorCreate = {
  slug: "",
  name: "",
  logo_url: "",
  is_active: true,
  sort_order: 0,
};

interface VendorEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: ModelVendorItem | null;
  saving?: boolean;
  onSubmit: (data: ModelVendorCreate) => Promise<void> | void;
}

export function VendorEditorDialog({
  open,
  onOpenChange,
  vendor,
  saving = false,
  onSubmit,
}: VendorEditorDialogProps) {
  const [form, setForm] = useState<ModelVendorCreate>(emptyForm);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (vendor) {
      setForm({
        slug: vendor.slug,
        name: vendor.name,
        logo_url: vendor.logo_url || "",
        is_active: vendor.is_active,
        sort_order: vendor.sort_order,
      });
      return;
    }

    setForm(emptyForm);
  }, [open, vendor]);

  const handleSubmit = async () => {
    await onSubmit({
      slug: form.slug.trim(),
      name: form.name.trim(),
      logo_url: form.logo_url?.trim() || undefined,
      is_active: form.is_active,
      sort_order: form.sort_order,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{vendor ? "编辑研发商" : "新增研发商"}</DialogTitle>
          <DialogDescription>
            {vendor ? "修改研发商信息" : "创建一个新的 AI 模型研发商"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">研发商名称 *</label>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="例如：Anthropic"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Slug *</label>
            <Input
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="例如：anthropic"
              disabled={!!vendor}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Logo URL</label>
            <Input
              value={form.logo_url ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, logo_url: event.target.value }))
              }
              placeholder="https://..."
            />
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
          </div>
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
