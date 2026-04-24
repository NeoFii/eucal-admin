"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Pencil,
  Plus,
  Route,
  Shield,
  Trash2,
  Upload,
  RotateCcw,
} from "lucide-react";
import type { Column } from "@/components/data-table";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { usePaginatedData } from "@/hooks/use-paginated-data";
import { routingConfigApi } from "@/lib/api/routing-config";
import { useAuthStore } from "@/stores/auth";
import { getErrorDetail } from "@/lib/errors";
import { formatShanghaiDateTime } from "@/lib/time";
import type {
  CredentialItem,
  CredentialCreate,
  CredentialUpdate,
  RoutingConfigBrief,
  RoutingConfigItem,
} from "@/types";

// ── Tab: 凭证管理 ──────────────────────────────────────────

const EMPTY_CRED_FORM: CredentialCreate = {
  slug: "",
  provider_slug: "",
  api_key: "",
  remark: "",
};

function CredentialsTab() {
  const {
    items: credentials,
    total,
    page,
    loading,
    setPage,
    refresh,
  } = usePaginatedData<CredentialItem>(
    (params) => routingConfigApi.getCredentials(params),
    { pageSize: 10, onError: (e) => toast.error("加载凭证失败", getErrorDetail(e, "请稍后重试")) },
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CredentialCreate>({ ...EMPTY_CRED_FORM });
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<CredentialItem | null>(null);
  const [editForm, setEditForm] = useState<CredentialUpdate>({});
  const [editing, setEditing] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CredentialItem | null>(null);

  const handleCreate = async () => {
    if (!createForm.slug.trim() || !createForm.provider_slug.trim() || !createForm.api_key.trim()) {
      toast.error("信息不完整", "请填写 slug、供应商和 API Key");
      return;
    }
    setCreating(true);
    try {
      await routingConfigApi.createCredential(createForm);
      toast.success("创建成功", `凭证 ${createForm.slug} 已创建`);
      setCreateForm({ ...EMPTY_CRED_FORM });
      setCreateOpen(false);
      page !== 1 ? setPage(1) : await refresh();
    } catch (e) {
      toast.error("创建失败", getErrorDetail(e, "请检查输入后重试"));
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditing(true);
    try {
      await routingConfigApi.updateCredential(editTarget.slug, editForm);
      toast.success("更新成功", `凭证 ${editTarget.slug} 已更新`);
      setEditTarget(null);
      await refresh();
    } catch (e) {
      toast.error("更新失败", getErrorDetail(e, "请检查输入后重试"));
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await routingConfigApi.deleteCredential(deleteTarget.slug);
      toast.success("删除成功", `凭证 ${deleteTarget.slug} 已删除`);
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      toast.error("删除失败", getErrorDetail(e, "请稍后重试"));
    }
  };

  const openEdit = (cred: CredentialItem) => {
    setEditTarget(cred);
    setEditForm({ provider_slug: cred.provider_slug, remark: cred.remark ?? "", is_active: cred.is_active });
  };

  const columns = useMemo<Column<CredentialItem>[]>(() => [
    { key: "slug", header: "Slug", headerClassName: "px-6 py-4 text-sm font-semibold", className: "px-6 py-4 font-medium text-foreground", render: (c) => c.slug },
    { key: "provider", header: "供应商", headerClassName: "px-6 py-4 text-sm font-semibold", className: "px-6 py-4 text-sm", render: (c) => c.provider_slug },
    { key: "mask", header: "API Key", headerClassName: "px-6 py-4 text-sm font-semibold", className: "px-6 py-4 text-sm text-muted-foreground font-mono", render: (c) => c.mask },
    {
      key: "status", header: "状态", headerClassName: "px-6 py-4 text-center text-sm font-semibold", className: "px-6 py-4 text-center",
      render: (c) => (
        <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${c.is_active ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {c.is_active ? "启用" : "禁用"}
        </span>
      ),
    },
    { key: "remark", header: "备注", headerClassName: "px-6 py-4 text-sm font-semibold", className: "px-6 py-4 text-sm text-muted-foreground", render: (c) => c.remark || "-" },
    {
      key: "actions", header: "操作", headerClassName: "px-6 py-4 text-center text-sm font-semibold", className: "px-6 py-4 text-center",
      render: (c) => (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(c)}><Pencil className="mr-1 h-3.5 w-3.5" />编辑</Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteTarget(c)} className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"><Trash2 className="mr-1 h-3.5 w-3.5" />删除</Button>
        </div>
      ),
    },
  ], []);

  return (
    <>
      <Card className="table-shell">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">共 {total} 个凭证</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" />新建凭证</Button>
        </div>
        <div className="overflow-hidden">
          <DataTable columns={columns} data={credentials} loading={loading} loadingText="正在加载凭证..." emptyIcon={Route} emptyTitle="暂无凭证" emptyDescription="点击上方按钮创建第一个凭证。" rowKey={(c) => c.id} page={page} pageSize={10} total={total} onPageChange={setPage} showPageInfo />
        </div>
      </Card>

      {/* Create credential dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建凭证</DialogTitle>
            <DialogDescription>添加一个新的供应商 API 凭证。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cred-slug">Slug</Label>
              <Input id="cred-slug" value={createForm.slug} onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))} placeholder="如 openai-main" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-provider">供应商 Slug</Label>
              <Input id="cred-provider" value={createForm.provider_slug} onChange={(e) => setCreateForm((p) => ({ ...p, provider_slug: e.target.value }))} placeholder="如 openai" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-key">API Key</Label>
              <Input id="cred-key" type="password" value={createForm.api_key} onChange={(e) => setCreateForm((p) => ({ ...p, api_key: e.target.value }))} placeholder="sk-..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-remark">备注</Label>
              <Input id="cred-remark" value={createForm.remark ?? ""} onChange={(e) => setCreateForm((p) => ({ ...p, remark: e.target.value }))} placeholder="可选" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateForm({ ...EMPTY_CRED_FORM }); }}>取消</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? "创建中..." : "确认创建"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit credential dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑凭证 - {editTarget?.slug}</DialogTitle>
            <DialogDescription>修改凭证信息。API Key 留空则不更新。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-provider">供应商 Slug</Label>
              <Input id="edit-provider" value={editForm.provider_slug ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, provider_slug: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-key">API Key</Label>
              <Input id="edit-key" type="password" value={editForm.api_key ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, api_key: e.target.value }))} placeholder="留空则不更新（已配置）" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-remark">备注</Label>
              <Input id="edit-remark" value={editForm.remark ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, remark: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="edit-active">启用状态</Label>
              <button
                id="edit-active"
                type="button"
                role="switch"
                aria-checked={editForm.is_active ?? false}
                onClick={() => setEditForm((p) => ({ ...p, is_active: !p.is_active }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${editForm.is_active ? "bg-primary" : "bg-gray-200"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${editForm.is_active ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-sm text-muted-foreground">{editForm.is_active ? "启用" : "禁用"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>取消</Button>
            <Button onClick={handleEdit} disabled={editing}>{editing ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete credential confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="删除凭证"
        description={`确定要删除凭证「${deleteTarget?.slug}」吗？此操作不可撤销。`}
        confirmLabel="确认删除"
        variant="destructive"
        onConfirm={handleDelete}
      >
        <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
          <p className="text-sm text-muted-foreground">删除后，使用该凭证的路由配置可能会受到影响。</p>
        </div>
      </ConfirmDialog>
    </>
  );
}

// ── Tab: 配置版本 ──────────────────────────────────────────

function VersionsTab() {
  const {
    items: versions,
    total,
    page,
    loading,
    setPage,
    refresh,
  } = usePaginatedData<RoutingConfigBrief>(
    (params) => routingConfigApi.getVersions(params),
    { pageSize: 10, onError: (e) => toast.error("加载版本失败", getErrorDetail(e, "请稍后重试")) },
  );

  const [activeVersion, setActiveVersion] = useState<RoutingConfigItem | null>(null);
  const [activeLoading, setActiveLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDesc, setCreateDesc] = useState("");
  const [createJson, setCreateJson] = useState("");
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<RoutingConfigItem | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editJson, setEditJson] = useState("");
  const [editing, setEditing] = useState(false);

  const [viewJson, setViewJson] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<RoutingConfigBrief | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<RoutingConfigBrief | null>(null);

  const loadActive = async () => {
    setActiveLoading(true);
    try {
      const v = await routingConfigApi.getActiveVersion();
      setActiveVersion(v);
    } catch {
      setActiveVersion(null);
    } finally {
      setActiveLoading(false);
    }
  };

  useEffect(() => { void loadActive(); }, []);

  const handleCreate = async () => {
    if (!createJson.trim()) { toast.error("配置不能为空", "请输入 config_data JSON"); return; }
    let configData;
    try { configData = JSON.parse(createJson); } catch { toast.error("JSON 格式错误", "请检查 config_data 格式"); return; }
    setCreating(true);
    try {
      await routingConfigApi.createVersion({ description: createDesc || undefined, config_data: configData });
      toast.success("创建成功", "新草稿版本已创建");
      setCreateOpen(false); setCreateDesc(""); setCreateJson("");
      page !== 1 ? setPage(1) : await refresh();
    } catch (e) {
      toast.error("创建失败", getErrorDetail(e, "请检查输入后重试"));
    } finally { setCreating(false); }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    let configData;
    if (editJson.trim()) {
      try { configData = JSON.parse(editJson); } catch { toast.error("JSON 格式错误", "请检查 config_data 格式"); return; }
    }
    setEditing(true);
    try {
      await routingConfigApi.updateVersion(editTarget.version, { description: editDesc || undefined, config_data: configData });
      toast.success("更新成功", `版本 v${editTarget.version} 已更新`);
      setEditTarget(null); await refresh();
    } catch (e) {
      toast.error("更新失败", getErrorDetail(e, "请检查输入后重试"));
    } finally { setEditing(false); }
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    try {
      await routingConfigApi.publishVersion(publishTarget.version);
      toast.success("发布成功", `版本 v${publishTarget.version} 已发布`);
      setPublishTarget(null); await refresh(); await loadActive();
    } catch (e) { toast.error("发布失败", getErrorDetail(e, "请稍后重试")); }
  };

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    try {
      await routingConfigApi.rollbackVersion(rollbackTarget.version);
      toast.success("回滚成功", `已回滚到版本 v${rollbackTarget.version}`);
      setRollbackTarget(null); await refresh(); await loadActive();
    } catch (e) { toast.error("回滚失败", getErrorDetail(e, "请稍后重试")); }
  };

  const handleView = async (v: RoutingConfigBrief) => {
    try {
      const detail = await routingConfigApi.getVersion(v.version);
      setViewJson(JSON.stringify(detail.config_data, null, 2));
    } catch (e) { toast.error("加载失败", getErrorDetail(e, "请稍后重试")); }
  };

  const openEditDraft = async (v: RoutingConfigBrief) => {
    try {
      const detail = await routingConfigApi.getVersion(v.version);
      setEditTarget(detail);
      setEditDesc(detail.description ?? "");
      setEditJson(JSON.stringify(detail.config_data, null, 2));
    } catch (e) { toast.error("加载失败", getErrorDetail(e, "请稍后重试")); }
  };

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    draft: { label: "草稿", cls: "border-yellow-200 bg-yellow-50 text-yellow-700" },
    published: { label: "已发布", cls: "border-green-200 bg-green-50 text-green-700" },
    archived: { label: "已归档", cls: "border-gray-200 bg-gray-50 text-gray-600" },
  };

  const columns = useMemo<Column<RoutingConfigBrief>[]>(() => [
    { key: "version", header: "版本", headerClassName: "px-6 py-4 text-sm font-semibold", className: "px-6 py-4 font-medium text-foreground", render: (v) => `v${v.version}` },
    {
      key: "status", header: "状态", headerClassName: "px-6 py-4 text-center text-sm font-semibold", className: "px-6 py-4 text-center",
      render: (v) => {
        const s = STATUS_MAP[v.status] ?? { label: v.status, cls: "border-gray-200 bg-gray-50 text-gray-600" };
        return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
      },
    },
    { key: "desc", header: "描述", headerClassName: "px-6 py-4 text-sm font-semibold", className: "px-6 py-4 text-sm text-muted-foreground", render: (v) => v.description || "-" },
    { key: "published_at", header: "发布时间", headerClassName: "px-6 py-4 text-sm font-semibold", className: "px-6 py-4 text-sm text-muted-foreground", render: (v) => v.published_at ? formatShanghaiDateTime(v.published_at) : "-" },
    { key: "created_at", header: "创建时间", headerClassName: "px-6 py-4 text-sm font-semibold", className: "px-6 py-4 text-sm text-muted-foreground", render: (v) => formatShanghaiDateTime(v.created_at) },
    {
      key: "actions", header: "操作", headerClassName: "px-6 py-4 text-center text-sm font-semibold", className: "px-6 py-4 text-center",
      render: (v) => (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleView(v)}><Eye className="mr-1 h-3.5 w-3.5" />查看</Button>
          {v.status === "draft" && (
            <>
              <Button variant="outline" size="sm" onClick={() => void openEditDraft(v)}><Pencil className="mr-1 h-3.5 w-3.5" />编辑</Button>
              <Button variant="outline" size="sm" onClick={() => setPublishTarget(v)} className="border-green-200 text-green-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700"><Upload className="mr-1 h-3.5 w-3.5" />发布</Button>
            </>
          )}
          {v.status === "published" && (
            <Button variant="outline" size="sm" onClick={() => setRollbackTarget(v)} className="border-amber-200 text-amber-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"><RotateCcw className="mr-1 h-3.5 w-3.5" />回滚</Button>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <>
      {/* Active version card */}
      <Card className="panel mb-4">
        <CardContent className="p-5">
          {activeLoading ? (
            <p className="text-sm text-muted-foreground">加载当前活跃版本...</p>
          ) : activeVersion ? (
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">当前活跃版本</p>
                <p className="text-lg font-semibold text-foreground">v{activeVersion.version}</p>
              </div>
              <span className="inline-flex items-center whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">已发布</span>
              {activeVersion.published_at && (
                <p className="text-sm text-muted-foreground">发布于 {formatShanghaiDateTime(activeVersion.published_at)}</p>
              )}
              {activeVersion.description && (
                <p className="text-sm text-muted-foreground">— {activeVersion.description}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无活跃版本</p>
          )}
        </CardContent>
      </Card>

      <Card className="table-shell">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">共 {total} 个版本</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" />新建草稿</Button>
        </div>
        <div className="overflow-hidden">
          <DataTable columns={columns} data={versions} loading={loading} loadingText="正在加载版本..." emptyIcon={Route} emptyTitle="暂无版本" emptyDescription="点击上方按钮创建第一个配置版本。" rowKey={(v) => v.id} page={page} pageSize={10} total={total} onPageChange={setPage} showPageInfo />
        </div>
      </Card>

      {/* Create version dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建草稿版本</DialogTitle>
            <DialogDescription>创建一个新的路由配置草稿。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ver-desc">描述</Label>
              <Input id="ver-desc" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="可选，版本描述" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ver-json">config_data (JSON)</Label>
              <Textarea id="ver-json" value={createJson} onChange={(e) => setCreateJson(e.target.value)} placeholder='粘贴 JSON，包含 router_alias, weights, score_bands, tier_model_map, model_provider_bindings' className="min-h-[200px] font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateDesc(""); setCreateJson(""); }}>取消</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? "创建中..." : "确认创建"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit version dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑草稿 - v{editTarget?.version}</DialogTitle>
            <DialogDescription>修改草稿版本的描述和配置数据。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-ver-desc">描述</Label>
              <Input id="edit-ver-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ver-json">config_data (JSON)</Label>
              <Textarea id="edit-ver-json" value={editJson} onChange={(e) => setEditJson(e.target.value)} className="min-h-[200px] font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>取消</Button>
            <Button onClick={handleEdit} disabled={editing}>{editing ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View config JSON dialog */}
      <Dialog open={viewJson !== null} onOpenChange={(open) => !open && setViewJson(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>配置详情</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[400px] overflow-auto rounded-xl border bg-gray-50 p-4 text-xs font-mono">{viewJson}</pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewJson(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish confirm */}
      <ConfirmDialog open={!!publishTarget} onOpenChange={(open) => !open && setPublishTarget(null)} title="发布版本" description={`确定要发布版本 v${publishTarget?.version} 吗？发布后将替换当前活跃版本。`} confirmLabel="确认发布" onConfirm={handlePublish}>
        <div className="flex items-start gap-3 rounded-xl bg-green-50 p-4">
          <Upload className="mt-0.5 h-5 w-5 text-green-600" />
          <p className="text-sm text-muted-foreground">发布后该版本将立即生效，当前活跃版本将被归档。</p>
        </div>
      </ConfirmDialog>

      {/* Rollback confirm */}
      <ConfirmDialog open={!!rollbackTarget} onOpenChange={(open) => !open && setRollbackTarget(null)} title="回滚版本" description={`确定要回滚到版本 v${rollbackTarget?.version} 吗？`} confirmLabel="确认回滚" onConfirm={handleRollback}>
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
          <p className="text-sm text-muted-foreground">回滚将把该版本重新设为活跃版本。</p>
        </div>
      </ConfirmDialog>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────

type TabKey = "credentials" | "versions";

export default function RoutingConfigPage() {
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabKey>("credentials");
  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <Card>
        <CardContent className="p-8">
          <LoadingSpinner text="正在加载路由配置..." />
        </CardContent>
      </Card>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="page-stack">
        <PageHeader icon={Route} title="路由配置" subtitle="管理路由凭证和配置版本。" />
        <Card className="table-shell">
          <CardContent className="p-0">
            <EmptyState
              icon={Shield}
              title="当前账号没有访问权限"
              description="只有 super_admin 才能管理路由配置。"
              action={<Button asChild><Link href="/">返回仪表盘</Link></Button>}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader icon={Route} title="路由配置" subtitle="管理供应商凭证和路由配置版本。" />

      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button
          variant={tab === "credentials" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("credentials")}
        >
          凭证管理
        </Button>
        <Button
          variant={tab === "versions" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("versions")}
        >
          配置版本
        </Button>
      </div>

      {tab === "credentials" ? <CredentialsTab /> : <VersionsTab />}
    </div>
  );
}
