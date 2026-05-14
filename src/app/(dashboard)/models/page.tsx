"use client";

import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Blocks,
  Database,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ModelFormDialog } from "@/components/models/model-form-dialog";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { VendorLogo } from "@/components/vendor-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { getErrorDetail } from "@/lib/errors";
import { modelCatalogApi } from "@/lib/api/model-catalog";
import { poolsApi } from "@/lib/api/pools";
import { formatYuan } from "@/lib/pricing";
import { mapCapabilityTags } from "@/lib/model-capabilities";
import type {
  ModelVendorItem,
  ModelCategoryItem,
  SupportedModelItem,
  SupportedModelCreate,
  SupportedModelUpdate,
  AvailableModelSlug,
} from "@/types";

const PAGE_SIZE = 24;

const formatContextWindow = (tokens?: number | null): string => {
  if (!tokens) return "-";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return String(tokens);
};

export default function ModelsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<ModelVendorItem[]>([]);
  const [categories, setCategories] = useState<ModelCategoryItem[]>([]);
  const [models, setModels] = useState<SupportedModelItem[]>([]);
  const [total, setTotal] = useState(0);
  const [availableModels, setAvailableModels] = useState<AvailableModelSlug[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState<"active" | "archived">("active");

  const [loading, setLoading] = useState(true);
  const [modelSaving, setModelSaving] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<SupportedModelItem | null>(null);
  const [selectedVendorForCreate, setSelectedVendorForCreate] = useState<ModelVendorItem | null>(null);

  const hasFilters = !!selectedCategory || selectedVendors.length > 0 || !!query.trim();

  const loadRefData = useCallback(async () => {
    const [vendorItems, categoryItems, slugs] = await Promise.all([
      modelCatalogApi.getAllVendors(),
      modelCatalogApi.getAllCategories(),
      poolsApi.getAvailableModels(),
    ]);
    setVendors(vendorItems);
    setCategories(categoryItems);
    setAvailableModels(slugs);
  }, []);

  const loadModels = useCallback(async () => {
    const params: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
      status: statusTab,
    };
    if (selectedCategory) params.category = selectedCategory;
    if (selectedVendors.length > 0) params.vendors = selectedVendors.join(",");
    if (query.trim()) params.q = query.trim();
    const data = await modelCatalogApi.getModels(params);
    setModels(data.items);
    setTotal(data.total);
  }, [page, selectedCategory, selectedVendors, query, statusTab]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadRefData(), loadModels()]);
    } catch {
      toast.error("加载失败", "请检查后端服务后重试");
    } finally {
      setLoading(false);
    }
  }, [loadRefData, loadModels]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  useEffect(() => { setPage(1); }, [selectedCategory, selectedVendors, query, statusTab]);

  const refreshModels = async () => {
    try { await loadModels(); } catch { toast.error("刷新失败", "请稍后重试"); }
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedVendors([]);
    setQuery("");
  };

  const toggleVendorFilter = (slug: string) => {
    setSelectedVendors((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSaveModel = async (payload: SupportedModelCreate | SupportedModelUpdate) => {
    setModelSaving(true);
    try {
      if (editingModel) {
        const { slug: _s, vendor_slug: _v, ...rest } = payload as SupportedModelCreate;
        await modelCatalogApi.updateModel(editingModel.slug, rest);
        toast.success("保存成功", `模型「${(payload as SupportedModelCreate).name}」已更新`);
      } else {
        await modelCatalogApi.createModel(payload as SupportedModelCreate);
        toast.success("创建成功", `模型「${(payload as SupportedModelCreate).name}」已创建`);
      }
      setModelDialogOpen(false);
      setEditingModel(null);
      setSelectedVendorForCreate(null);
      await refreshModels();
    } catch (error) {
      toast.error("保存失败", getErrorDetail(error, "请重试"));
    } finally {
      setModelSaving(false);
    }
  };

  const handleEditModel = (e: MouseEvent<HTMLButtonElement>, model: SupportedModelItem) => {
    e.stopPropagation();
    const vendor = vendors.find((v) => v.slug === model.vendor.slug);
    if (!vendor) return;
    setEditingModel(model);
    setSelectedVendorForCreate(vendor);
    setModelDialogOpen(true);
  };

  const handleArchiveModel = async (e: MouseEvent<HTMLButtonElement>, model: SupportedModelItem) => {
    e.stopPropagation();
    try {
      await modelCatalogApi.archiveModel(model.slug);
      toast.success("已归档", `模型"${model.name}"已移入归档`);
      await refreshModels();
    } catch (error) {
      toast.error("操作失败", getErrorDetail(error, "请重试"));
    }
  };

  const handleRestoreModel = async (e: MouseEvent<HTMLButtonElement>, model: SupportedModelItem) => {
    e.stopPropagation();
    try {
      await modelCatalogApi.updateModel(model.slug, { is_active: true });
      toast.success("已恢复", `模型"${model.name}"已恢复为在线`);
      await refreshModels();
    } catch (error) {
      toast.error("操作失败", getErrorDetail(error, "请重试"));
    }
  };

  const openCreateDialog = () => {
    if (vendors.length === 0) {
      toast.info("请先创建研发商", "前往研发商管理页面创建");
      return;
    }
    setEditingModel(null);
    setSelectedVendorForCreate(null);
    setModelDialogOpen(false);
    setVendorPickerOpen(true);
  };

  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);

  return (
    <div className="page-stack">
      <PageHeader
        icon={Database}
        title="模型管理"
        subtitle={`共 ${total} 个${statusTab === "archived" ? "归档" : "在线"}模型`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/models/categories">分类管理</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/models/vendors">研发商管理</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadAll()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              新建模型
            </Button>
          </>
        }
      />

      {/* 状态 Tab：在线 / 归档 */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {([
            { key: "active", label: "在线模型" },
            { key: "archived", label: "归档模型" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusTab(tab.key)}
              className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                statusTab === tab.key
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {statusTab === tab.key && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 bg-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>

      {statusTab === "archived" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-sm text-amber-800">
          归档模型不会出现在用户端模型列表中。可点击 <ArchiveRestore className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom" /> 恢复为在线状态。
        </div>
      )}

      {/* 筛选面板 */}
      <div className="panel space-y-4 p-4 sm:p-5">
        {/* 分类 tabs */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${!selectedCategory ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-gray-200"}`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key === selectedCategory ? null : cat.key)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${selectedCategory === cat.key ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-gray-200"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* 研发商筛选 */}
        {vendors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {vendors.map((v) => (
              <button
                key={v.slug}
                type="button"
                onClick={() => toggleVendorFilter(v.slug)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${selectedVendors.includes(v.slug) ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-gray-200"}`}
              >
                {v.name}
              </button>
            ))}
          </div>
        )}

        {/* 搜索 */}
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索模型名称或 slug"
            className="pl-9"
          />
        </div>

        {hasFilters && (
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
            清除筛选
          </button>
        )}
      </div>

      {/* 模型列表 */}
      {loading ? (
        <div className="panel py-24">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : models.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Blocks}
            title={hasFilters ? "没有匹配的模型" : "还没有模型"}
            description={hasFilters ? "调整筛选条件后再试。" : "先前往研发商管理创建研发商，然后新建模型。"}
            action={
              hasFilters
                ? <Button variant="outline" onClick={clearFilters}>清除筛选</Button>
                : <Button onClick={openCreateDialog}><Plus className="mr-2 h-4 w-4" />新建模型</Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {models.map((model) => {
              const displayTags = mapCapabilityTags(model.capability_tags);
              const visibleTags = displayTags.slice(0, 4);
              const extraTagCount = displayTags.length - 4;

              return (
                <div
                  key={model.id}
                  className={`group card-hover relative flex cursor-pointer flex-col rounded-xl bg-white ring-1 ring-inset transition-all ${
                    statusTab === "archived"
                      ? "ring-gray-200 [filter:grayscale(0.4)] opacity-90"
                      : "ring-gray-100"
                  }`}
                  onClick={() => router.push(`/models/${model.slug}`)}
                >
                  {/* 顶部：logo + 分类 */}
                  <div className="mb-3 flex items-center justify-between rounded-t-xl bg-gradient-to-r from-gray-50 to-gray-100/50 p-5 pb-3">
                    <VendorLogo
                      name={model.vendor.name}
                      logoUrl={model.vendor.logo_url}
                      size={42}
                      radius="md"
                    />
                    <div className="flex items-center gap-2">
                      {model.categories[0] && (
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs text-muted-foreground shadow-sm">
                          {model.categories[0].name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col px-5 pb-5">
                    {/* 模型名称 */}
                    <h3 className="mb-2 line-clamp-2 text-base font-semibold text-foreground">
                      {model.vendor.name}/{model.name}
                    </h3>

                    {/* 能力标签 */}
                    {(visibleTags.length > 0 || model.is_reasoning_model) && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {visibleTags.map((tag) => (
                          <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">{tag}</span>
                        ))}
                        {model.is_reasoning_model && (
                          <span className="rounded bg-violet-100 px-2 py-0.5 text-[11px] text-violet-700">推理</span>
                        )}
                        {extraTagCount > 0 && (
                          <span className="rounded bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">+{extraTagCount}</span>
                        )}
                      </div>
                    )}

                    {/* 底部统计 + 操作 */}
                    <div className="mt-auto border-t border-gray-100 pt-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-gray-50 py-1.5">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">CTX</div>
                          <div className="text-sm font-medium tabular-nums text-foreground">{formatContextWindow(model.context_window)}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 py-1.5">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">IN / 1M</div>
                          <div className="text-sm font-medium tabular-nums text-foreground">
                            {model.input_price_per_million != null ? formatYuan(model.input_price_per_million) : "-"}
                          </div>
                        </div>
                        <div className="rounded-lg bg-gray-50 py-1.5">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">OUT / 1M</div>
                          <div className="text-sm font-medium tabular-nums text-foreground">
                            {model.output_price_per_million != null ? formatYuan(model.output_price_per_million) : "-"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button type="button" onClick={(e) => handleEditModel(e, model)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="编辑">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {model.is_active ? (
                          <button
                            type="button"
                            onClick={(e) => void handleArchiveModel(e, model)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-amber-50 hover:text-amber-600"
                            title="归档（用户端将不再展示，可在归档列表恢复）"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => void handleRestoreModel(e, model)}
                            className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"
                            title="恢复为在线"
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="panel overflow-hidden">
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* 选择研发商弹窗 */}
      {vendorPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setVendorPickerOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-foreground">选择研发商</h3>
            <div className="max-h-64 space-y-2 overflow-auto">
              {vendors.map((v) => (
                <button
                  key={v.slug}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-secondary"
                  onClick={() => {
                    setSelectedVendorForCreate(v);
                    setVendorPickerOpen(false);
                    setModelDialogOpen(true);
                  }}
                >
                  <VendorLogo name={v.name} logoUrl={v.logo_url} size={32} />
                  <div>
                    <div className="text-sm font-medium text-foreground">{v.name}</div>
                    <div className="text-xs text-muted-foreground">{v.slug}</div>
                  </div>
                </button>
              ))}
            </div>
            <Button variant="outline" className="mt-4 w-full" onClick={() => setVendorPickerOpen(false)}>
              取消
            </Button>
          </div>
        </div>
      )}

      {selectedVendorForCreate && (
        <ModelFormDialog
          open={modelDialogOpen}
          onOpenChange={(open) => {
            setModelDialogOpen(open);
            if (!open) { setEditingModel(null); setSelectedVendorForCreate(null); }
          }}
          categories={categories}
          fixedVendor={selectedVendorForCreate}
          model={editingModel}
          saving={modelSaving}
          onSubmit={handleSaveModel}
          availableModels={availableModels}
        />
      )}
    </div>
  );
}
