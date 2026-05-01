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
import type { AdminAuditCategory, AdminAuditLogItem } from "@/types";

const AUDIT_GOVERNANCE_ACTION_OPTIONS = [
  { value: "bootstrap_super_admin", label: "初始化超级管理员" },
  { value: "create_admin", label: "创建管理员" },
  { value: "enable_admin", label: "启用管理员" },
  { value: "disable_admin", label: "禁用管理员" },
  { value: "reset_admin_password", label: "重置密码" },
  { value: "update_admin_role", label: "修改管理员角色" },
];

const AUDIT_AUTH_ACTION_OPTIONS = [
  { value: "admin_login_success", label: "管理员登录成功" },
  { value: "admin_login_failed", label: "管理员登录失败" },
  { value: "admin_login_locked", label: "管理员账号锁定" },
  { value: "admin_login_unlocked", label: "管理员账号解锁" },
];

const AUDIT_USER_MANAGEMENT_ACTION_OPTIONS = [
  { value: "enable_user", label: "启用用户" },
  { value: "disable_user", label: "禁用用户" },
  { value: "reset_user_password", label: "重置用户密码" },
  { value: "topup_user", label: "用户充值" },
  { value: "adjust_user_balance", label: "调整用户余额" },
  { value: "disable_user_api_key", label: "禁用用户 API Key" },
];

const AUDIT_MODEL_CATALOG_ACTION_OPTIONS = [
  { value: "create_vendor", label: "创建研发商" },
  { value: "update_vendor", label: "更新研发商" },
  { value: "create_category", label: "创建分类" },
  { value: "update_category", label: "更新分类" },
  { value: "create_model", label: "创建模型" },
  { value: "update_model", label: "更新模型" },
  { value: "delete_model", label: "删除模型" },
];

const AUDIT_ROUTING_CONFIG_ACTION_OPTIONS = [
  { value: "create_credential", label: "创建凭证" },
  { value: "update_credential", label: "更新凭证" },
  { value: "delete_credential", label: "删除凭证" },
  { value: "create_routing_version", label: "创建路由版本" },
  { value: "update_routing_version", label: "更新路由版本" },
  { value: "publish_routing_version", label: "发布路由版本" },
  { value: "rollback_routing_version", label: "回滚路由版本" },
];

const AUDIT_CATEGORY_OPTIONS: Array<{ value: AdminAuditCategory; label: string }> = [
  { value: "governance", label: "治理动作" },
  { value: "auth", label: "认证事件" },
  { value: "user_management", label: "用户管理" },
  { value: "model_catalog", label: "模型目录" },
  { value: "routing_config", label: "路由配置" },
  { value: "all", label: "全部事件" },
];

const AUDIT_ACTION_LABELS: Record<string, string> = {
  bootstrap_super_admin: "初始化超级管理员",
  create_admin: "创建管理员",
  enable_admin: "启用管理员",
  disable_admin: "禁用管理员",
  reset_admin_password: "重置密码",
  update_admin_role: "修改管理员角色",
  admin_login_success: "管理员登录成功",
  admin_login_failed: "管理员登录失败",
  admin_login_locked: "管理员账号锁定",
  admin_login_unlocked: "管理员账号解锁",
  enable_user: "启用用户",
  disable_user: "禁用用户",
  reset_user_password: "重置用户密码",
  topup_user: "用户充值",
  adjust_user_balance: "调整用户余额",
  disable_user_api_key: "禁用用户 API Key",
  create_vendor: "创建研发商",
  update_vendor: "更新研发商",
  create_category: "创建分类",
  update_category: "更新分类",
  create_model: "创建模型",
  update_model: "更新模型",
  delete_model: "删除模型",
  create_credential: "创建凭证",
  update_credential: "更新凭证",
  delete_credential: "删除凭证",
  create_routing_version: "创建路由版本",
  update_routing_version: "更新路由版本",
  publish_routing_version: "发布路由版本",
  rollback_routing_version: "回滚路由版本",
};

const AUDIT_CATEGORY_LABELS: Record<AdminAuditCategory, string> = {
  all: "全部事件",
  governance: "治理动作",
  auth: "认证事件",
  user_management: "用户管理",
  model_catalog: "模型目录",
  routing_config: "路由配置",
};

const AUDIT_CATEGORY_HINTS: Record<AdminAuditCategory, string> = {
  all: "查看全部管理员审计事件。",
  governance: "默认聚焦创建、启用、禁用和重置密码等治理动作。",
  auth: "查看登录成功、失败、锁定和解锁等认证事件。",
  user_management: "查看用户启用/禁用、密码重置、充值等管理操作。",
  model_catalog: "查看研发商、分类、模型的创建和更新操作。",
  routing_config: "查看凭证管理和路由配置版本的变更操作。",
};

const AUDIT_GOVERNANCE_ACTIONS = new Set(AUDIT_GOVERNANCE_ACTION_OPTIONS.map((option) => option.value));
const AUDIT_AUTH_ACTIONS = new Set(AUDIT_AUTH_ACTION_OPTIONS.map((option) => option.value));
const AUDIT_USER_MANAGEMENT_ACTIONS = new Set(AUDIT_USER_MANAGEMENT_ACTION_OPTIONS.map((option) => option.value));
const AUDIT_MODEL_CATALOG_ACTIONS = new Set(AUDIT_MODEL_CATALOG_ACTION_OPTIONS.map((option) => option.value));
const AUDIT_ROUTING_CONFIG_ACTIONS = new Set(AUDIT_ROUTING_CONFIG_ACTION_OPTIONS.map((option) => option.value));

function getAuditCategory(value: string | null): AdminAuditCategory {
  if (value === "all" || value === "auth" || value === "governance" || value === "user_management" || value === "model_catalog" || value === "routing_config") {
    return value;
  }
  return "governance";
}

function getAuditActionOptions(category: AdminAuditCategory) {
  if (category === "governance") return [{ value: "", label: "全部治理动作" }, ...AUDIT_GOVERNANCE_ACTION_OPTIONS];
  if (category === "auth") return [{ value: "", label: "全部认证事件" }, ...AUDIT_AUTH_ACTION_OPTIONS];
  if (category === "user_management") return [{ value: "", label: "全部用户管理" }, ...AUDIT_USER_MANAGEMENT_ACTION_OPTIONS];
  if (category === "model_catalog") return [{ value: "", label: "全部模型目录" }, ...AUDIT_MODEL_CATALOG_ACTION_OPTIONS];
  if (category === "routing_config") return [{ value: "", label: "全部路由配置" }, ...AUDIT_ROUTING_CONFIG_ACTION_OPTIONS];
  return [{ value: "", label: "全部动作" }, ...AUDIT_GOVERNANCE_ACTION_OPTIONS, ...AUDIT_AUTH_ACTION_OPTIONS, ...AUDIT_USER_MANAGEMENT_ACTION_OPTIONS, ...AUDIT_MODEL_CATALOG_ACTION_OPTIONS, ...AUDIT_ROUTING_CONFIG_ACTION_OPTIONS];
}

function isAuditActionAllowed(category: AdminAuditCategory, action: string) {
  if (!action) {
    return true;
  }
  return getAuditActionOptions(category).some((option) => option.value === action);
}

function getAuditLogCategory(action: string): AdminAuditCategory {
  if (AUDIT_GOVERNANCE_ACTIONS.has(action)) return "governance";
  if (AUDIT_AUTH_ACTIONS.has(action)) return "auth";
  if (AUDIT_USER_MANAGEMENT_ACTIONS.has(action)) return "user_management";
  if (AUDIT_MODEL_CATALOG_ACTIONS.has(action)) return "model_catalog";
  if (AUDIT_ROUTING_CONFIG_ACTIONS.has(action)) return "routing_config";
  return "all";
}

function getAuditCategoryBadgeClass(category: AdminAuditCategory) {
  if (category === "governance") return "border-blue-200 bg-blue-50 text-blue-700";
  if (category === "auth") return "border-amber-200 bg-amber-50 text-amber-700";
  if (category === "user_management") return "border-purple-200 bg-purple-50 text-purple-700";
  if (category === "model_catalog") return "border-teal-200 bg-teal-50 text-teal-700";
  if (category === "routing_config") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  return "border-border bg-secondary text-secondary-foreground";
}

function getAuditEmptyDescription(category: AdminAuditCategory) {
  if (category === "governance") return "当前筛选条件下没有治理动作。";
  if (category === "auth") return "当前筛选条件下没有认证事件。";
  if (category === "user_management") return "当前筛选条件下没有用户管理操作。";
  if (category === "model_catalog") return "当前筛选条件下没有模型目录操作。";
  if (category === "routing_config") return "当前筛选条件下没有路由配置操作。";
  return "当前筛选条件下没有管理员审计记录。";
}

function formatJsonBlock(data: Record<string, unknown> | null) {
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

  const auditColumns: Column<AdminAuditLogItem>[] = useMemo(() => [
    {
      key: "action",
      header: "动作",
      render: (log) => {
        const logCategory = getAuditLogCategory(log.action);
        return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{AUDIT_ACTION_LABELS[log.action] ?? log.action}</span>
              <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${getAuditCategoryBadgeClass(logCategory)}`}>
                {AUDIT_CATEGORY_LABELS[logCategory]}
              </span>
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
        <span className="text-sm text-muted-foreground">{formatShanghaiDateTime(log.created_at)}</span>
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
  ], []);

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
                    <p>分类：{AUDIT_CATEGORY_LABELS[getAuditLogCategory(detailLog.action)]}</p>
                    <p>动作：{AUDIT_ACTION_LABELS[detailLog.action] ?? detailLog.action}</p>
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
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                    <AlertTriangle className="h-4 w-4 text-amber-300" />
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
