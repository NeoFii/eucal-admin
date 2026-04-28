"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Shield,
  Trash2,
} from "lucide-react";
import type { Column } from "@/components/data-table";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { usePaginatedData } from "@/hooks/use-paginated-data";
import { useFormDialog } from "@/hooks/use-form-dialog";
import { poolsApi } from "@/lib/api/pools";
import { useAuthStore } from "@/stores/auth";
import { getErrorDetail } from "@/lib/errors";
import type { PoolItem, PoolCreate, PoolUpdate } from "@/types";

interface PoolForm {
  slug: string;
  name: string;
  base_url: string;
  priority: string;
  weight: string;
  health_check_endpoint: string;
  remark: string;
  is_enabled: boolean;
}

const EMPTY_FORM: PoolForm = {
  slug: "", name: "", base_url: "", priority: "0", weight: "1",
  health_check_endpoint: "", remark: "", is_enabled: true,
};
export default function PoolsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { items, total, page, pageSize, loading, setPage, refresh } =
    usePaginatedData<PoolItem>(poolsApi.getList, { pageSize: 50 });

  const { open, editing, form, saving, setForm, openCreate, openEdit, close, submit } =
    useFormDialog<PoolItem, PoolForm>({
      emptyForm: EMPTY_FORM,
      mapToForm: (p) => ({
        slug: p.slug, name: p.name, base_url: p.base_url,
        priority: String(p.priority), weight: String(p.weight),
        health_check_endpoint: p.health_check_endpoint ?? "",
        remark: p.remark ?? "", is_enabled: p.is_enabled,
      }),
    });

  const [disableTarget, setDisableTarget] = useState<PoolItem | null>(null);

  const handleSave = async () => {
    await submit(async () => {
      if (editing) {
        const payload: PoolUpdate = {};
        if (form.name) payload.name = form.name;
        if (form.base_url) payload.base_url = form.base_url;
        payload.is_enabled = form.is_enabled;
        payload.priority = parseInt(form.priority) || 0;
        payload.weight = parseInt(form.weight) || 1;
        if (form.health_check_endpoint) payload.health_check_endpoint = form.health_check_endpoint;
        if (form.remark) payload.remark = form.remark;
        await poolsApi.update(editing.slug, payload);
        toast.success("更新成功", `号池 ${editing.slug} 已更新`);
      } else {
        const payload: PoolCreate = {
          slug: form.slug, name: form.name, base_url: form.base_url,
          priority: parseInt(form.priority) || 0,
          weight: parseInt(form.weight) || 1,
          health_check_endpoint: form.health_check_endpoint || undefined,
          remark: form.remark || undefined,
        };
        await poolsApi.create(payload);
        toast.success("创建成功", `号池 ${form.slug} 已创建`);
      }
      refresh();
    });
  };

  const handleDisable = async () => {
    if (!disableTarget) return;
    try {
      await poolsApi.disable(disableTarget.slug);
      toast.success("已禁用", `号池 ${disableTarget.slug} 已禁用`);
      refresh();
    } catch (e) {
      toast.error("操作失败", getErrorDetail(e, "请重试"));
    }
  };

  const columns = useMemo<Column<PoolItem>[]>(() => [
    {
      key: "name", header: "号池",
      render: (r) => (
        <button onClick={() => router.push(`/pools/${r.slug}`)} className="text-left hover:underline">
          <span className="font-medium">{r.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">{r.slug}</span>
        </button>
      ),
    },
    { key: "base_url", header: "请求地址", render: (r) => <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px] block">{r.base_url}</span> },
    {
      key: "is_enabled", header: "状态",
      render: (r) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${r.is_enabled ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {r.is_enabled ? <><Power className="h-3 w-3" /> 启用</> : <><PowerOff className="h-3 w-3" /> 禁用</>}
        </span>
      ),
    },
    { key: "model_count", header: "模型数", render: (r) => String(r.model_count) },
    { key: "account_count", header: "账号数", render: (r) => String(r.account_count) },
    { key: "priority", header: "优先级", render: (r) => String(r.priority) },
    { key: "weight", header: "权重", render: (r) => String(r.weight) },
    {
      key: "actions", header: "操作",
      render: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/pools/${r.slug}`)}>详情</Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDisableTarget(r)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
        </div>
      ),
    },
  ], [openEdit, router]);

  if (!mounted) return null;
  if (!isSuperAdmin) {
    return <EmptyState icon={Shield} title="无权访问" description="此页面仅限超级管理员访问" />;
  }
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Layers}
        title="号池管理"
        subtitle="管理上游平台号池、模型配置和 API 账号"
        actions={<Button onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> 新建号池</Button>}
      />

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns} data={items} loading={loading}
            rowKey={(r) => r.slug} emptyIcon={Layers}
            emptyTitle="暂无号池" emptyDescription="点击上方按钮创建第一个号池"
            page={page} pageSize={pageSize} total={total} onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑号池" : "新建号池"}</DialogTitle>
            <DialogDescription>{editing ? `编辑 ${editing.slug}` : "创建新的上游平台号池"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>标识 (slug)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!editing} placeholder="如 openai-official" />
            </div>
            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 OpenAI 官方" />
            </div>
            <div className="space-y-2">
              <Label>请求地址 (Base URL)</Label>
              <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.openai.com/v1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>优先级</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>权重</Label>
                <Input type="number" min="1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>健康检查接口</Label>
              <Input value={form.health_check_endpoint} onChange={(e) => setForm({ ...form, health_check_endpoint: e.target.value })} placeholder="可选" />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
            </div>
            {editing && (
              <div className="flex items-center gap-3">
                <Label>状态</Label>
                <button type="button" onClick={() => setForm({ ...form, is_enabled: !form.is_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_enabled ? "bg-emerald-500" : "bg-gray-300"}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form.is_enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <span className="text-sm text-muted-foreground">{form.is_enabled ? "启用" : "禁用"}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!disableTarget} onOpenChange={(v) => !v && setDisableTarget(null)}
        title="禁用号池" description={`确定要禁用号池 "${disableTarget?.name}" 吗？禁用后该号池下所有账号将停止服务。`}
        confirmLabel="禁用" variant="destructive" onConfirm={handleDisable}
      />
    </div>
  );
}
