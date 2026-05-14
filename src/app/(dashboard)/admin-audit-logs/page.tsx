"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Eye,
  List,
  Lock,
  RefreshCw,
  ScrollText,
  Settings,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
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
import { formatShanghaiDateTime } from "@/lib/time";
import { useAuthStore } from "@/stores/auth";
import type { AdminAuditCategory, AdminAuditLogItem, AdminAuditLogMetaData } from "@/types";

const AUDIT_CATEGORY_OPTIONS: Array<{ value: AdminAuditCategory; label: string; icon: typeof Shield; activeClass: string }> = [
  { value: "all", label: "全部事件", icon: List, activeClass: "bg-gray-900 text-white hover:bg-gray-800" },
  { value: "governance", label: "治理动作", icon: Shield, activeClass: "bg-blue-600 text-white hover:bg-blue-700" },
  { value: "auth", label: "认证事件", icon: Lock, activeClass: "bg-amber-600 text-white hover:bg-amber-700" },
  { value: "user_management", label: "用户管理", icon: Users, activeClass: "bg-purple-600 text-white hover:bg-purple-700" },
  { value: "model_catalog", label: "模型目录", icon: Database, activeClass: "bg-teal-600 text-white hover:bg-teal-700" },
  { value: "routing_config", label: "路由配置", icon: Settings, activeClass: "bg-cyan-600 text-white hover:bg-cyan-700" },
];

const AUDIT_CATEGORY_LABELS: Record<AdminAuditCategory, string> = {
  all: "全部事件",
  governance: "治理动作",
  auth: "认证事件",
  user_management: "用户管理",
  model_catalog: "模型目录",
  routing_config: "路由配置",
  voucher: "兑换码",
  pool: "资源池",
};

const AUDIT_CATEGORY_HINTS: Record<AdminAuditCategory, string> = {
  all: "查看全部管理员审计事件。",
  governance: "默认聚焦创建、启用、禁用和重置密码等治理动作。",
  auth: "查看登录成功、失败、锁定和解锁等认证事件。",
  user_management: "查看用户启用/禁用、密码重置、充值等管理操作。",
  model_catalog: "查看研发商、分类、模型的创建和更新操作。",
  routing_config: "查看凭证管理和路由配置版本的变更操作。",
  voucher: "查看兑换码生成和禁用等操作。",
  pool: "查看资源池创建、模型和账号管理等操作。",
};

function getAuditCategory(value: string | null): AdminAuditCategory {
  if (value === "all" || value === "auth" || value === "governance" || value === "user_management" || value === "model_catalog" || value === "routing_config" || value === "voucher" || value === "pool") {
    return value;
  }
  return "all";
}

function getAuditActionOptions(category: AdminAuditCategory, meta: AdminAuditLogMetaData | null) {
  if (!meta) return [{ value: "", label: "全部动作" }];
  const allLabel = category === "all" ? "全部动作" : `全部${AUDIT_CATEGORY_LABELS[category]}`;
  if (category === "all") {
    const allActions = Object.entries(meta.action_labels).map(([code, label]) => ({ value: code, label }));
    return [{ value: "", label: allLabel }, ...allActions];
  }
  const codes = meta.category_actions[category] ?? [];
  const options = codes.map((code) => ({ value: code, label: meta.action_labels[code] ?? code }));
  return [{ value: "", label: allLabel }, ...options];
}

function isAuditActionAllowed(category: AdminAuditCategory, action: string, meta: AdminAuditLogMetaData | null) {
  if (!action) return true;
  return getAuditActionOptions(category, meta).some((option) => option.value === action);
}

function getAuditLogCategory(action: string, meta: AdminAuditLogMetaData | null): AdminAuditCategory {
  if (!meta) return "all";
  for (const [cat, codes] of Object.entries(meta.category_actions)) {
    if (codes.includes(action)) return cat as AdminAuditCategory;
  }
  return "all";
}

function getAuditCategoryBadgeClass(category: AdminAuditCategory) {
  if (category === "governance") return "border-blue-200 bg-blue-50 text-blue-700";
  if (category === "auth") return "border-amber-200 bg-amber-50 text-amber-700";
  if (category === "user_management") return "border-purple-200 bg-purple-50 text-purple-700";
  if (category === "model_catalog") return "border-teal-200 bg-teal-50 text-teal-700";
  if (category === "routing_config") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (category === "voucher") return "border-orange-200 bg-orange-50 text-orange-700";
  if (category === "pool") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  return "border-border bg-secondary text-secondary-foreground";
}

function getAuditEmptyDescription(category: AdminAuditCategory) {
  if (category === "governance") return "当前筛选条件下没有治理动作。";
  if (category === "auth") return "当前筛选条件下没有认证事件。";
  if (category === "user_management") return "当前筛选条件下没有用户管理操作。";
  if (category === "model_catalog") return "当前筛选条件下没有模型目录操作。";
  if (category === "routing_config") return "当前筛选条件下没有路由配置操作。";
  if (category === "voucher") return "当前筛选条件下没有兑换码操作。";
  if (category === "pool") return "当前筛选条件下没有资源池操作。";
  return "当前筛选条件下没有管理员审计记录。";
}

function formatJsonBlock(data: Record<string, unknown> | null) {
  if (!data || Object.keys(data).length === 0) {
    return "无";
  }
  return JSON.stringify(data, null, 2);
}

function formatRelativeTime(dateStr: string): string {
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    if (diff < 60_000) return "刚刚";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} 天前`;
    return formatShanghaiDateTime(dateStr);
  } catch {
    return dateStr;
  }
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
  const [meta, setMeta] = useState<AdminAuditLogMetaData | null>(null);

  const [category, setCategory] = useState<AdminAuditCategory>(() => getAuditCategory(searchParams.get("category")));
  const [action, setAction] = useState("");
  const [actorUidInput, setActorUidInput] = useState("");
  const [targetUidInput, setTargetUidInput] = useState("");
  const [actorUid, setActorUid] = useState<string | undefined>(undefined);
  const [targetUid, setTargetUid] = useState<string | undefined>(undefined);
  const [detailLog, setDetailLog] = useState<AdminAuditLogItem | null>(null);

  const auditColumns: Column<AdminAuditLogItem>[] = useMemo(() => [
    {
      key: "action",
      header: "动作",
      render: (log) => {
        const logCategory = getAuditLogCategory(log.action, meta);
        const success = log.status === "success";
        return (
          <div className="flex items-center gap-2">
            <div className={`h-full w-0.5 self-stretch rounded-full ${success ? "bg-emerald-400" : "bg-red-400"}`} />
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{log.action_label}</span>
                <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getAuditCategoryBadgeClass(logCategory)}`}>
                  {AUDIT_CATEGORY_LABELS[logCategory]}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "actor",
      header: "操作人",
      render: (log) => (
        <span className="font-medium text-foreground">{log.actor_admin.name}</span>
      ),
    },
    {
      key: "status",
      header: "结果",
      render: (log) => {
        const success = log.status === "success";
        return (
          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${success ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {success ? "成功" : "失败"}
          </span>
        );
      },
    },
    {
      key: "time",
      header: "时间",
      render: (log) => (
        <span className="text-sm text-muted-foreground" title={formatShanghaiDateTime(log.created_at)}>
          {formatRelativeTime(log.created_at)}
        </span>
      ),
    },
    {
      key: "detail",
      header: "详情",
      render: (log) => (
        <Button variant="outline" size="sm" onClick={() => setDetailLog(log)}>
          <Eye className="mr-1 h-3.5 w-3.5" />
          查看
        </Button>
      ),
    },
  ], [meta]);

  useEffect(() => {
    const nextCategory = getAuditCategory(searchParams.get("category"));
    setCategory((currentCategory) => (currentCategory === nextCategory ? currentCategory : nextCategory));
  }, [searchParams]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    adminAuditLogsApi.meta().then(setMeta).catch(console.error);
  }, [isSuperAdmin]);

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

  const actionOptions = useMemo(() => getAuditActionOptions(category, meta), [category, meta]);

  const handleCategoryChange = (nextCategory: AdminAuditCategory) => {
    const nextAction = isAuditActionAllowed(nextCategory, action, meta) ? action : "";
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
          <div className="flex flex-wrap gap-2">
            {AUDIT_CATEGORY_OPTIONS.map((option) => {
              const CatIcon = option.icon;
              const isActive = category === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleCategoryChange(option.value)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? option.activeClass
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                  }`}
                >
                  <CatIcon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              );
            })}
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
                className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-foreground outline-none ring-offset-background transition-all duration-200 focus-visible:ring-2 focus-visible:ring-gray-950/10"
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

            <div className="flex gap-2">
              <Button onClick={handleApplyFilters}>应用筛选</Button>
              <Button variant="outline" onClick={handleResetFilters}>
                重置
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="table-shell">
        <div className="overflow-hidden">
          <DataTable
            columns={auditColumns}
            data={logs}
            loading={loading}
            loadingText="正在加载管理员审计日志..."
            emptyIcon={ScrollText}
            emptyTitle="暂无审计记录"
            emptyDescription={getAuditEmptyDescription(category)}
            rowKey={(log) => log.id}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            showPageInfo
          />
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
                    <p>分类：{AUDIT_CATEGORY_LABELS[getAuditLogCategory(detailLog.action, meta)]}</p>
                    <p>动作：{detailLog.action_label}</p>
                    <p>结果：{detailLog.status}</p>
                    <p>
                      资源：{detailLog.resource_type}
                      {detailLog.resource_id ? ` / ${detailLog.resource_id}` : ""}
                    </p>
                    <p>时间：{formatShanghaiDateTime(detailLog.created_at)}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-secondary/40 p-4">
                  <p className="text-sm font-medium text-foreground">操作上下文</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>
                      操作人：{detailLog.actor_admin.name} / UID {detailLog.actor_admin.uid}
                    </p>
                    <p>操作人邮箱：{detailLog.actor_admin.email}</p>
                    <p>操作人角色：{detailLog.actor_admin.role === "super_admin" ? "超级管理员" : "管理员"}</p>
                    <p>
                      目标管理员：
                      {detailLog.target_admin ? `${detailLog.target_admin.name} / UID ${detailLog.target_admin.uid}` : "-"}
                    </p>
                    {detailLog.target_admin ? (
                      <>
                        <p>目标邮箱：{detailLog.target_admin.email}</p>
                        <p>目标角色：{detailLog.target_admin.role === "super_admin" ? "超级管理员" : "管理员"}</p>
                      </>
                    ) : null}
                    <p>来源 IP：{detailLog.ip_address || "-"}</p>
                    <p>原因：{detailLog.reason || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-slate-950 p-4 text-xs text-slate-100">
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-sm font-medium text-red-300">
                    <AlertTriangle className="h-4 w-4" />
                    变更前 (Before)
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap">{formatJsonBlock(detailLog.before_data)}</pre>
                </div>
                <div className="rounded-2xl border border-border/80 bg-slate-950 p-4 text-xs text-slate-100">
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-sm font-medium text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    变更后 (After)
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
