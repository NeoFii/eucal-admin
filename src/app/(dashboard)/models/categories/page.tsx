"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit3,
  Layers,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
} from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable, type Column } from "@/components/data-table";
import { CategoryEditorDialog } from "@/components/models/category-editor-dialog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { modelCatalogApi } from "@/lib/api/model-catalog";
import { LARGE_PAGE_SIZE } from "@/lib/constants";
import { getErrorDetail } from "@/lib/errors";
import { formatShanghaiDateTime } from "@/lib/time";
import type { ModelCategoryCreate, ModelCategoryItem, SupportedModelItem } from "@/types";

export default function CategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<ModelCategoryItem[]>([]);
  const [allModels, setAllModels] = useState<SupportedModelItem[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ModelCategoryItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ category: ModelCategoryItem; nextActive: boolean } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [categoryItems, modelItems] = await Promise.all([
        modelCatalogApi.getAllCategories(),
        modelCatalogApi.getAllModels(),
      ]);
      setCategories(categoryItems);
      setAllModels(modelItems);
    } catch {
      toast.error("加载失败", "请检查后端服务后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const modelCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of allModels) {
      if (!model.categories) continue;
      for (const cat of model.categories) {
        counts.set(cat.key, (counts.get(cat.key) ?? 0) + 1);
      }
    }
    return counts;
  }, [allModels]);

  const filteredCategories = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(keyword) || c.key.toLowerCase().includes(keyword)
    );
  }, [query, categories]);

  useEffect(() => { setPage(1); }, [query]);

  const pagedCategories = useMemo(() => {
    const start = (page - 1) * LARGE_PAGE_SIZE;
    return filteredCategories.slice(start, start + LARGE_PAGE_SIZE);
  }, [filteredCategories, page]);

  const handleSaveCategory = async (data: ModelCategoryCreate) => {
    setSaving(true);
    try {
      if (editingCategory) {
        await modelCatalogApi.updateCategory(editingCategory.key, {
          name: data.name,
          sort_order: data.sort_order,
        });
        toast.success("更新成功", `分类"${data.name}"已更新`);
      } else {
        await modelCatalogApi.createCategory(data);
        toast.success("创建成功", `分类"${data.name}"已创建`);
      }
      setDialogOpen(false);
      setEditingCategory(null);
      await loadData();
    } catch (error) {
      toast.error(editingCategory ? "更新失败" : "创建失败", getErrorDetail(error, "请稍后重试"));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!statusTarget) return;
    try {
      await modelCatalogApi.updateCategory(statusTarget.category.key, {
        is_active: statusTarget.nextActive,
      });
      toast.success(
        statusTarget.nextActive ? "已启用" : "已停用",
        `分类"${statusTarget.category.name}"${statusTarget.nextActive ? "已启用" : "已停用"}`
      );
      setStatusTarget(null);
      await loadData();
    } catch (error) {
      toast.error("操作失败", getErrorDetail(error, "请稍后重试"));
    }
  };

  const columns: Column<ModelCategoryItem>[] = [
    {
      key: "name",
      header: "分类名称",
      render: (item) => (
        <span className="font-medium text-foreground">{item.name}</span>
      ),
    },
    {
      key: "key",
      header: "Key",
      render: (item) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.key}</code>
      ),
    },
    {
      key: "sort_order",
      header: "排序",
      render: (item) => <span className="text-muted-foreground">{item.sort_order}</span>,
    },
    {
      key: "is_active",
      header: "状态",
      render: (item) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            item.is_active
              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {item.is_active ? "启用" : "停用"}
        </span>
      ),
    },
    {
      key: "model_count",
      header: "关联模型",
      render: (item) => (
        <span className="text-muted-foreground">{modelCountByCategory.get(item.key) ?? 0}</span>
      ),
    },
    {
      key: "updated_at",
      header: "更新时间",
      render: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.updated_at ? formatShanghaiDateTime(item.updated_at) : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "操作",
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditingCategory(item); setDialogOpen(true); }}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusTarget({ category: item, nextActive: !item.is_active })}
          >
            {item.is_active ? (
              <PowerOff className="h-4 w-4 text-destructive" />
            ) : (
              <Power className="h-4 w-4 text-green-600" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/models")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回模型管理
        </Button>
      </div>

      <PageHeader
        icon={Layers}
        title="分类管理"
        subtitle="管理模型能力分类，用于模型目录的筛选和归类"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void loadData()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              刷新
            </Button>
            <Button size="sm" onClick={() => { setEditingCategory(null); setDialogOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" />
              新增分类
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索分类名称或 Key..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="table-shell">
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={pagedCategories}
            loading={loading}
            loadingText="正在加载分类列表..."
            emptyIcon={query ? Search : Layers}
            emptyTitle={query ? "没有匹配的分类" : "还没有分类"}
            emptyDescription={query ? "调整搜索关键字后再试。" : "先创建第一个分类，然后在模型管理中关联使用。"}
            rowKey={(item) => item.id}
            page={page}
            pageSize={LARGE_PAGE_SIZE}
            total={filteredCategories.length}
            onPageChange={setPage}
            showPageInfo
          />
        </div>
      </Card>

      <CategoryEditorDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingCategory(null); }}
        category={editingCategory}
        saving={saving}
        onSubmit={handleSaveCategory}
      />

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.nextActive ? "启用分类" : "停用分类"}
        description={`确认${statusTarget?.nextActive ? "启用" : "停用"}分类"${statusTarget?.category.name ?? ""}"吗？`}
        confirmLabel="确认"
        onConfirm={handleConfirmToggle}
      />
    </div>
  );
}
