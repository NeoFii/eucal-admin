"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type Provider,
  type ProviderCreate,
} from "@/lib/api/testing";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  RefreshCw,
  Blocks,
  Edit3,
  PowerOff,
  Power,
} from "lucide-react";

// 空状态表单
const emptyForm: ProviderCreate = {
  slug: "",
  name: "",
  logo_url: "",
  is_active: true,
};

const PAGE_SIZE = 20;

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [form, setForm] = useState<ProviderCreate>(emptyForm);

  // 加载供应商列表
  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await testingApi.getProviders({ page, page_size: PAGE_SIZE });
      setProviders(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("加载供应商失败:", error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // 打开新增对话框
  const handleAdd = () => {
    setEditingProvider(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setForm({
      slug: provider.slug,
      name: provider.name,
      logo_url: provider.logo_url || "",
      is_active: provider.is_active,
    });
    setDialogOpen(true);
  };

  // 保存供应商
  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingProvider) {
        await testingApi.updateProvider(editingProvider.id, form);
      } else {
        await testingApi.createProvider(form);
      }
      setDialogOpen(false);
      loadProviders();
    } catch (error) {
      console.error("保存供应商失败:", error);
      toast.error("保存失败", "请重试");
    } finally {
      setSaving(false);
    }
  };

  // 切换状态
  const toggleStatus = async (provider: Provider) => {
    try {
      await testingApi.updateProvider(provider.id, {
        is_active: !provider.is_active,
      });
      loadProviders();
    } catch (error) {
      console.error("更新状态失败:", error);
    }
  };

  return (
    <div className="page-stack">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">服务商管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理 AI 模型服务商信息</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadProviders} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            新增服务商
          </Button>
        </div>
      </div>

      {/* 供应商列表 */}
      {loading ? (
        <div className="panel py-16">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
        </div>
      ) : providers.length === 0 ? (
        <div className="panel py-16 text-center text-muted-foreground">
          <Blocks className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p>暂无服务商数据</p>
        </div>
      ) : (
        <div className="table-shell">
          <table className="w-full">
            <thead className="table-head border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium">服务商</th>
                <th className="px-6 py-4 text-left text-sm font-medium">Slug</th>
                <th className="px-6 py-4 text-left text-sm font-medium">状态</th>
                <th className="px-6 py-4 text-right text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {providers.map((provider) => (
                <tr key={provider.id} className="table-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {provider.logo_url ? (
                        <img
                          src={provider.logo_url}
                          alt={provider.name}
                          className="h-10 w-10 rounded-lg border border-border bg-secondary object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.removeAttribute("style");
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
                  </td>
                  <td className="px-6 py-4">
                    <code className="rounded bg-secondary px-2 py-1 text-sm text-muted-foreground">
                      {provider.slug}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs ${
                        provider.is_active
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-red-200 bg-red-50 text-red-600"
                      }`}
                    >
                      {provider.is_active ? "启用" : "废弃"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(provider)}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(provider)}
                      >
                        {provider.is_active ? (
                          <PowerOff className="w-4 h-4 text-orange-500" />
                        ) : (
                          <Power className="w-4 h-4 text-green-500" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* 新增/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：OpenAI"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Slug *</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="例如：openai"
                disabled={!!editingProvider}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Logo URL</label>
              <Input
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.slug}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
