"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  testingApi,
  type ModelListItem,
  type ModelCreate,
  type ModelUpdate,
  type Category,
  type Vendor,
} from "@/lib/api/testing";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  RefreshCw,
  Database,
  Edit3,
  PowerOff,
  Cpu,
} from "lucide-react";

const emptyForm = (): ModelCreate => ({
  vendor_id: 0,
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

const PAGE_SIZE = 20;


export default function ModelsPage() {
  const [models, setModels] = useState<ModelListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelListItem | null>(null);
  const [form, setForm] = useState<ModelCreate>(emptyForm());
  const [tagsInput, setTagsInput] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const result = await testingApi.getModels({ page, page_size: PAGE_SIZE });
      setModels(result.items);
      setTotal(result.total);
    } catch (error) {
      console.error("加载模型失败:", error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const loadMeta = useCallback(async () => {
    try {
      const [vendorsResult, categoriesResult] = await Promise.allSettled([
        testingApi.getVendors({ page_size: 200 }),
        testingApi.getCategories(),
      ]);
      if (vendorsResult.status === "fulfilled") setVendors(vendorsResult.value.items);
      else console.error("加载研发商失败:", vendorsResult.reason);
      if (categoriesResult.status === "fulfilled") setCategories(categoriesResult.value);
    } catch (error) {
      console.error("加载元数据失败:", error);
    }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { loadModels(); }, [loadModels]);

  const handleEdit = (e: React.MouseEvent, model: ModelListItem) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingModel(model);
    setForm({
      vendor_id: model.vendor.id,
      slug: model.slug,
      name: model.name,
      description: model.description ?? "",
      capability_tags: model.capability_tags,
      context_window: model.context_window,
      max_output_tokens: model.max_output_tokens,
      is_reasoning_model: model.is_reasoning_model,
      sort_order: model.sort_order,
      is_active: true,
      categories: model.categories.map((c) => {
        const cat = categories.find((cat) => cat.key === c.key);
        return { category_id: cat?.id ?? 0, sort_order: c.sort_order };
      }),
    });
    setTagsInput(model.capability_tags.join(", "));
    setSelectedCategoryIds(
      new Set(
        model.categories
          .map((c) => categories.find((cat) => cat.key === c.key)?.id)
          .filter((id): id is number => id !== undefined)
      )
    );
    setDialogOpen(true);
  };

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.vendor_id) return;
    setSaving(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const categoryAssigns = Array.from(selectedCategoryIds).map((id) => ({
      category_id: id,
      sort_order: 0,
    }));
    try {
      if (editingModel) {
        const updateData: ModelUpdate = {
          name: form.name,
          description: form.description || undefined,
          capability_tags: tags,
          context_window: form.context_window,
          max_output_tokens: form.max_output_tokens,
          is_reasoning_model: form.is_reasoning_model,
          sort_order: form.sort_order,
          categories: categoryAssigns,
        };
        await testingApi.updateModel(editingModel.slug, updateData);
      } else {
        await testingApi.createModel({ ...form, capability_tags: tags, categories: categoryAssigns });
      }
      setDialogOpen(false);
      loadModels();
    } catch (error) {
      console.error("保存模型失败:", error);
      toast.error("保存失败", "请检查输入或重试");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (e: React.MouseEvent, model: ModelListItem) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await testingApi.updateModel(model.slug, { is_active: false });
      loadModels();
    } catch (error) {
      console.error("更新状态失败:", error);
      toast.error("操作失败", "请重试");
    }
  };

  return (
    <div className="page-stack">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">模型管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">点击卡片进入详情，管理该模型支持的服务商报价</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadModels} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Link href="/models/new">
            <Button disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              新增模型
            </Button>
          </Link>
        </div>
      </div>

      {/* 卡片网格 */}
      {loading ? (
        <div className="panel py-24">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
        </div>
      ) : models.length === 0 ? (
        <div className="panel py-24 text-center text-muted-foreground">
          <Database className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p>暂无模型数据</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {models.map((model) => {
              const providerCount = model.providers?.length ?? 0;
              const visibleTags = model.capability_tags.slice(0, 4);
              const extraTags = model.capability_tags.length - 4;

              return (
                <Link key={model.id} href={`/models/${model.slug}`}>
                  <Card className="group h-full cursor-pointer border-border transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
                    <CardContent className="p-5 sm:p-5 flex flex-col h-full">
                      {/* 顶行：Logo + 模型名称 + 推理标记 */}
                      <div className="flex items-center gap-3 mb-3">
                        {model.vendor.logo_url ? (
                          <img
                            src={model.vendor.logo_url}
                            alt={model.vendor.name}
                            className="h-8 w-8 flex-shrink-0 rounded-lg object-contain"
                          />
                        ) : (
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-muted-foreground">
                            {model.vendor.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <h3 className="min-w-0 flex-1 truncate text-base font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
                          {model.name}
                        </h3>
                        {model.is_reasoning_model && (
                          <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs leading-none text-blue-600">
                            <Cpu className="w-3 h-3" />
                            推理
                          </span>
                        )}
                      </div>

                      {/* 能力标签 */}
                      {visibleTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {visibleTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                          {extraTags > 0 && (
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                              +{extraTags}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 底部信息 + 悬停操作按钮 */}
                      <div className="mt-auto flex items-end justify-between">
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <div>
                            {providerCount > 0 ? `${providerCount} 个服务商` : "暂无服务商"}
                          </div>
                        </div>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleEdit(e, model)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            title="编辑模型信息"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => toggleStatus(e, model)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            title="废弃模型"
                          >
                            <PowerOff className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      {/* 新增/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑模型</DialogTitle>
            <DialogDescription>修改模型信息</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">研发商 *</label>
              <select
                className="h-10 w-full rounded-xl border border-input/90 bg-white/85 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-ring/15"
                value={form.vendor_id}
                onChange={(e) => setForm({ ...form, vendor_id: Number(e.target.value) })}
              >
                {vendors.length === 0 ? (
                  <option value={0}>（研发商数据加载失败，请检查后端服务）</option>
                ) : (
                  vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">显示名称 *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：GPT-4o"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Slug *</label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="例如：gpt-4o"
                  disabled={!!editingModel}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">描述</label>
              <textarea
                className="w-full resize-none rounded-xl border border-input/90 bg-white/85 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-ring/15"
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="模型简介（可选）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                能力标签
                <span className="ml-1 font-normal text-muted-foreground">（逗号分隔）</span>
              </label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="例如：chat, vision, tool_calling"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  上下文窗口（tokens）
                </label>
                <Input
                  type="number"
                  value={form.context_window ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      context_window: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="例如：128000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  最大输出 tokens
                </label>
                <Input
                  type="number"
                  value={form.max_output_tokens ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      max_output_tokens: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="例如：4096"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">排序权重</label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_reasoning_model}
                    onChange={(e) => setForm({ ...form, is_reasoning_model: e.target.checked })}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-foreground">推理模型</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-foreground">启用</span>
                </label>
              </div>
            </div>

            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">所属分类</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        selectedCategoryIds.has(cat.id)
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.slug || !form.vendor_id}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
