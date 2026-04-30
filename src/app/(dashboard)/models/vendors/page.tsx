"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable, type Column } from "@/components/data-table";
import { VendorEditorDialog } from "@/components/models/vendor-editor-dialog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { modelCatalogApi } from "@/lib/api/model-catalog";
import { LARGE_PAGE_SIZE } from "@/lib/constants";
import { getErrorDetail } from "@/lib/errors";
import { formatShanghaiDateTime } from "@/lib/time";
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
  const [statusTarget, setStatusTarget] = useState<{ vendor: ModelVendorItem; nextActive: boolean } | null>(null);

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

  const handleConfirmToggle = async () => {
    if (!statusTarget) return;
    try {
      await modelCatalogApi.updateVendor(statusTarget.vendor.slug, { is_active: statusTarget.nextActive });
      toast.success("状态已更新", `${statusTarget.vendor.name} 已${statusTarget.nextActive ? "启用" : "停用"}`);
      setStatusTarget(null);
      await loadData();
    } catch (error) {
      toast.error("操作失败", getErrorDetail(error, "请重试"));
    }
  };

  const columns = useMemo<Column<ModelVendorItem>[]>(() => [
    {
      key: "name",
      header: "研发商",
      render: (vendor) => (
        <div className="flex items-center gap-3">
          {vendor.logo_url?.startsWith("http") ? (
            <img src={vendor.logo_url} alt={vendor.name} className="h-9 w-9 rounded-lg border border-border bg-secondary/40 object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-600">
              {vendor.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{vendor.name}</span>
            <span className="text-sm text-muted-foreground">{vendor.slug}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "状态",
      render: (vendor) => (
        <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
          vendor.is_active
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-gray-200 bg-gray-100 text-gray-600"
        }`}>
          {vendor.is_active ? "启用" : "停用"}
        </span>
      ),
    },
    {
      key: "model_count",
      header: "模型数量",
      className: "px-6 py-4 text-center",
      headerClassName: "whitespace-nowrap px-6 py-4 text-center text-sm font-semibold",
      render: (vendor) => (
        <span className="text-sm">{modelCountByVendor.get(vendor.slug) ?? 0}</span>
      ),
    },
    {
      key: "sort_order",
      header: "排序权重",
      className: "px-6 py-4 text-center",
      headerClassName: "whitespace-nowrap px-6 py-4 text-center text-sm font-semibold",
      render: (vendor) => <span className="text-sm text-muted-foreground">{vendor.sort_order}</span>,
    },
    {
      key: "created_at",
      header: "创建时间",
      render: (vendor) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatShanghaiDateTime(vendor.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "操作",
      render: (vendor) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEditingVendor(vendor); setDialogOpen(true); }}>
            <Edit3 className="mr-1 h-3.5 w-3.5" />
            编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusTarget({ vendor, nextActive: !vendor.is_active })}
            className={vendor.is_active
              ? "border-amber-200 text-amber-600 hover:border-amber-300 hover:bg-amber-50"
              : "border-green-200 text-green-600 hover:border-green-300 hover:bg-green-50"
            }
          >
            {vendor.is_active ? (
              <><PowerOff className="mr-1 h-3.5 w-3.5" />停用</>
            ) : (
              <><Power className="mr-1 h-3.5 w-3.5" />启用</>
            )}
          </Button>
        </div>
      ),
    },
  ], [modelCountByVendor]);

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
            <Button onClick={() => { setEditingVendor(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              新建研发商
            </Button>
          </>
        }
      />

      <Card className="panel">
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="按研发商名称或 slug 搜索"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="table-shell">
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={pagedVendors}
            loading={loading}
            loadingText="正在加载研发商列表..."
            emptyIcon={query ? Search : Blocks}
            emptyTitle={query ? "没有匹配的研发商" : "还没有研发商"}
            emptyDescription={query ? "调整搜索关键字后再试。" : "先创建第一个研发商，然后再在模型管理页面创建模型。"}
            rowKey={(item) => item.id}
            page={page}
            pageSize={LARGE_PAGE_SIZE}
            total={filteredVendors.length}
            onPageChange={setPage}
            showPageInfo
          />
        </div>
      </Card>

      <VendorEditorDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingVendor(null); }}
        vendor={editingVendor}
        saving={saving}
        onSubmit={handleSaveVendor}
      />

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.nextActive ? "启用研发商" : "停用研发商"}
        description={`确认${statusTarget?.nextActive ? "启用" : "停用"}研发商"${statusTarget?.vendor.name ?? ""}"吗？`}
        confirmLabel="确认"
        onConfirm={handleConfirmToggle}
      />
    </div>
  );
}
