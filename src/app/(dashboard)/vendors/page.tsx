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
  type Vendor,
  type VendorCreate,
} from "@/lib/api/testing";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  RefreshCw,
  Building2,
  Edit3,
  PowerOff,
  Power,
} from "lucide-react";

const emptyForm: VendorCreate = {
  slug: "",
  name: "",
  logo_url: "",
  is_active: true,
};

const PAGE_SIZE = 20;

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState<VendorCreate>(emptyForm);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await testingApi.getVendors({ page, page_size: PAGE_SIZE });
      setVendors(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("加载研发商失败:", error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleAdd = () => {
    setEditingVendor(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setForm({
      slug: vendor.slug,
      name: vendor.name,
      logo_url: vendor.logo_url || "",
      is_active: vendor.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingVendor) {
        await testingApi.updateVendor(editingVendor.id, {
          name: form.name,
          logo_url: form.logo_url || undefined,
        });
      } else {
        await testingApi.createVendor(form);
      }
      setDialogOpen(false);
      loadVendors();
    } catch (error) {
      console.error("保存研发商失败:", error);
      toast.error("保存失败", "请重试");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (vendor: Vendor) => {
    try {
      await testingApi.updateVendor(vendor.id, {
        is_active: !vendor.is_active,
      });
      loadVendors();
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
          <h1 className="text-2xl font-semibold text-foreground">研发商管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理 AI 模型研发商（模型创建方，如 Anthropic / OpenAI / DeepSeek）</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadVendors} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            新增研发商
          </Button>
        </div>
      </div>

      {/* 研发商列表 */}
      {loading ? (
        <div className="panel py-16">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
        </div>
      ) : vendors.length === 0 ? (
        <div className="panel py-16 text-center text-muted-foreground">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p>暂无研发商数据</p>
        </div>
      ) : (
        <div className="table-shell">
          <table className="w-full">
            <thead className="table-head border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium">研发商</th>
                <th className="px-6 py-4 text-left text-sm font-medium">Slug</th>
                <th className="px-6 py-4 text-left text-sm font-medium">状态</th>
                <th className="px-6 py-4 text-right text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="table-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {vendor.logo_url ? (
                        <img
                          src={vendor.logo_url}
                          alt={vendor.name}
                          className="h-10 w-10 rounded-lg border border-border bg-secondary object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.removeAttribute("style");
                          }}
                        />
                      ) : null}
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 font-bold text-white shadow-soft"
                        style={vendor.logo_url ? { display: "none" } : undefined}
                      >
                        {vendor.name.charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">{vendor.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="rounded bg-secondary px-2 py-1 text-sm text-muted-foreground">
                      {vendor.slug}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs ${
                        vendor.is_active
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-red-200 bg-red-50 text-red-600"
                      }`}
                    >
                      {vendor.is_active ? "启用" : "废弃"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(vendor)}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(vendor)}
                        title={vendor.is_active ? "废弃研发商" : "重新启用"}
                      >
                        {vendor.is_active ? (
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
            <DialogTitle>{editingVendor ? "编辑研发商" : "新增研发商"}</DialogTitle>
            <DialogDescription>
              {editingVendor ? "修改研发商信息" : "创建一个新的 AI 模型研发商"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">研发商名称 *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：Anthropic"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Slug *</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="例如：anthropic"
                disabled={!!editingVendor}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Logo URL</label>
              <Input
                value={form.logo_url ?? ""}
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
