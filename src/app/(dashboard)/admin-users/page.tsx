"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  KeyRound,
  Plus,
  ScrollText,
  Shield,
  UserCog,
  UserRoundCheck,
  UserRoundX,
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
import { toast } from "@/hooks/use-toast";
import { usePaginatedData } from "@/hooks/use-paginated-data";
import { adminUsersApi } from "@/lib/api/admin-users";
import { formatShanghaiDateTime } from "@/lib/time";
import { useAuthStore } from "@/stores/auth";
import { getErrorDetail } from "@/lib/errors";
import type { AdminListItem, AdminRole, CreateAdminRequest } from "@/types";

const ROLE_CONFIG = {
  super_admin: {
    label: "超级管理员",
    className: "border-gray-300 bg-gray-100 text-gray-700",
  },
  admin: {
    label: "管理员",
    className: "border-border bg-secondary text-secondary-foreground",
  },
} as const;

const ROOT_BADGE = {
  label: "根管理员",
  className: "border-amber-300 bg-amber-100 text-amber-700",
} as const;

const STATUS_CONFIG = {
  0: {
    label: "已禁用",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  1: {
    label: "正常",
    className: "border-green-200 bg-green-50 text-green-700",
  },
} as const;

const EMPTY_CREATE_FORM: CreateAdminRequest = {
  email: "",
  name: "",
  password: "",
  role: "admin",
};

export default function AdminUsersPage() {
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);
  const isSuperAdmin = user?.role === "super_admin";
  const isRoot = user?.is_root === true;

  const { items: admins, total, page, loading, setPage, refresh } = usePaginatedData<AdminListItem>(
    (params) => {
      if (!isSuperAdmin) return Promise.resolve({ items: [], total: 0 });
      return adminUsersApi.list(params);
    },
    {
      pageSize: 10,
      deps: [isSuperAdmin],
      onError: (error) => toast.error("加载管理员失败", getErrorDetail(error, "请稍后重试")),
    },
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminRequest>(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);

  const [statusTarget, setStatusTarget] = useState<{ admin: AdminListItem; nextStatus: 0 | 1 } | null>(null);

  const [resetTarget, setResetTarget] = useState<AdminListItem | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [roleTarget, setRoleTarget] = useState<{ admin: AdminListItem; nextRole: AdminRole } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateAdmin = async () => {
    if (!createForm.email.trim() || !createForm.name.trim() || !createForm.password.trim()) {
      toast.error("信息不完整", "请填写邮箱、姓名和密码");
      return;
    }

    setCreating(true);
    try {
      const created = await adminUsersApi.create({
        email: createForm.email.trim(),
        name: createForm.name.trim(),
        password: createForm.password,
        role: createForm.role,
      });
      toast.success("创建成功", `管理员 ${created.name} 已创建`);
      setCreateForm(EMPTY_CREATE_FORM);
      setCreateOpen(false);
      if (page !== 1) {
        setPage(1);
      } else {
        await refresh();
      }
    } catch (error) {
      toast.error("创建失败", getErrorDetail(error, "请检查输入后重试"));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusTarget) return;
    try {
      await adminUsersApi.updateStatus(statusTarget.admin.uid, { status: statusTarget.nextStatus });
      toast.success(
        statusTarget.nextStatus === 1 ? "已启用管理员" : "已禁用管理员",
        `${statusTarget.admin.name} 的状态已更新`,
      );
      setStatusTarget(null);
      await refresh();
    } catch (error) {
      toast.error("状态更新失败", getErrorDetail(error, "请稍后重试"));
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !newPassword.trim()) {
      toast.error("密码不能为空", "请输入新的管理员密码");
      return;
    }
    try {
      await adminUsersApi.resetPassword(resetTarget.uid, { new_password: newPassword });
      toast.success("密码已重置", `${resetTarget.name} 需要使用新密码登录`);
      setResetTarget(null);
      setNewPassword("");
      await refresh();
    } catch (error) {
      toast.error("重置失败", getErrorDetail(error, "请检查密码规则后重试"));
    }
  };

  const handleUpdateRole = async () => {
    if (!roleTarget) return;
    try {
      await adminUsersApi.updateRole(roleTarget.admin.uid, { role: roleTarget.nextRole });
      toast.success(
        "角色已更新",
        `${roleTarget.admin.name} 的角色已变更为${ROLE_CONFIG[roleTarget.nextRole].label}`,
      );
      setRoleTarget(null);
      await refresh();
    } catch (error) {
      toast.error("角色更新失败", getErrorDetail(error, "请稍后重试"));
    }
  };

  const columns = useMemo<Column<AdminListItem>[]>(() => [
    {
      key: "name",
      header: "管理员",
      headerClassName: "px-6 py-4 text-center text-sm font-semibold",
      className: "px-6 py-4 text-center",
      render: (admin) => (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{admin.name}</span>
            {admin.uid === user?.uid ? (
              <span className="inline-flex items-center whitespace-nowrap rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                当前登录
              </span>
            ) : null}
          </div>
          <span className="text-sm text-muted-foreground">{admin.email}</span>
        </div>
      ),
    },
    {
      key: "role",
      header: "角色",
      headerClassName: "px-6 py-4 text-center text-sm font-semibold",
      className: "px-6 py-4 text-center",
      render: (admin) => {
        const badge = admin.is_root ? ROOT_BADGE : ROLE_CONFIG[admin.role];
        return (
          <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "状态",
      headerClassName: "px-6 py-4 text-center text-sm font-semibold",
      className: "px-6 py-4 text-center",
      render: (admin) => {
        const status = STATUS_CONFIG[admin.status as 0 | 1];
        return (
          <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        );
      },
    },
    {
      key: "last_login",
      header: "最近登录",
      headerClassName: "px-6 py-4 text-center text-sm font-semibold",
      className: "px-6 py-4 text-center text-sm text-muted-foreground",
      render: (admin) =>
        admin.last_login_at ? formatShanghaiDateTime(admin.last_login_at) : "从未登录",
    },
    {
      key: "created_at",
      header: "创建时间",
      headerClassName: "px-6 py-4 text-center text-sm font-semibold",
      className: "px-6 py-4 text-center text-sm text-muted-foreground",
      render: (admin) => formatShanghaiDateTime(admin.created_at),
    },
    {
      key: "actions",
      header: "操作",
      headerClassName: "px-6 py-4 text-center text-sm font-semibold",
      className: "px-6 py-4 text-center",
      render: (admin) => {
        if (admin.is_root) {
          return <span className="text-sm text-muted-foreground">根管理员</span>;
        }
        return (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResetTarget(admin);
                setNewPassword("");
              }}
            >
              <KeyRound className="mr-1 h-3.5 w-3.5" />
              重置密码
            </Button>
            {isRoot && admin.uid !== user?.uid ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setRoleTarget({
                    admin,
                    nextRole: admin.role === "admin" ? "super_admin" : "admin",
                  })
                }
              >
                <Shield className="mr-1 h-3.5 w-3.5" />
                修改角色
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setStatusTarget({
                  admin,
                  nextStatus: admin.status === 1 ? 0 : 1,
                })
              }
              className={
                admin.status === 1
                  ? "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  : "border-green-200 text-green-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700"
              }
            >
              {admin.status === 1 ? (
                <>
                  <UserRoundX className="mr-1 h-3.5 w-3.5" />
                  禁用
                </>
              ) : (
                <>
                  <UserRoundCheck className="mr-1 h-3.5 w-3.5" />
                  启用
                </>
              )}
            </Button>
          </div>
        );
      },
    },
  ], [user?.uid, isRoot]);

  if (!mounted) {
    return (
      <Card>
        <CardContent className="p-8">
          <LoadingSpinner text="正在加载管理员治理界面..." />
        </CardContent>
      </Card>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="page-stack">
        <PageHeader
          icon={UserCog}
          title="管理员管理"
          subtitle="该区域仅供超级管理员使用，用于创建普通管理员、禁用账号和重置密码。"
        />
        <Card className="table-shell">
          <CardContent className="p-0">
            <EmptyState
              icon={Shield}
              title="当前账号没有访问权限"
              description="只有 super_admin 才能进入管理员治理页面。普通管理员请返回控制台继续处理业务内容。"
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
        icon={UserCog}
        title="管理员管理"
        subtitle={`仅超级管理员可访问。当前共 ${total} 个管理员账号。`}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            创建管理员
          </Button>
        }
      />

      <Card className="panel">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
          <div>
            <p className="text-sm font-medium text-foreground">治理范围</p>
            <p className="mt-1 text-sm text-muted-foreground">
              当前页面只管理普通管理员账号。超级管理员账号不会出现在可操作集合里。
            </p>
          </div>
          <Button asChild variant="outline" className="justify-center self-start lg:self-center">
            <Link href="/admin-audit-logs?category=governance">
              <ScrollText className="mr-2 h-4 w-4" />
              查看治理审计
            </Link>
          </Button>
          <div className="flex min-h-10 items-center rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700">
            当前登录：{user?.name} / 超级管理员
          </div>
        </CardContent>
      </Card>

      <Card className="table-shell">
        <div className="overflow-hidden">
          <DataTable
            columns={columns}
            data={admins}
            loading={loading}
            loadingText="正在加载管理员列表..."
            emptyIcon={UserCog}
            emptyTitle="还没有普通管理员"
            emptyDescription="你可以先创建一个普通管理员账号，再将日常业务操作分配出去。"
            rowKey={(admin) => admin.uid}
            page={page}
            pageSize={10}
            total={total}
            onPageChange={setPage}
            showPageInfo
          />
        </div>
      </Card>

      {/* Create admin dialog - keeps raw Dialog because of form inputs */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>创建管理员</DialogTitle>
            <DialogDescription>填写账号信息并选择角色，创建后可立即登录后台。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="admin-name">姓名</Label>
              <Input
                id="admin-name"
                value={createForm.name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="请输入管理员姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">邮箱</Label>
              <Input
                id="admin-email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">初始密码</Label>
              <Input
                id="admin-password"
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="请输入符合规则的密码"
              />
              <p className="text-xs text-muted-foreground">密码规则由后端统一校验，建议包含大小写字母、数字和特殊字符。</p>
            </div>
            {isRoot ? (
              <div className="space-y-2">
                <Label htmlFor="admin-role">角色</Label>
                <select
                  id="admin-role"
                  value={createForm.role ?? "admin"}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, role: event.target.value as AdminRole }))
                  }
                  className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-foreground outline-none ring-offset-background transition-all duration-200 focus-visible:ring-2 focus-visible:ring-gray-950/10"
                >
                  <option value="admin">管理员</option>
                  <option value="super_admin">超级管理员</option>
                </select>
                <p className="text-xs text-muted-foreground">超级管理员拥有全部页面访问权限。</p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setCreateForm(EMPTY_CREATE_FORM);
              }}
            >
              取消
            </Button>
            <Button onClick={handleCreateAdmin} disabled={creating}>
              {creating ? "创建中..." : "确认创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status toggle confirmation */}
      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.nextStatus === 1 ? "启用管理员" : "禁用管理员"}
        description="请确认本次管理员状态变更。"
        confirmLabel="确认"
        onConfirm={handleUpdateStatus}
      >
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
          <div>
            <p className="font-medium text-foreground">{statusTarget?.admin.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusTarget?.nextStatus === 1
                ? "启用后，该管理员可以重新登录并访问后台。"
                : "禁用后，该管理员将无法继续访问后台接口。"}
            </p>
          </div>
        </div>
      </ConfirmDialog>

      {/* Reset password confirmation */}
      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setNewPassword("");
          }
        }}
        title="重置管理员密码"
        description={`请输入 ${resetTarget?.name ?? "该管理员"} 的新密码。`}
        confirmLabel="确认重置"
        onConfirm={handleResetPassword}
      >
        <div className="space-y-2">
          <Label htmlFor="reset-password">新密码</Label>
          <Input
            id="reset-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="请输入新密码"
          />
          <p className="text-xs text-muted-foreground">该操作会触发后端审计，但不会展示或保存明文密码。</p>
        </div>
      </ConfirmDialog>

      {/* Role change confirmation */}
      <ConfirmDialog
        open={!!roleTarget}
        onOpenChange={(open) => !open && setRoleTarget(null)}
        title="修改管理员角色"
        description={`确认将 ${roleTarget?.admin.name ?? "该管理员"} 的角色变更为${roleTarget ? ROLE_CONFIG[roleTarget.nextRole].label : ""}？`}
        confirmLabel="确认变更"
        onConfirm={handleUpdateRole}
      >
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
          <div>
            <p className="font-medium text-foreground">{roleTarget?.admin.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              当前角色：{roleTarget ? ROLE_CONFIG[roleTarget.admin.role].label : ""}
              {" → "}
              变更为：{roleTarget ? ROLE_CONFIG[roleTarget.nextRole].label : ""}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {roleTarget?.nextRole === "super_admin"
                ? "提升为超级管理员后，该账号将拥有全部治理页面访问权限。"
                : "降级为普通管理员后，该账号将失去治理页面访问权限。"}
            </p>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
