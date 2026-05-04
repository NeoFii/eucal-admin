"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Gauge,
  Shield,
  Search,
  Save,
  AlertTriangle,
  CheckCircle2,
  ArrowLeftRight,
  Layers,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";
import { DataTable, type Column } from "@/components/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { usePaginatedData } from "@/hooks/use-paginated-data";
import { useAuthStore } from "@/stores/auth";
import { routingSettingsApi } from "@/lib/api/routing-settings";
import { userManagementApi } from "@/lib/api/user-management";
import { getErrorDetail } from "@/lib/errors";
import type { RoutingSettingItem, UserListItem } from "@/types";
import { formatShanghaiDateTime } from "@/lib/time";

// ── Helpers ─────────────────────────────────────────────────────

/** Pull the row matching a key from the rate_limits group, tolerant to either
 *  Record<group, items[]> or a flat list shape since the underlying API
 *  returns the grouped shape. */
function findRow(
  groups: Record<string, RoutingSettingItem[]>,
  key: string,
): RoutingSettingItem | undefined {
  for (const items of Object.values(groups)) {
    for (const item of items) {
      if (item.key === key) return item;
    }
  }
  return undefined;
}

function parsePositiveInt(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

// ── Page ────────────────────────────────────────────────────────

export default function RateLimitsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Global rate-limit settings ──
  const [defaultUserRpm, setDefaultUserRpm] = useState("");
  const [systemRpmCap, setSystemRpmCap] = useState("");
  const [defaultUserRpmRow, setDefaultUserRpmRow] = useState<RoutingSettingItem | null>(null);
  const [systemRpmCapRow, setSystemRpmCapRow] = useState<RoutingSettingItem | null>(null);
  const [loadingGlobals, setLoadingGlobals] = useState(true);
  const [savingGlobals, setSavingGlobals] = useState(false);

  const loadGlobals = useCallback(async () => {
    setLoadingGlobals(true);
    try {
      const groups = await routingSettingsApi.getAll();
      const def = findRow(groups, "default_user_rpm");
      const cap = findRow(groups, "system_rpm_cap");
      setDefaultUserRpmRow(def ?? null);
      setSystemRpmCapRow(cap ?? null);
      setDefaultUserRpm(def?.value ?? "");
      setSystemRpmCap(cap?.value ?? "");
    } catch (error) {
      toast.error("加载失败", getErrorDetail(error, "无法读取速率限制设置"));
    } finally {
      setLoadingGlobals(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      void loadGlobals();
    }
  }, [isSuperAdmin, loadGlobals]);

  const handleSaveGlobals = async () => {
    const def = parsePositiveInt(defaultUserRpm);
    const cap = parsePositiveInt(systemRpmCap);
    if (def == null) {
      toast.error("用户默认 RPM 无效", "请输入 ≥1 的正整数");
      return;
    }
    if (cap == null) {
      toast.error("系统硬上限无效", "请输入 ≥1 的正整数");
      return;
    }
    if (def > cap) {
      toast.error(
        "数值不一致",
        `用户默认 RPM(${def}) 不应大于系统硬上限(${cap})。`,
      );
      return;
    }
    const items: { key: string; value: string }[] = [];
    if (defaultUserRpmRow && String(def) !== defaultUserRpmRow.value) {
      items.push({ key: "default_user_rpm", value: String(def) });
    }
    if (systemRpmCapRow && String(cap) !== systemRpmCapRow.value) {
      items.push({ key: "system_rpm_cap", value: String(cap) });
    }
    if (items.length === 0) {
      toast.success("无需保存", "数值未变更");
      return;
    }
    setSavingGlobals(true);
    try {
      await routingSettingsApi.batchUpdate(items);
      toast.success("已保存", "速率限制设置约 60 秒内全节点生效");
      await loadGlobals();
    } catch (error) {
      toast.error("保存失败", getErrorDetail(error, "请稍后重试"));
    } finally {
      setSavingGlobals(false);
    }
  };

  // ── User list (per-user RPM editing) ──
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchUsers = useCallback(
    (params: { page: number; page_size: number }) =>
      userManagementApi.getList({
        ...params,
        search: search || undefined,
      }),
    [search],
  );

  const {
    items: users,
    total,
    page,
    pageSize,
    loading: loadingUsers,
    setPage,
    refresh: refreshUsers,
  } = usePaginatedData<UserListItem>(fetchUsers, { pageSize: 20, deps: [search] });

  // ── Per-user RPM dialog ──
  const [editTarget, setEditTarget] = useState<UserListItem | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [saving, setSaving] = useState(false);

  const openEdit = (u: UserListItem) => {
    setEditTarget(u);
    setEditValue(u.rpm_limit != null ? String(u.rpm_limit) : "");
    setEditRemark("");
  };
  const closeEdit = () => {
    setEditTarget(null);
    setEditValue("");
    setEditRemark("");
  };

  const handleSaveUserRpm = async () => {
    if (!editTarget) return;
    let rpmLimit: number | null = null;
    const trimmed = editValue.trim();
    if (trimmed !== "") {
      const parsed = parsePositiveInt(trimmed);
      if (parsed == null) {
        toast.error("RPM 无效", "请输入 ≥1 的正整数,或留空清除");
        return;
      }
      const cap = parsePositiveInt(systemRpmCap);
      if (cap != null && parsed > cap) {
        toast.error(
          "超过系统硬上限",
          `当前系统硬上限为 ${cap}，用户 RPM 不能高于此值。`,
        );
        return;
      }
      rpmLimit = parsed;
    }
    setSaving(true);
    try {
      await userManagementApi.updateRpm(editTarget.uid, {
        rpm_limit: rpmLimit,
        remark: editRemark || undefined,
      });
      toast.success(
        "RPM 已更新",
        rpmLimit == null
          ? `${editTarget.email}: 已清除单独设置`
          : `${editTarget.email}: ${rpmLimit} 次/分钟`,
      );
      closeEdit();
      await refreshUsers();
    } catch (error) {
      toast.error("保存失败", getErrorDetail(error, "请稍后重试"));
    } finally {
      setSaving(false);
    }
  };

  // ── Columns ──
  const userColumns = useMemo<Column<UserListItem>[]>(
    () => [
      {
        key: "email",
        header: "用户",
        render: (u) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{u.email}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{u.uid}</p>
          </div>
        ),
      },
      {
        key: "rpm_limit",
        header: "用户 RPM",
        render: (u) => {
          if (u.rpm_limit == null) {
            return <span className="text-sm text-muted-foreground/70">未设置</span>;
          }
          const cap = parsePositiveInt(systemRpmCap);
          const clamped = cap != null && u.rpm_limit > cap;
          return (
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-medium tabular-nums ${
                clamped ? "text-amber-600" : "text-foreground"
              }`}
            >
              {u.rpm_limit}
              {clamped && (
                <span title={`受系统硬上限 ${cap} 钳制`}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
              )}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "状态",
        render: (u) => (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              u.status === 1
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                u.status === 1 ? "bg-emerald-500" : "bg-gray-400"
              }`}
            />
            {u.status === 1 ? "正常" : "已禁用"}
          </span>
        ),
      },
      {
        key: "last_login_at",
        header: "最近登录",
        render: (u) =>
          u.last_login_at ? (
            <span className="text-sm text-muted-foreground">
              {formatShanghaiDateTime(u.last_login_at)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/60">从未登录</span>
          ),
      },
      {
        key: "actions",
        header: "",
        headerClassName: "w-32 text-right",
        className: "text-right",
        render: (u) => (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => openEdit(u)}
          >
            <Gauge className="mr-1 h-3 w-3" />
            调整 RPM
          </Button>
        ),
      },
    ],
    [systemRpmCap],
  );

  if (!mounted) return null;
  if (!isSuperAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="无权访问"
        description="此页面仅限超级管理员访问"
      />
    );
  }

  const def = parsePositiveInt(defaultUserRpm);
  const cap = parsePositiveInt(systemRpmCap);
  const inconsistent = def != null && cap != null && def > cap;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Gauge}
        title="速率限制"
        subtitle="管理全局 RPM 默认值、系统硬上限以及单个用户的 RPM 配额"
      />

      {/* ── 概念说明 ── */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm text-blue-900">
        <p className="font-medium">三级 RPM 体系</p>
        <ul className="mt-2 space-y-1 text-blue-800/90">
          <li>
            <span className="font-medium">系统硬上限</span> — 任何用户 RPM 不会超过此值。
          </li>
          <li>
            <span className="font-medium">用户默认 RPM</span> — 新注册用户的初始 RPM 快照。修改后仅影响后续注册的用户。
          </li>
          <li>
            <span className="font-medium">用户 RPM</span> — 每个用户的实际值，可在下方表格单独调整。
          </li>
          <li>
            <span className="font-medium">号池账号 RPM</span> — 上游账号的 RPM，前往{" "}
            <Link
              href="/pools"
              className="inline-flex items-center gap-0.5 font-medium underline hover:text-blue-700"
            >
              号池管理
              <Layers className="h-3.5 w-3.5" />
            </Link>{" "}
            管理。
          </li>
        </ul>
      </div>

      {/* ── 全局设置卡片 ── */}
      {loadingGlobals ? (
        <Card>
          <CardContent className="p-10">
            <LoadingSpinner text="正在加载速率限制设置..." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Gauge className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-sm font-medium text-foreground">用户默认 RPM</p>
                  <p className="text-xs text-muted-foreground">
                    {defaultUserRpmRow?.description ??
                      "新注册用户的初始 RPM。修改不影响已注册用户。"}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="default-user-rpm" className="text-xs">
                  RPM 值（次/分钟）
                </Label>
                <Input
                  id="default-user-rpm"
                  type="number"
                  min={1}
                  step={1}
                  value={defaultUserRpm}
                  onChange={(e) => setDefaultUserRpm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-sm font-medium text-foreground">系统 RPM 硬上限</p>
                  <p className="text-xs text-muted-foreground">
                    {systemRpmCapRow?.description ??
                      "任何用户的实际 RPM 不会超过此值。"}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="system-rpm-cap" className="text-xs">
                  RPM 值（次/分钟）
                </Label>
                <Input
                  id="system-rpm-cap"
                  type="number"
                  min={1}
                  step={1}
                  value={systemRpmCap}
                  onChange={(e) => setSystemRpmCap(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 一致性提示 */}
      {inconsistent && !loadingGlobals && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            用户默认 RPM ({def}) 大于系统硬上限 ({cap})。新用户实际 RPM 会被钳制到{" "}
            {cap}。建议保持默认 ≤ 硬上限。
          </span>
        </div>
      )}

      {/* 保存按钮 */}
      {!loadingGlobals && (
        <div className="flex justify-end">
          <Button onClick={() => void handleSaveGlobals()} disabled={savingGlobals}>
            <Save className="mr-1.5 h-4 w-4" />
            {savingGlobals ? "保存中..." : "保存全局设置"}
          </Button>
        </div>
      )}

      {/* ── 用户列表 ── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">用户 RPM 调整</p>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                共 {total} 人
              </span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
                setPage(1);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="按邮箱 / UID 搜索"
                  className="h-8 w-64 pl-7 text-sm"
                />
              </div>
              <Button type="submit" variant="outline" size="sm" className="h-8 text-xs">
                搜索
              </Button>
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => {
                    setSearch("");
                    setSearchInput("");
                    setPage(1);
                  }}
                >
                  清除
                </Button>
              )}
            </form>
          </div>
          <DataTable
            columns={userColumns}
            data={users}
            loading={loadingUsers}
            rowKey={(u) => u.uid}
            emptyIcon={Gauge}
            emptyTitle="暂无用户"
            emptyDescription={search ? "调整搜索条件后再试" : "系统中尚无用户"}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {/* ── 单用户 RPM 调整对话框 ── */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && closeEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>调整用户 RPM</DialogTitle>
            <DialogDescription>
              {editTarget && (
                <>
                  为 <span className="font-medium">{editTarget.email}</span> 设置每分钟请求上限。
                  留空清除单独设置。
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="user-rpm-value">RPM 上限（次/分钟）</Label>
              <Input
                id="user-rpm-value"
                type="number"
                min={1}
                step={1}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="留空清除单独设置"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  当前生效值：
                  {editTarget?.rpm_limit != null
                    ? `${editTarget.rpm_limit} 次/分钟`
                    : "未设置"}
                  {systemRpmCap && (
                    <>，系统硬上限 <span className="font-medium">{systemRpmCap}</span></>
                  )}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-rpm-remark">备注（可选，写入审计日志）</Label>
              <Input
                id="user-rpm-remark"
                value={editRemark}
                onChange={(e) => setEditRemark(e.target.value)}
                placeholder="例如：VIP 用户临时提升上限"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              取消
            </Button>
            <Button onClick={() => void handleSaveUserRpm()} disabled={saving}>
              {saving ? "保存中..." : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
