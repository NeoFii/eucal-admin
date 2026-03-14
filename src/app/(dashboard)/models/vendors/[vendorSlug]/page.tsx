"use client";

import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Blocks,
  Database,
  Edit3,
  Plus,
  PowerOff,
  RefreshCw,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ModelFormDialog } from "@/components/models/model-form-dialog";
import { VendorEditorDialog } from "@/components/models/vendor-editor-dialog";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  testingApi,
  type Category,
  type ModelCreate,
  type ModelListItem,
  type ModelUpdate,
  type Vendor,
  type VendorCreate,
} from "@/lib/api/testing";
import { mapCapabilityTags } from "@/lib/model-capabilities";

const PAGE_SIZE = 20;

function getErrorDetail(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { detail?: string; message?: string } } })?.response?.data
      ?.detail ||
    (error as { response?: { data?: { detail?: string; message?: string } } })?.response?.data
      ?.message ||
    fallback
  );
}

export default function VendorModelsPage() {
  const params = useParams();
  const router = useRouter();
  const vendorSlug = params.vendorSlug as string;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<ModelListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modelSaving, setModelSaving] = useState(false);
  const [vendorSaving, setVendorSaving] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelListItem | null>(null);

  const vendor = useMemo(
    () => vendors.find((item) => item.slug === vendorSlug) ?? null,
    [vendorSlug, vendors]
  );

  const loadVendorsAndCategories = useCallback(async () => {
    const [vendorItems, categoryItems] = await Promise.all([
      testingApi.getAllVendors(),
      testingApi.getCategories(),
    ]);
    setVendors(vendorItems);
    setCategories(categoryItems);
  }, []);

  const loadModels = useCallback(async () => {
    const data = await testingApi.getModels({
      vendors: vendorSlug,
      page,
      page_size: PAGE_SIZE,
    });
    setModels(data.items);
    setTotal(data.total);
  }, [page, vendorSlug]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadVendorsAndCategories(), loadModels()]);
    } catch (error) {
      console.error("加载研发商模型数据失败:", error);
      toast.error("加载失败", "请检查后端服务后重试");
    } finally {
      setLoading(false);
    }
  }, [loadModels, loadVendorsAndCategories]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const refreshModels = async () => {
    try {
      await loadModels();
    } catch (error) {
      console.error("刷新模型失败:", error);
      toast.error("刷新失败", "请稍后重试");
    }
  };

  const handleSaveVendor = async (data: VendorCreate) => {
    if (!vendor) {
      return;
    }

    setVendorSaving(true);
    try {
      await testingApi.updateVendor(vendor.id, data);
      toast.success("保存成功", `研发商“${data.name}”已更新`);
      setVendorDialogOpen(false);
      await loadVendorsAndCategories();
    } catch (error: unknown) {
      console.error("保存研发商失败:", error);
      toast.error("保存失败", getErrorDetail(error, "请重试"));
    } finally {
      setVendorSaving(false);
    }
  };

  const handleSaveModel = async (payload: ModelCreate | ModelUpdate) => {
    if (!vendor) {
      return;
    }

    const modelPayload = payload as ModelCreate;
    setModelSaving(true);

    try {
      if (editingModel) {
        const updatePayload: ModelUpdate = {
          name: modelPayload.name,
          description: modelPayload.description,
          capability_tags: modelPayload.capability_tags,
          context_window: modelPayload.context_window,
          max_output_tokens: modelPayload.max_output_tokens,
          is_reasoning_model: modelPayload.is_reasoning_model,
          sort_order: modelPayload.sort_order,
          is_active: modelPayload.is_active,
          categories: modelPayload.categories,
        };
        await testingApi.updateModel(editingModel.slug, updatePayload);
        toast.success("保存成功", `模型“${modelPayload.name}”已更新`);
      } else {
        await testingApi.createModel({
          ...modelPayload,
          vendor_id: vendor.id,
        });
        toast.success("创建成功", `模型“${modelPayload.name}”已创建`);
      }

      setModelDialogOpen(false);
      setEditingModel(null);
      await refreshModels();
    } catch (error: unknown) {
      console.error("保存模型失败:", error);
      toast.error("保存失败", getErrorDetail(error, "请重试"));
    } finally {
      setModelSaving(false);
    }
  };

  const handleEditModel = (event: MouseEvent<HTMLButtonElement>, model: ModelListItem) => {
    event.stopPropagation();
    setEditingModel(model);
    setModelDialogOpen(true);
  };

  const handleDisableModel = async (event: MouseEvent<HTMLButtonElement>, model: ModelListItem) => {
    event.stopPropagation();
    try {
      await testingApi.updateModel(model.slug, { is_active: false });
      toast.success("状态已更新", `模型“${model.name}”已停用`);
      await refreshModels();
    } catch (error: unknown) {
      console.error("停用模型失败:", error);
      toast.error("操作失败", getErrorDetail(error, "请重试"));
    }
  };

  if (loading) {
    return (
      <div className="panel py-24">
        <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="page-stack">
        <div className="panel">
          <EmptyState
            icon={Blocks}
            title="研发商不存在"
            description="当前研发商可能已被删除，或 slug 不存在。"
            action={
              <Button onClick={() => router.push("/models")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回模型管理
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <button
        type="button"
        onClick={() => router.push("/models")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回研发商列表
      </button>

      <PageHeader
        icon={Database}
        title={vendor.name}
        subtitle={`研发商 slug：${vendor.slug}`}
        actions={
          <>
            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
            <Button variant="outline" onClick={() => setVendorDialogOpen(true)}>
              <Edit3 className="mr-2 h-4 w-4" />
              编辑研发商
            </Button>
            <Button
              onClick={() => {
                setEditingModel(null);
                setModelDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              新建模型
            </Button>
          </>
        }
      />

      <Card className="border-border/70">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {vendor.logo_url ? (
              <img
                src={vendor.logo_url}
                alt={vendor.name}
                className="h-16 w-16 rounded-2xl border border-border bg-secondary/40 object-contain"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-xl font-semibold text-primary">
                {vendor.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">研发商信息</div>
              <div className="truncate text-xl font-semibold text-foreground">{vendor.name}</div>
              <div className="truncate text-sm text-muted-foreground">{vendor.slug}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-border/70 bg-secondary/30 px-4 py-3 text-center">
              <div className="text-xs text-muted-foreground">当前模型数</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{total}</div>
            </div>
            <span
              className={`inline-flex rounded-full border px-3 py-1.5 text-sm ${
                vendor.is_active
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-orange-200 bg-orange-50 text-orange-600"
              }`}
            >
              {vendor.is_active ? "启用中" : "已停用"}
            </span>
          </div>
        </CardContent>
      </Card>

      {models.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Blocks}
            title="这个研发商下还没有模型"
            description="先创建第一个模型，后续再进入模型详情维护服务商报价和评测数据。"
            action={
              <Button
                onClick={() => {
                  setEditingModel(null);
                  setModelDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                创建第一个模型
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {models.map((model) => {
              const providerCount = model.provider_count ?? model.providers?.length ?? 0;
              const displayTags = mapCapabilityTags(model.capability_tags);
              const visibleTags = displayTags.slice(0, 4);
              const extraTags = displayTags.length - 4;

              return (
                <Card
                  key={model.id}
                  className="group cursor-pointer border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                  onClick={() => router.push(`/models/${model.slug}`)}
                >
                  <CardContent className="flex h-full flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                          {model.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">{model.slug}</p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs ${
                          model.is_active === false
                            ? "border-orange-200 bg-orange-50 text-orange-600"
                            : "border-green-200 bg-green-50 text-green-700"
                        }`}
                      >
                        {model.is_active === false ? "停用" : "启用"}
                      </span>
                    </div>

                    {visibleTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {visibleTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                        {extraTags > 0 ? (
                          <span className="inline-flex items-center rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                            +{extraTags}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {model.categories.map((category) => (
                        <span
                          key={category.key}
                          className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-4 pt-2">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>{providerCount > 0 ? `${providerCount} 个服务商` : "暂无服务商"}</div>
                        {model.context_window ? <div>上下文 {model.context_window.toLocaleString()}</div> : null}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(event) => handleEditModel(event, model)}
                          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          title="编辑模型"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => void handleDisableModel(event, model)}
                          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-orange-50 hover:text-orange-600"
                          title="停用模型"
                        >
                          <PowerOff className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="panel overflow-hidden">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <VendorEditorDialog
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
        vendor={vendor}
        saving={vendorSaving}
        onSubmit={handleSaveVendor}
      />

      <ModelFormDialog
        open={modelDialogOpen}
        onOpenChange={(open) => {
          setModelDialogOpen(open);
          if (!open) {
            setEditingModel(null);
          }
        }}
        categories={categories}
        fixedVendor={vendor}
        model={editingModel}
        saving={modelSaving}
        onSubmit={handleSaveModel}
      />
    </div>
  );
}
