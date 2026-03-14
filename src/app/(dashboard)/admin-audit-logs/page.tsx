"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  RefreshCw,
  ScrollText,
  Shield,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
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
import { adminAuditLogsApi } from "@/lib/api/admin-audit-logs";
import { useAuthStore } from "@/stores/auth";
import type { AdminAuditCategory, AdminAuditLogItem } from "@/types";

const ACTION_OPTIONS = [
  { value: "", label: "全部动作" },
  { value: "bootstrap_super_admin", label: "初始化超级管理员" },
  { value: "create_admin", label: "创建管理员" },
  { value: "enable_admin", label: "启用管理员" },
  { value: "disable_admin", label: "禁用管理员" },
  { value: "reset_admin_password", label: "重置密码" },
  { value: "admin_login_success", label: "管理员登录成功" },
  { value: "admin_login_failed", label: "管理员登录失败" },
  { value: "admin_login_locked", label: "管理员账号锁定" },
  { value: "admin_login_unlocked", label: "管理员账号解锁" },
];

const ACTION_LABELS: Record<string, string> = {
  bootstrap_super_admin: "初始化超级管理员",
  create_admin: "创建管理员",
  enable_admin: "启用管理员",
  disable_admin: "禁用管理员",
  reset_admin_password: "重置密码",
  admin_login_success: "管理员登录成功",
  admin_login_failed: "管理员登录失败",
  admin_login_locked: "管理员账号锁定",
  admin_login_unlocked: "管理员账号解锁",
};

function formatJsonBlock(data: Record<string, unknown> | null) {
  if (!data || Object.keys(data).length === 0) {
    return "无";
  }
  return JSON.stringify(data, null, 2);
}

function LegacyAdminAuditLogsPage() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === "super_admin";

  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  const [action, setAction] = useState("");
  const [actorUidInput, setActorUidInput] = useState("");
  const [targetUidInput, setTargetUidInput] = useState("");
  const [actorUid, setActorUid] = useState<string | undefined>(undefined);
  const [targetUid, setTargetUid] = useState<string | undefined>(undefined);

  const [detailLog, setDetailLog] = useState<AdminAuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await adminAuditLogsApi.list({
        page,
        page_size: pageSize,
        action: action || undefined,
        actor_uid: actorUid,
        target_uid: targetUid,
      });
      setLogs(data.items);
      setTotal(data.total);
    } catch (error) {
      setLogs([]);
      setTotal(0);
      console.error("获取管理员审计日志失败:", error);
    } finally {
      setLoading(false);
    }
  }, [action, actorUid, isSuperAdmin, page, pageSize, targetUid]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleApplyFilters = async () => {
    const nextActorUid = actorUidInput.trim() || undefined;
    const nextTargetUid = targetUidInput.trim() || undefined;

    setPage(1);
    setActorUid(nextActorUid);
    setTargetUid(nextTargetUid);
  };

  const handleResetFilters = () => {
    setAction("");
    setActorUidInput("");
    setTargetUidInput("");
    setActorUid(undefined);
    setTargetUid(undefined);
    setPage(1);
  };

  const activeFilterSummary = useMemo(() => {
    const filters: string[] = [];
    if (action) {
      filters.push(`动作：${ACTION_LABELS[action] ?? action}`);
    }
    if (actorUid !== undefined) {
      filters.push(`操作人 UID：${actorUid}`);
    }
    if (targetUid !== undefined) {
      filters.push(`目标 UID：${targetUid}`);
    }
    return filters.join(" · ");
  }, [action, actorUid, targetUid]);

  if (!isSuperAdmin) {
    return (
      <div className="page-stack">
        <PageHeader
          icon={ScrollText}
          title="管理员审计"
          subtitle="仅超级管理员可查看管理员治理动作的审计日志。"
        />

        <Card className="table-shell">
          <CardContent className="p-0">
            <EmptyState
              icon={Shield}
              title="当前账号没有访问权限"
              description="只有 super_admin 才能查看管理员审计记录。"
              action={
                <Button asChild>
                  <Link href="/">返回仪表盘</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        icon={ScrollText}
        title="管理员审计"
        subtitle={`查看超级管理员与普通管理员治理动作。当前共 ${total} 条记录。`}
        actions={
          <Button variant="outline" onClick={fetchLogs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        }
      />

      <Card className="panel">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_1fr_auto_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="audit-action">动作</Label>
            <select
              id="audit-action"
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="flex h-10 w-full rounded-xl border border-border/80 bg-white/80 px-3 text-sm text-foreground outline-none ring-offset-background transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="actor-uid">操作人 UID</Label>
            <Input
              id="actor-uid"
              value={actorUidInput}
              onChange={(event) => setActorUidInput(event.target.value)}
              placeholder="例如 1001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-uid">目标 UID</Label>
            <Input
              id="target-uid"
              value={targetUidInput}
              onChange={(event) => setTargetUidInput(event.target.value)}
              placeholder="例如 1002"
            />
          </div>

          <Button onClick={handleApplyFilters}>应用筛选</Button>
          <Button variant="outline" onClick={handleResetFilters}>
            重置
          </Button>
        </CardContent>
      </Card>

      {activeFilterSummary ? (
        <div className="rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-primary">
          当前筛选：{activeFilterSummary}
        </div>
      ) : null}

      <Card className="table-shell">
        <div className="overflow-hidden">
          {loading ? (
            <LoadingSpinner text="正在加载管理员审计日志..." />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="暂无审计记录"
              description="当前筛选条件下没有管理员治理动作。你可以放宽筛选条件后重新查看。"
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="table-head border-b border-border">
                  <th className="px-6 py-4 text-left text-sm font-semibold">动作</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">操作人</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">目标管理员</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">结果</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">时间</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">详情</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const success = log.status === "success";
                  return (
                    <tr key={log.id} className="table-row">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">{ACTION_LABELS[log.action] ?? log.action}</span>
                          <span className="text-sm text-muted-foreground">
                            {log.resource_type}
                            {log.resource_id ? ` / ${log.resource_id}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">{log.actor_admin.name}</span>
                          <span className="text-sm text-muted-foreground">
                            UID {log.actor_admin.uid} · {log.actor_admin.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {log.target_admin ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">{log.target_admin.name}</span>
                            <span>
                              UID {log.target_admin.uid} · {log.target_admin.email}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                            success
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {success ? "成功" : "失败"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("zh-CN")}
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="outline" size="sm" onClick={() => setDetailLog(log)}>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          查看
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!loading && logs.length > 0 ? (
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} showPageInfo />
          ) : null}
        </div>
      </Card>

      <Dialog open={!!detailLog} onOpenChange={(open) => !open && setDetailLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>审计详情</DialogTitle>
            <DialogDescription>查看该条管理员治理动作的上下文与变更快照。</DialogDescription>
          </DialogHeader>

          {detailLog ? (
            <div className="space-y-6 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-secondary/40 p-4">
                  <p className="text-sm font-medium text-foreground">动作摘要</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>动作：{ACTION_LABELS[detailLog.action] ?? detailLog.action}</p>
                    <p>结果：{detailLog.status}</p>
                    <p>资源：{detailLog.resource_type}{detailLog.resource_id ? ` / ${detailLog.resource_id}` : ""}</p>
                    <p>时间：{new Date(detailLog.created_at).toLocaleString("zh-CN")}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-secondary/40 p-4">
                  <p className="text-sm font-medium text-foreground">操作上下文</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>操作人：{detailLog.actor_admin.name} / UID {detailLog.actor_admin.uid}</p>
                    <p>目标管理员：{detailLog.target_admin ? `${detailLog.target_admin.name} / UID ${detailLog.target_admin.uid}` : "-"}</p>
                    <p>来源 IP：{detailLog.ip_address || "-"}</p>
                    <p>原因：{detailLog.reason || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-slate-950 p-4 text-xs text-slate-100">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                    <AlertTriangle className="h-4 w-4 text-orange-300" />
                    变更前
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap">{formatJsonBlock(detailLog.before_data)}</pre>
                </div>
                <div className="rounded-2xl border border-border/80 bg-slate-950 p-4 text-xs text-slate-100">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    变更后
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap">{formatJsonBlock(detailLog.after_data)}</pre>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailLog(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

void LegacyAdminAuditLogsPage;

const AUDIT_GOVERNANCE_ACTION_OPTIONS = [
  { value: "bootstrap_super_admin", label: "初始化超级管理员" },
  { value: "create_admin", label: "创建管理员" },
  { value: "enable_admin", label: "启用管理员" },
  { value: "disable_admin", label: "禁用管理员" },
  { value: "reset_admin_password", label: "重置密码" },
];

const AUDIT_AUTH_ACTION_OPTIONS = [
  { value: "admin_login_success", label: "管理员登录成功" },
  { value: "admin_login_failed", label: "管理员登录失败" },
  { value: "admin_login_locked", label: "管理员账号锁定" },
  { value: "admin_login_unlocked", label: "管理员账号解锁" },
];

const AUDIT_CATEGORY_OPTIONS: Array<{ value: AdminAuditCategory; label: string }> = [
  { value: "governance", label: "治理动作" },
  { value: "auth", label: "认证事件" },
  { value: "all", label: "全部事件" },
];

const AUDIT_ACTION_LABELS: Record<string, string> = {
  bootstrap_super_admin: "初始化超级管理员",
  create_admin: "创建管理员",
  enable_admin: "启用管理员",
  disable_admin: "禁用管理员",
  reset_admin_password: "重置密码",
  admin_login_success: "管理员登录成功",
  admin_login_failed: "管理员登录失败",
  admin_login_locked: "管理员账号锁定",
  admin_login_unlocked: "管理员账号解锁",
};

const AUDIT_CATEGORY_LABELS: Record<AdminAuditCategory, string> = {
  all: "全部事件",
  governance: "治理动作",
  auth: "认证事件",
};

const AUDIT_CATEGORY_HINTS: Record<AdminAuditCategory, string> = {
  all: "查看治理与认证相关的全部管理员审计事件。",
  governance: "默认聚焦创建、启用、禁用和重置密码等治理动作。",
  auth: "查看登录成功、失败、锁定和解锁等认证事件。",
};

const AUDIT_GOVERNANCE_ACTIONS = new Set(AUDIT_GOVERNANCE_ACTION_OPTIONS.map((option) => option.value));
const AUDIT_AUTH_ACTIONS = new Set(AUDIT_AUTH_ACTION_OPTIONS.map((option) => option.value));

function getAuditCategory(value: string | null): AdminAuditCategory {
  if (value === "all" || value === "auth" || value === "governance") {
    return value;
  }
  return "governance";
}

function getAuditActionOptions(category: AdminAuditCategory) {
  if (category === "governance") {
    return [{ value: "", label: "全部治理动作" }, ...AUDIT_GOVERNANCE_ACTION_OPTIONS];
  }
  if (category === "auth") {
    return [{ value: "", label: "全部认证事件" }, ...AUDIT_AUTH_ACTION_OPTIONS];
  }
  return [{ value: "", label: "全部动作" }, ...AUDIT_GOVERNANCE_ACTION_OPTIONS, ...AUDIT_AUTH_ACTION_OPTIONS];
}

function isAuditActionAllowed(category: AdminAuditCategory, action: string) {
  if (!action) {
    return true;
  }
  return getAuditActionOptions(category).some((option) => option.value === action);
}

function getAuditLogCategory(action: string): AdminAuditCategory {
  if (AUDIT_GOVERNANCE_ACTIONS.has(action)) {
    return "governance";
  }
  if (AUDIT_AUTH_ACTIONS.has(action)) {
    return "auth";
  }
  return "all";
}

function getAuditCategoryBadgeClass(category: AdminAuditCategory) {
  if (category === "governance") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (category === "auth") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-border bg-secondary text-secondary-foreground";
}

function getAuditEmptyDescription(category: AdminAuditCategory) {
  if (category === "governance") {
    return "当前筛选条件下没有治理动作。你可以创建管理员、禁用账号或放宽筛选后再查看。";
  }
  if (category === "auth") {
    return "当前筛选条件下没有认证事件。你可以放宽筛选后重新查看登录相关审计。";
  }
  return "当前筛选条件下没有管理员审计记录。你可以放宽筛选条件后重新查看。";
}

function formatAuditJsonBlock(data: Record<string, unknown> | null) {
  if (!data || Object.keys(data).length === 0) {
    return "无";
  }
  return JSON.stringify(data, null, 2);
}

export default function AdminAuditLogsPage() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === "super_admin";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<AdminAuditCategory>(() => getAuditCategory(searchParams.get("category")));
  const [action, setAction] = useState("");
  const [actorUidInput, setActorUidInput] = useState("");
  const [targetUidInput, setTargetUidInput] = useState("");
  const [actorUid, setActorUid] = useState<string | undefined>(undefined);
  const [targetUid, setTargetUid] = useState<string | undefined>(undefined);
  const [detailLog, setDetailLog] = useState<AdminAuditLogItem | null>(null);

  useEffect(() => {
    const nextCategory = getAuditCategory(searchParams.get("category"));
    setCategory((currentCategory) => (currentCategory === nextCategory ? currentCategory : nextCategory));
  }, [searchParams]);

  const replaceCategoryInUrl = useCallback(
    (nextCategory: AdminAuditCategory) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("category", nextCategory);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const fetchLogs = useCallback(async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await adminAuditLogsApi.list({
        page,
        page_size: pageSize,
        category,
        action: action || undefined,
        actor_uid: actorUid,
        target_uid: targetUid,
      });
      setLogs(data.items);
      setTotal(data.total);
    } catch (error) {
      setLogs([]);
      setTotal(0);
      console.error("获取管理员审计日志失败:", error);
    } finally {
      setLoading(false);
    }
  }, [action, actorUid, category, isSuperAdmin, page, pageSize, targetUid]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actionOptions = useMemo(() => getAuditActionOptions(category), [category]);

  const activeFilterSummary = useMemo(() => {
    const filters = [`分类：${AUDIT_CATEGORY_LABELS[category]}`];
    if (action) {
      filters.push(`动作：${AUDIT_ACTION_LABELS[action] ?? action}`);
    }
    if (actorUid !== undefined) {
      filters.push(`操作人 UID：${actorUid}`);
    }
    if (targetUid !== undefined) {
      filters.push(`目标 UID：${targetUid}`);
    }
    return filters.join(" · ");
  }, [action, actorUid, category, targetUid]);

  const handleCategoryChange = (nextCategory: AdminAuditCategory) => {
    const nextAction = isAuditActionAllowed(nextCategory, action) ? action : "";
    setCategory(nextCategory);
    setAction(nextAction);
    setPage(1);
    replaceCategoryInUrl(nextCategory);
  };

  const handleApplyFilters = () => {
    const nextActorUid = actorUidInput.trim() || undefined;
    const nextTargetUid = targetUidInput.trim() || undefined;

    setPage(1);
    setActorUid(nextActorUid);
    setTargetUid(nextTargetUid);
  };

  const handleResetFilters = () => {
    setAction("");
    setActorUidInput("");
    setTargetUidInput("");
    setActorUid(undefined);
    setTargetUid(undefined);
    setPage(1);
  };

  if (!isSuperAdmin) {
    return (
      <div className="page-stack">
        <PageHeader
          icon={ScrollText}
          title="管理员审计"
          subtitle="仅超级管理员可查看管理员治理动作与认证事件的审计日志。"
        />

        <Card className="table-shell">
          <CardContent className="p-0">
            <EmptyState
              icon={Shield}
              title="当前账号没有访问权限"
              description="只有 super_admin 才能查看管理员审计记录。"
              action={
                <Button asChild>
                  <Link href="/">返回仪表盘</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        icon={ScrollText}
        title="管理员审计"
        subtitle={`${AUDIT_CATEGORY_HINTS[category]} 当前共 ${total} 条记录。`}
        actions={
          <Button variant="outline" onClick={fetchLogs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        }
      />

      <Card className="panel">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">审计视图</p>
              <p className="mt-1 text-sm text-muted-foreground">默认聚焦治理动作，避免登录类高频事件淹没关键治理记录。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {AUDIT_CATEGORY_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={category === option.value ? "default" : "outline"}
                  onClick={() => handleCategoryChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="audit-action">动作</Label>
              <select
                id="audit-action"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full rounded-xl border border-border/80 bg-white/80 px-3 text-sm text-foreground outline-none ring-offset-background transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {actionOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actor-uid">操作人 UID</Label>
              <Input
                id="actor-uid"
                value={actorUidInput}
                onChange={(event) => setActorUidInput(event.target.value)}
                placeholder="例如 1001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-uid">目标 UID</Label>
              <Input
                id="target-uid"
                value={targetUidInput}
                onChange={(event) => setTargetUidInput(event.target.value)}
                placeholder="例如 1002"
              />
            </div>

            <Button onClick={handleApplyFilters}>应用筛选</Button>
            <Button variant="outline" onClick={handleResetFilters}>
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-primary">
        当前筛选：{activeFilterSummary}
      </div>

      <Card className="table-shell">
        <div className="overflow-hidden">
          {loading ? (
            <LoadingSpinner text="正在加载管理员审计日志..." />
          ) : logs.length === 0 ? (
            <EmptyState icon={ScrollText} title="暂无审计记录" description={getAuditEmptyDescription(category)} />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="table-head border-b border-border">
                  <th className="px-6 py-4 text-left text-sm font-semibold">动作</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">操作人</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">目标管理员</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">结果</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">时间</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">详情</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const success = log.status === "success";
                  const logCategory = getAuditLogCategory(log.action);

                  return (
                    <tr key={log.id} className="table-row">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{AUDIT_ACTION_LABELS[log.action] ?? log.action}</span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getAuditCategoryBadgeClass(
                                logCategory
                              )}`}
                            >
                              {AUDIT_CATEGORY_LABELS[logCategory]}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {log.resource_type}
                            {log.resource_id ? ` / ${log.resource_id}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">{log.actor_admin.name}</span>
                          <span className="text-sm text-muted-foreground">
                            UID {log.actor_admin.uid} · {log.actor_admin.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {log.target_admin ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">{log.target_admin.name}</span>
                            <span>
                              UID {log.target_admin.uid} · {log.target_admin.email}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                            success
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {success ? "成功" : "失败"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("zh-CN")}
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="outline" size="sm" onClick={() => setDetailLog(log)}>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          查看
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!loading && logs.length > 0 ? (
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} showPageInfo />
          ) : null}
        </div>
      </Card>

      <Dialog open={!!detailLog} onOpenChange={(open) => !open && setDetailLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>审计详情</DialogTitle>
            <DialogDescription>查看该条管理员事件的上下文与变更快照。</DialogDescription>
          </DialogHeader>

          {detailLog ? (
            <div className="space-y-6 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-secondary/40 p-4">
                  <p className="text-sm font-medium text-foreground">动作摘要</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>分类：{AUDIT_CATEGORY_LABELS[getAuditLogCategory(detailLog.action)]}</p>
                    <p>动作：{AUDIT_ACTION_LABELS[detailLog.action] ?? detailLog.action}</p>
                    <p>结果：{detailLog.status}</p>
                    <p>
                      资源：{detailLog.resource_type}
                      {detailLog.resource_id ? ` / ${detailLog.resource_id}` : ""}
                    </p>
                    <p>时间：{new Date(detailLog.created_at).toLocaleString("zh-CN")}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-secondary/40 p-4">
                  <p className="text-sm font-medium text-foreground">操作上下文</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>
                      操作人：{detailLog.actor_admin.name} / UID {detailLog.actor_admin.uid}
                    </p>
                    <p>
                      目标管理员：
                      {detailLog.target_admin ? `${detailLog.target_admin.name} / UID ${detailLog.target_admin.uid}` : "-"}
                    </p>
                    <p>来源 IP：{detailLog.ip_address || "-"}</p>
                    <p>原因：{detailLog.reason || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-slate-950 p-4 text-xs text-slate-100">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                    <AlertTriangle className="h-4 w-4 text-orange-300" />
                    变更前
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap">{formatAuditJsonBlock(detailLog.before_data)}</pre>
                </div>
                <div className="rounded-2xl border border-border/80 bg-slate-950 p-4 text-xs text-slate-100">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    变更后
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap">{formatAuditJsonBlock(detailLog.after_data)}</pre>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailLog(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
