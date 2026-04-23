"use client";

import { useState } from "react";
import { Blocks, Edit3, Plus, Power, PowerOff, RefreshCw, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable, type Column } from "@/components/data-table";
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
import { usePaginatedData } from "@/hooks/use-paginated-data";
import { toast } from "@/hooks/use-toast";
import { LARGE_PAGE_SIZE } from "@/lib/constants";
import { getErrorDetail } from "@/lib/errors";
import { testingApi, type Provider, type ProviderCreate } from "@/lib/api/testing";

type ProviderFormState = ProviderCreate & {
  probe_api_base_url: string;
  probe_api_key: string;
};

const emptyForm: ProviderFormState = {
  slug: "",
  name: "",
  logo_url: "",
  is_active: true,
  probe_api_base_url: "",
  probe_api_key: "",
};

export default function ProvidersPage() {
  const { items: providers, total, page, loading, setPage, refresh } = usePaginatedData<Provider>(
    (params) => testingApi.getProviders(params),
    { pageSize: LARGE_PAGE_SIZE },
  );

  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [form, setForm] = useState<ProviderFormState>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Provider | null>(null);

  const handleAdd = () => {
    setEditingProvider(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setForm({
      slug: provider.slug,
      name: provider.name,
      logo_url: provider.logo_url || "",
      is_active: provider.is_active,
      probe_api_base_url: provider.probe_config?.probe_api_base_url || "",
      probe_api_key: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingProvider) {
        const updateData: Partial<ProviderCreate> = {
          name: form.name,
          logo_url: form.logo_url || undefined,
          probe_api_base_url: form.probe_api_base_url.trim() || null,
        };
        if (form.probe_api_key.trim()) {
          updateData.probe_api_key = form.probe_api_key.trim();
        }
        await testingApi.updateProvider(editingProvider.id, updateData);
      } else {
        await testingApi.createProvider({
          slug: form.slug,
          name: form.name,
          logo_url: form.logo_url || undefined,
          is_active: form.is_active,
          probe_api_base_url: form.probe_api_base_url.trim() || undefined,
          probe_api_key: form.probe_api_key.trim() || undefined,
        });
      }
      setDialogOpen(false);
      await refresh();
    } catch (error: unknown) {
      toast.error("保存失败", getErrorDetail(error, "请重试"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (provider: Provider) => {
    try {
      await testingApi.updateProvider(provider.id, { is_active: !provider.is_active });
      await refresh();
    } catch (error: unknown) {
      toast.error("操作失败", getErrorDetail(error, "请重试"));
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const provider = deleteConfirm;
    try {
      await testingApi.deleteProvider(provider.id);
      toast.success("删除成功", `服务商"${provider.name}"已删除`);
      setDeleteConfirm(null);
      if (providers.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await refresh();
      }
    } catch (error: unknown) {
      toast.error("删除失败", getErrorDetail(error, "请重试"));
    }
  };

  const columns: Column<Provider>[] = [
    {
      key: "name",
      header: "服务商",
      headerClassName: "px-6 py-4 text-left text-sm font-medium",
      render: (provider) => (
        <div className="flex items-center gap-3">
          {provider.logo_url ? (
            <img
              src={provider.logo_url}
              alt={provider.name}
              className="h-10 w-10 rounded-lg border border-border bg-secondary object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                event.currentTarget.nextElementSibling?.removeAttribute("style");
              }}
            />
          ) : null}
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 font-bold text-white shadow-soft"
            style={provider.logo_url ? { display: "none" } : undefined}
          >
            {provider.name.charAt(0)}
          </div>
          <span className="font-medium text-foreground">{provider.name}</span>
        </div>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      headerClassName: "px-6 py-4 text-left text-sm font-medium",
      render: (provider) => (
        <code className="inline-flex items-center rounded bg-secondary px-2 py-1 text-sm text-muted-foreground">
          {provider.slug}
        </code>
      ),
    },
    {
      key: "status",
      header: "状态",
      headerClassName: "px-6 py-4 text-left text-sm font-medium",
      render: (provider) => (
        <span
          className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${
            provider.is_active
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-orange-200 bg-orange-50 text-orange-600"
          }`}
        >
          {provider.is_active ? "启用" : "弃用"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "操作",
      headerClassName: "px-6 py-4 text-right text-sm font-medium",
      render: (provider) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(provider)}>
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleToggleStatus(provider)}
            title={provider.is_active ? "弃用服务商" : "启用服务商"}
          >
            {provider.is_active ? (
              <PowerOff className="h-4 w-4 text-orange-500" />
            ) : (
              <Power className="h-4 w-4 text-green-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteConfirm(provider)}
            title="删除服务商"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">服务商管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理 AI 模型服务商信息</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            新增服务商
          </Button>
        </div>
      </div>

      <div className="table-shell">
        <DataTable
          columns={columns}
          data={providers}
          loading={loading}
          emptyIcon={Blocks}
          emptyTitle="暂无服务商数据"
          emptyDescription="点击「新增服务商」添加第一个服务商。"
          rowKey={(p) => p.id}
          page={page}
          pageSize={LARGE_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="确认删除"
        description={`确认删除服务商"${deleteConfirm?.name}"吗？此操作不可撤销。`}
        variant="destructive"
        confirmLabel="删除"
        onConfirm={handleDelete}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProvider ? "编辑服务商" : "新增服务商"}</DialogTitle>
            <DialogDescription>
              {editingProvider ? "修改服务商信息" : "创建一个新的 AI 模型服务商"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">服务商名称 *</label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="例如：OpenAI"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Slug *</label>
              <Input
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                placeholder="例如：openai"
                disabled={!!editingProvider}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Logo URL</label>
              <Input
                value={form.logo_url}
                onChange={(event) => setForm({ ...form, logo_url: event.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Base URL</label>
              <Input
                value={form.probe_api_base_url}
                onChange={(event) =>
                  setForm({ ...form, probe_api_base_url: event.target.value })
                }
                placeholder="https://api.example.com/v1"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Probe API Key
              </label>
              <Input
                type="password"
                value={form.probe_api_key}
                onChange={(event) => setForm({ ...form, probe_api_key: event.target.value })}
                placeholder={
                  editingProvider?.probe_config?.has_probe_api_key
                    ? `已配置 ${editingProvider.probe_config.probe_api_key_masked || "API Key"}，留空则保持不变`
                    : "输入用于探测/路由的 API Key"
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !form.name || !form.slug}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
