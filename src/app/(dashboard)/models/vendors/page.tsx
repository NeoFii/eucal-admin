"use client";

import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Blocks,
  Edit3,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { VendorEditorDialog } from "@/components/models/vendor-editor-dialog";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { LARGE_PAGE_SIZE } from "@/lib/constants";
import { getErrorDetail } from "@/lib/errors";
import { modelCatalogApi } from "@/lib/api/model-catalog";
import type { ModelVendorItem, ModelVendorCreate, SupportedModelItem } from "@/types";

export default function VendorsPage() {
  const router = useRouter();

  const [vendors, setVendors] = useState<ModelVendorItem[]>([]);
  const [allModels, setAllModels] = useState<SupportedModelItem[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<ModelVendorItem | null>(null);
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorItems, modelItems] = await Promise.all([
        modelCatalogApi.getAllVendors(),
        modelCatalogApi.getAllModels(),
      ]);
      setVendors(vendorItems);
      setAllModels(modelItems);
    } catch {
      toast.error("加载失败", "请检查后端服务后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const modelCountByVendor = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of allModels) {
      const vendorSlug = model.vendor?.slug;
      if (!vendorSlug) continue;
      counts.set(vendorSlug, (counts.get(vendorSlug) ?? 0) + 1);
    }
    return counts;
  }, [allModels]);

  const filteredVendors = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return vendors;
    return vendors.filter((v) =>
      v.name.toLowerCase().includes(keyword) || v.slug.toLowerCase().includes(keyword)
    );
  }, [query, vendors]);

  useEffect(() => { setPage(1); }, [query]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredVendors.length / LARGE_PAGE_SIZE));
    if (page > maxPage) setPage(maxPage);
  }, [filteredVendors.length, page]);

  const pagedVendors = useMemo(() => {
    const start = (page - 1) * LARGE_PAGE_SIZE;
    return filteredVendors.slice(start, start + LARGE_PAGE_SIZE);
  }, [filteredVendors, page]);

  const openCreateDialog = () => { setEditingVendor(null); setDialogOpen(true); };

  const openEditDialog = (event: MouseEvent<HTMLButtonElement>, vendor: ModelVendorItem) => {
    event.stopPropagation();
    setEditingVendor(vendor);
    setDialogOpen(true);
  };

  const handleSaveVendor = async (data: ModelVendorCreate) => {
    setSaving(true);
    try {
      if (editingVendor) {
        const { slug: _slug, ...updateData } = data;
        await modelCatalogApi.updateVendor(editingVendor.slug, updateData);
        toast.success("保存成功", `研发商"${data.name}"已更新`);
      } else {
        await modelCatalogApi.createVendor(data);
        toast.success("创建成功", `研发商"${data.name}"已创建`);
      }
      setDialogOpen(false);
      setEditingVendor(null);
      await loadData();
    } catch (error) {
      toast.error("保存失败", getErrorDetail(error, "请重试"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (event: MouseEvent<HTMLButtonElement>, vendor: ModelVendorItem) => {
    event.stopPropagation();
    try {
      await modelCatalogApi.updateVendor(vendor.slug, { is_active: !vendor.is_active });
      toast.success("状态已更新", `${vendor.name} 已${vendor.is_active ? "停用" : "启用"}`);
      await loadData();
    } catch (error) {
      toast.error("操作失败", getErrorDetail(error, "请重试"));
    }
  };

  return (
    <div className="page-stack">
      <button
        type="button"
        onClick={() => router.push("/models")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回模型管理
      </button>

      <PageHeader
        icon={Blocks}
        title="研发商管理"
        subtitle={`共 ${vendors.length} 个研发商`}
        actions={
          <>
            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              新建研发商
            </Button>
          </>
        }
      />

      <div className="panel p-4 sm:p-5">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="按研发商名称或 slug 搜索"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="panel py-24">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : vendors.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Blocks}
            title="还没有研发商"
            description="先创建第一个研发商，然后再在模型管理页面创建模型。"
            action={<Button onClick={openCreateDialog}><Plus className="mr-2 h-4 w-4" />新建研发商</Button>}
          />
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="panel">
          <EmptyState icon={Search} title="没有匹配的研发商" description="调整搜索关键字后再试。" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pagedVendors.map((vendor) => {
              const modelCount = modelCountByVendor.get(vendor.slug) ?? 0;
              return (
                <Card key={vendor.id} className="group transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        {vendor.logo_url?.startsWith("http") ? (
                          <img src={vendor.logo_url} alt={vendor.name} className="h-12 w-12 rounded-2xl border border-border bg-secondary/40 object-contain" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-base font-semibold text-gray-600">
                            {vendor.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-semibold text-foreground">{vendor.name}</h3>
                          <p className="truncate text-sm text-muted-foreground">{vendor.slug}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-1 text-xs ${vendor.is_active ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-100 text-gray-600"}`}>
                        {vendor.is_active ? "启用" : "停用"}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="text-xs text-muted-foreground">模型数量</div>
                      <div className="mt-1 text-2xl font-semibold text-foreground">{modelCount}</div>
                    </div>
                    <div className="mt-auto flex items-center justify-end gap-1">
                      <button type="button" onClick={(e) => openEditDialog(e, vendor)} className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" title="编辑研发商">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={(e) => void handleToggleStatus(e, vendor)} className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" title={vendor.is_active ? "停用研发商" : "启用研发商"}>
                        {vendor.is_active ? <PowerOff className="h-4 w-4 text-amber-500" /> : <Power className="h-4 w-4 text-green-600" />}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="panel overflow-hidden">
            <Pagination page={page} pageSize={LARGE_PAGE_SIZE} total={filteredVendors.length} onPageChange={setPage} />
          </div>
        </>
      )}

      <VendorEditorDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingVendor(null); }}
        vendor={editingVendor}
        saving={saving}
        onSubmit={handleSaveVendor}
      />
    </div>
  );
}
