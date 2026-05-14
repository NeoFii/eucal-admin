"use client";

import { useEffect, useRef, useState } from "react";

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
import { VendorLogo } from "@/components/vendor-logo";
import { yuanToMicroYuan, microYuanToYuan } from "@/lib/pricing";
import type {
  AvailableModelSlug,
  ModelCategoryItem,
  ModelVendorItem,
  SupportedModelItem,
  SupportedModelCreate,
  SupportedModelUpdate,
} from "@/types";

const emptyForm = (vendorSlug: string): SupportedModelCreate => ({
  vendor_slug: vendorSlug,
  slug: "",
  routing_slug: "",
  name: "",
  summary: "",
  description: "",
  input_price_per_million: undefined,
  output_price_per_million: undefined,
  capability_tags: [],
  context_window: undefined,
  max_output_tokens: undefined,
  is_reasoning_model: false,
  sort_order: 0,
  is_active: true,
  category_keys: [],
});

interface PriceFormState {
  input: string;
  output: string;
  cached: string;
}

interface ModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ModelCategoryItem[];
  fixedVendor: ModelVendorItem;
  model?: SupportedModelItem | null;
  saving?: boolean;
  onSubmit: (data: SupportedModelCreate | SupportedModelUpdate) => Promise<void> | void;
  availableModels?: AvailableModelSlug[];
}

export function ModelFormDialog({
  open,
  onOpenChange,
  categories,
  fixedVendor,
  model,
  saving = false,
  onSubmit,
  availableModels = [],
}: ModelFormDialogProps) {
  const [form, setForm] = useState<SupportedModelCreate>(emptyForm(fixedVendor.slug));
  const [tagsInput, setTagsInput] = useState("");
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<Set<string>>(new Set());
  const [priceForm, setPriceForm] = useState<PriceFormState>({ input: "", output: "", cached: "" });
  const [routingSlugOpen, setRoutingSlugOpen] = useState(false);
  const routingSlugRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!routingSlugOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (routingSlugRef.current && !routingSlugRef.current.contains(e.target as Node)) {
        setRoutingSlugOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [routingSlugOpen]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (model) {
      setForm({
        vendor_slug: fixedVendor.slug,
        slug: model.slug,
        routing_slug: model.routing_slug ?? "",
        name: model.name,
        summary: model.summary ?? "",
        description: model.description ?? "",
        input_price_per_million: model.input_price_per_million ?? undefined,
        output_price_per_million: model.output_price_per_million ?? undefined,
        capability_tags: model.capability_tags,
        context_window: model.context_window ?? undefined,
        max_output_tokens: model.max_output_tokens ?? undefined,
        is_reasoning_model: model.is_reasoning_model,
        sort_order: model.sort_order,
        is_active: true,
        category_keys: model.categories.map((c) => c.key),
      });
      setPriceForm({
        input: model.input_price_per_million != null ? microYuanToYuan(model.input_price_per_million) : "",
        output: model.output_price_per_million != null ? microYuanToYuan(model.output_price_per_million) : "",
        cached: model.cached_input_price_per_million != null ? microYuanToYuan(model.cached_input_price_per_million) : "",
      });
      setTagsInput(model.capability_tags.join(", "));
      setSelectedCategoryKeys(new Set(model.categories.map((c) => c.key)));
      return;
    }

    setForm(emptyForm(fixedVendor.slug));
    setPriceForm({ input: "", output: "", cached: "" });
    setTagsInput("");
    setSelectedCategoryKeys(new Set());
  }, [fixedVendor.slug, model, open]);

  const toggleCategory = (key: string) => {
    setSelectedCategoryKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const payload: SupportedModelCreate = {
      ...form,
      vendor_slug: fixedVendor.slug,
      slug: form.slug.trim(),
      routing_slug: form.routing_slug?.trim() || undefined,
      name: form.name.trim(),
      summary: form.summary?.trim() || undefined,
      description: form.description?.trim() || undefined,
      input_price_per_million: priceForm.input ? yuanToMicroYuan(priceForm.input) : undefined,
      output_price_per_million: priceForm.output ? yuanToMicroYuan(priceForm.output) : undefined,
      cached_input_price_per_million: priceForm.cached ? yuanToMicroYuan(priceForm.cached) : undefined,
      capability_tags: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      category_keys: Array.from(selectedCategoryKeys),
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
              <VendorLogo name={fixedVendor.name} logoUrl={fixedVendor.logo_url} size={32} />
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

          <div ref={routingSlugRef} className="relative">
            <label className="mb-1 block text-sm font-medium text-foreground">
              路由标识
              <span className="ml-1 font-normal text-muted-foreground">对应号池中的模型名称，用于计费映射</span>
            </label>
            <Input
              value={form.routing_slug ?? ""}
              onChange={(event) => {
                setForm((current) => ({ ...current, routing_slug: event.target.value }));
                setRoutingSlugOpen(true);
              }}
              onFocus={() => setRoutingSlugOpen(true)}
              placeholder="输入或选择号池模型名称"
              autoComplete="off"
            />
            {routingSlugOpen && availableModels.length > 0 && (() => {
              const query = (form.routing_slug ?? "").toLowerCase();
              const flattened = availableModels.flatMap((m) =>
                m.pool_names.map((poolName) => ({ model_slug: m.model_slug, pool_name: poolName }))
              );
              const filtered = flattened.filter((m) =>
                m.model_slug.toLowerCase().includes(query) ||
                m.pool_name.toLowerCase().includes(query)
              );
              if (filtered.length === 0) return null;
              return (
                <div
                  className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-lg"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {filtered.map((m) => (
                    <button
                      key={`${m.pool_name}/${m.model_slug}`}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
                      onClick={() => {
                        setForm((current) => ({ ...current, routing_slug: m.model_slug }));
                        setRoutingSlugOpen(false);
                      }}
                    >
                      <span className="font-medium">{m.model_slug}</span>
                      <span className="ml-2 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-muted-foreground">{m.pool_name}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
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
              摘要
              <span className="ml-1 font-normal text-muted-foreground">最多 255 字</span>
            </label>
            <Textarea
              rows={3}
              maxLength={255}
              value={form.summary ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
              placeholder="简短描述模型特点"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">输入价格(元/百万token)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceForm.input}
                onChange={(event) => setPriceForm((c) => ({ ...c, input: event.target.value }))}
                placeholder="例如：1.50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">输出价格(元/百万token)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceForm.output}
                onChange={(event) => setPriceForm((c) => ({ ...c, output: event.target.value }))}
                placeholder="例如：6.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">缓存价格(元/百万token)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceForm.cached}
                onChange={(event) => setPriceForm((c) => ({ ...c, cached: event.target.value }))}
                placeholder="例如：0.75"
              />
            </div>
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
                  className="h-4 w-4 accent-gray-950"
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
                  className="h-4 w-4 accent-gray-950"
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
                    key={category.key}
                    type="button"
                    onClick={() => toggleCategory(category.key)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      selectedCategoryKeys.has(category.key)
                        ? "border-gray-950 bg-gray-950 text-white"
                        : "border-border bg-background text-muted-foreground hover:border-gray-400 hover:text-foreground"
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
