"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CircleDollarSign,
  Cpu,
  Gauge,
  KeyRound,
  Layers,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
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
import { poolsApi } from "@/lib/api/pools";
import { getErrorDetail } from "@/lib/errors";
import { formatShanghaiDateTime } from "@/lib/time";
import type {
  PoolDetail,
  PoolAccountCreate,
  PoolAccountUpdate,
  PoolModelCreate,
  PoolModelUpdate,
  PoolAccountItem,
  PoolModelItem,
} from "@/types";
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "正常", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  disabled: { label: "禁用", color: "bg-gray-100 text-gray-600 border-gray-200" },
  exhausted: { label: "余额耗尽", color: "bg-amber-50 text-amber-700 border-amber-200" },
  error: { label: "异常", color: "bg-red-50 text-red-700 border-red-200" },
};

function formatBalance(fen: number): string {
  return `¥${(fen / 100).toFixed(2)}`;
}

export default function PoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Account dialogs
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PoolAccountItem | null>(null);
  const [accountForm, setAccountForm] = useState({ name: "", api_key: "", balance: "0", rpm_limit: "", tpm_limit: "", weight: "1", remark: "" });
  const [accountSaving, setAccountSaving] = useState(false);
  const [disableAccountTarget, setDisableAccountTarget] = useState<PoolAccountItem | null>(null);

  // Model dialogs
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<PoolModelItem | null>(null);
  const [modelForm, setModelForm] = useState({ model_slug: "", upstream_model_id: "", input_price: "0", output_price: "0", cached_price: "", context_length: "" });
  const [modelSaving, setModelSaving] = useState(false);
  const [removeModelTarget, setRemoveModelTarget] = useState<PoolModelItem | null>(null);

  // Automation state
  const [syncing, setSyncing] = useState(false);
  const [checking, setChecking] = useState(false);

  // Models list dialog
  const [modelsDialogOpen, setModelsDialogOpen] = useState(false);

  const loadPool = useCallback(async () => {
    setLoading(true);
    try {
      const data = await poolsApi.getDetail(slug);
      setPool(data);
    } catch {
      toast.error("加载失败", "请检查后端服务");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { void loadPool(); }, [loadPool]);
  // ── Account handlers ──
  const openAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({ name: "", api_key: "", balance: "0", rpm_limit: "", tpm_limit: "", weight: "1", remark: "" });
    setAccountDialogOpen(true);
  };
  const openEditAccount = (a: PoolAccountItem) => {
    setEditingAccount(a);
    setAccountForm({
      name: a.name, api_key: "", balance: String(a.balance),
      rpm_limit: a.rpm_limit != null ? String(a.rpm_limit) : "",
      tpm_limit: a.tpm_limit != null ? String(a.tpm_limit) : "",
      weight: String(a.weight), remark: a.remark ?? "",
    });
    setAccountDialogOpen(true);
  };
  const handleSaveAccount = async () => {
    setAccountSaving(true);
    try {
      if (editingAccount) {
        const payload: PoolAccountUpdate = {};
        if (accountForm.name) payload.name = accountForm.name;
        if (accountForm.api_key) payload.api_key = accountForm.api_key;
        payload.balance = parseInt(accountForm.balance) || 0;
        if (accountForm.rpm_limit) payload.rpm_limit = parseInt(accountForm.rpm_limit);
        if (accountForm.tpm_limit) payload.tpm_limit = parseInt(accountForm.tpm_limit);
        payload.weight = parseInt(accountForm.weight) || 1;
        if (accountForm.remark) payload.remark = accountForm.remark;
        await poolsApi.updateAccount(slug, editingAccount.id, payload);
        toast.success("更新成功", `账号 ${editingAccount.name} 已更新`);
      } else {
        const payload: PoolAccountCreate = {
          name: accountForm.name, api_key: accountForm.api_key,
          balance: parseInt(accountForm.balance) || 0,
          rpm_limit: accountForm.rpm_limit ? parseInt(accountForm.rpm_limit) : undefined,
          tpm_limit: accountForm.tpm_limit ? parseInt(accountForm.tpm_limit) : undefined,
          weight: parseInt(accountForm.weight) || 1,
          remark: accountForm.remark || undefined,
        };
        await poolsApi.addAccount(slug, payload);
        toast.success("添加成功", `账号 ${accountForm.name} 已添加`);
      }
      setAccountDialogOpen(false);
      await loadPool();
    } catch (e) {
      toast.error("操作失败", getErrorDetail(e, "请重试"));
    } finally {
      setAccountSaving(false);
    }
  };
  const handleDisableAccount = async () => {
    if (!disableAccountTarget) return;
    try {
      await poolsApi.disableAccount(slug, disableAccountTarget.id);
      toast.success("已禁用", `账号 ${disableAccountTarget.name} 已禁用`);
      await loadPool();
    } catch (e) {
      toast.error("操作失败", getErrorDetail(e, "请重试"));
    }
  };
  // ── Model handlers ──
  const openAddModel = () => {
    setEditingModel(null);
    setModelForm({ model_slug: "", upstream_model_id: "", input_price: "0", output_price: "0", cached_price: "", context_length: "" });
    setModelDialogOpen(true);
  };
  const openEditModel = (m: PoolModelItem) => {
    setEditingModel(m);
    setModelForm({
      model_slug: m.model_slug, upstream_model_id: m.upstream_model_id,
      input_price: String(m.input_price_per_million / 100), output_price: String(m.output_price_per_million / 100),
      cached_price: m.cached_input_price_per_million != null ? String(m.cached_input_price_per_million / 100) : "",
      context_length: m.context_length != null ? String(m.context_length) : "",
    });
    setModelDialogOpen(true);
  };
  const handleSaveModel = async () => {
    setModelSaving(true);
    try {
      if (editingModel) {
        const payload: PoolModelUpdate = {
          upstream_model_id: modelForm.upstream_model_id || undefined,
          input_price_per_million: Math.round(parseFloat(modelForm.input_price) * 100) || 0,
          output_price_per_million: Math.round(parseFloat(modelForm.output_price) * 100) || 0,
          cached_input_price_per_million: modelForm.cached_price ? Math.round(parseFloat(modelForm.cached_price) * 100) : undefined,
          context_length: modelForm.context_length ? parseInt(modelForm.context_length) : undefined,
        };
        await poolsApi.updateModel(slug, editingModel.model_slug, payload);
        toast.success("更新成功", `模型 ${editingModel.model_slug} 已更新`);
      } else {
        const payload: PoolModelCreate = {
          model_slug: modelForm.model_slug, upstream_model_id: modelForm.upstream_model_id,
          input_price_per_million: Math.round(parseFloat(modelForm.input_price) * 100) || 0,
          output_price_per_million: Math.round(parseFloat(modelForm.output_price) * 100) || 0,
          cached_input_price_per_million: modelForm.cached_price ? Math.round(parseFloat(modelForm.cached_price) * 100) : undefined,
          context_length: modelForm.context_length ? parseInt(modelForm.context_length) : undefined,
        };
        await poolsApi.addModel(slug, payload);
        toast.success("添加成功", `模型 ${modelForm.model_slug} 已添加`);
      }
      setModelDialogOpen(false);
      await loadPool();
    } catch (e) {
      toast.error("操作失败", getErrorDetail(e, "请重试"));
    } finally {
      setModelSaving(false);
    }
  };
  const handleRemoveModel = async () => {
    if (!removeModelTarget) return;
    try {
      await poolsApi.removeModel(slug, removeModelTarget.model_slug);
      toast.success("已移除", `模型 ${removeModelTarget.model_slug} 已移除`);
      setRemoveModelTarget(null);
      await loadPool();
    } catch (e) {
      toast.error("操作失败", getErrorDetail(e, "请重试"));
    }
  };

  const handleSyncModels = async () => {
    setSyncing(true);
    try {
      const result = await poolsApi.syncModels(slug);
      const parts = [];
      if (result.added.length) parts.push(`新增 ${result.added.length}`);
      if (result.updated.length) parts.push(`更新价格 ${result.updated.length}`);
      parts.push(`上游共 ${result.total_upstream} 个`);
      toast.success("同步完成", parts.join("，"));
      await loadPool();
    } catch (e) {
      toast.error("同步失败", getErrorDetail(e, "请检查号池配置和网络"));
    } finally {
      setSyncing(false);
    }
  };

  const handleCheckBalances = async () => {
    setChecking(true);
    try {
      const result = await poolsApi.checkBalances(slug);
      const errors = result.results.filter((r) => r.error);
      if (errors.length > 0) {
        toast.info("部分检查失败", `${result.results.length - errors.length} 个成功，${errors.length} 个失败`);
      } else {
        toast.success("检查完成", `${result.results.length} 个账号余额已更新`);
      }
      await loadPool();
    } catch (e) {
      toast.error("检查失败", getErrorDetail(e, "请检查 health_check_endpoint 配置"));
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return <div className="panel py-24"><RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" /></div>;
  }
  if (!pool) {
    return (
      <div className="page-stack">
        <div className="panel">
          <EmptyState icon={Layers} title="号池不存在" description="当前号池可能已被删除"
            action={<Button onClick={() => router.push("/pools")}><ArrowLeft className="mr-2 h-4 w-4" />返回号池列表</Button>} />
        </div>
      </div>
    );
  }
  return (
    <div className="page-stack">
      <button type="button" onClick={() => router.push("/pools")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 返回号池列表
      </button>

      <PageHeader icon={Layers} title={pool.name} subtitle={`${pool.slug} · ${pool.base_url}`}
        actions={
          <Button variant="outline" onClick={() => void loadPool()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> 刷新
          </Button>
        }
      />

      {/* Pool info card */}
      <Card className="border-border/70">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">请求地址</div>
            <div className="font-mono text-sm">{pool.base_url}</div>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setModelsDialogOpen(true)}
              className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-center transition-colors hover:border-blue-300 hover:bg-blue-50">
              <div className="text-xs text-muted-foreground">模型数</div>
              <div className="mt-1 text-2xl font-semibold">{pool.models.length}</div>
              <div className="mt-1 text-[11px] text-blue-600">点击查看</div>
            </button>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-center">
              <div className="text-xs text-muted-foreground">账号数</div>
              <div className="mt-1 text-2xl font-semibold">{pool.accounts.length}</div>
            </div>
            <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${pool.is_enabled ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-100 text-gray-600"}`}>
              {pool.is_enabled ? "启用中" : "已停用"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Accounts section — card grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">账号列表</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCheckBalances} disabled={checking || !pool.health_check_endpoint} title={pool.health_check_endpoint ? undefined : "请先配置 health_check_endpoint"}>
              <CircleDollarSign className={`mr-1.5 h-4 w-4 ${checking ? "animate-pulse" : ""}`} /> {checking ? "检查中..." : "检查余额"}
            </Button>
            <Button variant="outline" size="sm" onClick={openAddAccount}><Plus className="mr-1.5 h-4 w-4" /> 添加账号</Button>
          </div>
        </div>
        {pool.accounts.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">暂无账号，点击上方按钮添加</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pool.accounts.map((a) => {
              const st = STATUS_MAP[a.status] ?? STATUS_MAP.error;
              return (
                <Card key={a.id} className="transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    {/* Header: name + status */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">{a.name}</h3>
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                          <KeyRound className="h-3 w-3" /> {a.mask}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${st.color}`}>
                        {a.status === "active" ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}
                        {st.label}
                      </span>
                    </div>

                    {/* Key metrics */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><CircleDollarSign className="h-3 w-3" /> 余额</div>
                        <div className="mt-0.5 text-sm font-semibold">{formatBalance(a.balance)}</div>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Zap className="h-3 w-3" /> 权重</div>
                        <div className="mt-0.5 text-sm font-semibold">{a.weight}</div>
                      </div>
                    </div>

                    {/* Rate limits */}
                    {(a.rpm_limit != null || a.tpm_limit != null) && (
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {a.rpm_limit != null && (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-blue-700">
                            <Gauge className="h-3 w-3" /> {a.rpm_limit} RPM
                          </span>
                        )}
                        {a.tpm_limit != null && (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-purple-700">
                            <Gauge className="h-3 w-3" /> {a.tpm_limit.toLocaleString()} TPM
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer: remark + actions */}
                    <div className="mt-auto flex items-center justify-between pt-1">
                      <div className="min-w-0 text-xs text-muted-foreground">
                        {a.remark ? <span className="truncate block max-w-[160px]">{a.remark}</span> : <span>{formatShanghaiDateTime(a.updated_at)}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEditAccount(a)}
                          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" title="编辑">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDisableAccountTarget(a)}
                          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500" title="禁用">
                          <PowerOff className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      {/* Account Create/Edit Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={(v) => !v && setAccountDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "编辑账号" : "添加账号"}</DialogTitle>
            <DialogDescription>{editingAccount ? `编辑 ${editingAccount.name}` : `为号池 ${pool.name} 添加新账号`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="如 主号、备用1" />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input type="password" value={accountForm.api_key} onChange={(e) => setAccountForm({ ...accountForm, api_key: e.target.value })} placeholder={editingAccount ? "留空则不更新" : "sk-..."} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>余额（分）</Label>
                <Input type="number" value={accountForm.balance} onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>权重</Label>
                <Input type="number" min="1" value={accountForm.weight} onChange={(e) => setAccountForm({ ...accountForm, weight: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>RPM 上限</Label>
                <Input type="number" value={accountForm.rpm_limit} onChange={(e) => setAccountForm({ ...accountForm, rpm_limit: e.target.value })} placeholder="可选" />
              </div>
              <div className="space-y-2">
                <Label>TPM 上限</Label>
                <Input type="number" value={accountForm.tpm_limit} onChange={(e) => setAccountForm({ ...accountForm, tpm_limit: e.target.value })} placeholder="可选" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input value={accountForm.remark} onChange={(e) => setAccountForm({ ...accountForm, remark: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveAccount} disabled={accountSaving}>{accountSaving ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Model Create/Edit Dialog */}
      <Dialog open={modelDialogOpen} onOpenChange={(v) => !v && setModelDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingModel ? "编辑模型" : "添加模型"}</DialogTitle>
            <DialogDescription>{editingModel ? `编辑 ${editingModel.model_slug}` : `为号池 ${pool.name} 添加支持的模型`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>模型标识</Label>
              <Input value={modelForm.model_slug} onChange={(e) => setModelForm({ ...modelForm, model_slug: e.target.value })} disabled={!!editingModel} placeholder="如 gpt-5-4" />
            </div>
            <div className="space-y-2">
              <Label>上游模型 ID</Label>
              <Input value={modelForm.upstream_model_id} onChange={(e) => setModelForm({ ...modelForm, upstream_model_id: e.target.value })} placeholder="如 gpt-5.4" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>输入价格（元/百万tokens）</Label>
                <Input type="number" value={modelForm.input_price} onChange={(e) => setModelForm({ ...modelForm, input_price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>输出价格（元/百万tokens）</Label>
                <Input type="number" value={modelForm.output_price} onChange={(e) => setModelForm({ ...modelForm, output_price: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>缓存价格（元/百万tokens）</Label>
                <Input type="number" value={modelForm.cached_price} onChange={(e) => setModelForm({ ...modelForm, cached_price: e.target.value })} placeholder="可选" />
              </div>
              <div className="space-y-2">
                <Label>上下文长度</Label>
                <Input type="number" value={modelForm.context_length} onChange={(e) => setModelForm({ ...modelForm, context_length: e.target.value })} placeholder="可选" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveModel} disabled={modelSaving}>{modelSaving ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Account Confirm */}
      <ConfirmDialog
        open={!!disableAccountTarget} onOpenChange={(v) => !v && setDisableAccountTarget(null)}
        title="禁用账号" description={`确定要禁用账号 "${disableAccountTarget?.name}" 吗？`}
        confirmLabel="禁用" variant="destructive" onConfirm={handleDisableAccount}
      />

      {/* Models List Dialog */}
      <Dialog open={modelsDialogOpen} onOpenChange={setModelsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>支持的模型</DialogTitle>
            <DialogDescription>{pool.name} · 共 {pool.models.length} 个模型</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pb-2">
            <Button variant="outline" size="sm" onClick={handleSyncModels} disabled={syncing}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "同步中..." : "同步模型"}
            </Button>
            <Button variant="outline" size="sm" onClick={openAddModel}>
              <Plus className="mr-1.5 h-4 w-4" /> 添加模型
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {pool.models.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">暂无模型，点击上方按钮同步或添加</div>
            ) : (
              <div className="space-y-2 pb-2">
                {pool.models.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 shrink-0 text-blue-500" />
                        <span className="truncate font-medium text-sm">{m.model_slug}</span>
                        {m.model_slug !== m.upstream_model_id && (
                          <span className="truncate text-xs text-muted-foreground">→ {m.upstream_model_id}</span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-6 text-xs text-muted-foreground">
                        <span>输入 {(m.input_price_per_million / 100).toFixed(2)} 元/M</span>
                        <span>输出 {(m.output_price_per_million / 100).toFixed(2)} 元/M</span>
                        {m.cached_input_price_per_million != null && <span>缓存 {(m.cached_input_price_per_million / 100).toFixed(2)} 元/M</span>}
                        {m.context_length != null && <span>上下文 {m.context_length.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1 ml-2">
                      <button type="button" onClick={() => openEditModel(m)} className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setRemoveModelTarget(m)} className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Model Confirm */}
      <ConfirmDialog
        open={!!removeModelTarget} onOpenChange={(v) => !v && setRemoveModelTarget(null)}
        title="移除模型" description={`确定要从号池中移除模型 "${removeModelTarget?.model_slug}" 吗？`}
        confirmLabel="移除" variant="destructive" onConfirm={handleRemoveModel}
      />
    </div>
  );
}
