"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Key,
  KeyRound,
  Mail,
  Minus,
  Plus,
  Clock,
  Globe,
  CalendarDays,
  Gauge,
  FileSearch,
} from "lucide-react";
import type { Column } from "@/components/data-table";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { userManagementApi } from "@/lib/api/user-management";
import { getErrorDetail } from "@/lib/errors";
import { formatShanghaiDateTime, formatShanghaiDateTimeLocalInput } from "@/lib/time";
import { formatYuan, formatYuanDetail, yuanToMicroYuan } from "@/lib/pricing";
import { UserBalanceCards } from "@/components/user-detail/user-balance-cards";
import { UserTokenTrendChart } from "@/components/user-detail/user-token-trend-chart";
import { UserSpendingChart } from "@/components/user-detail/user-spending-chart";
import type {
  UserDetailData,
  UserApiKeyItem,
  UserUsageLogItem,
} from "@/types";

const STATUS_CONFIG: Record<number, { label: string; dot: string; bg: string; text: string }> = {
  0: { label: "已禁用", dot: "bg-red-500", bg: "bg-red-50 ring-red-200/60", text: "text-red-700" },
  1: { label: "正常", dot: "bg-emerald-500", bg: "bg-emerald-50 ring-emerald-200/60", text: "text-emerald-700" },
};

type TabKey = "apikeys" | "usage-logs";

const MODEL_PILL_COLORS = [
  "bg-blue-50 text-blue-700",
  "bg-orange-50 text-orange-700",
  "bg-emerald-50 text-emerald-700",
  "bg-violet-50 text-violet-700",
  "bg-red-50 text-red-700",
  "bg-cyan-50 text-cyan-700",
  "bg-yellow-50 text-yellow-700",
  "bg-pink-50 text-pink-700",
];

function getModelPillColor(model: string): string {
  let hash = 0;
  for (let i = 0; i < model.length; i++) {
    hash = ((hash << 5) - hash + model.charCodeAt(i)) | 0;
  }
  return MODEL_PILL_COLORS[Math.abs(hash) % MODEL_PILL_COLORS.length];
}

const USAGE_STATUS_LABELS: Record<number, { label: string; cls: string }> = {
  0: { label: "待处理", cls: "border-gray-200 bg-gray-50 text-gray-700" },
  1: { label: "成功", cls: "border-green-200 bg-green-50 text-green-700" },
  2: { label: "错误", cls: "border-red-200 bg-red-50 text-red-700" },
  3: { label: "已退款", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  4: { label: "中止", cls: "border-gray-200 bg-gray-50 text-gray-600" },
};

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const uidParam = params.uid;
  const uid = Array.isArray(uidParam) ? uidParam[0] : (uidParam ?? "");
  const isValidUid = uid.trim().length > 0;

  const [detail, setDetail] = useState<UserDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [tab, setTab] = useState<TabKey>("usage-logs");

  const [apiKeys, setApiKeys] = useState<UserApiKeyItem[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);

  const [usageLogs, setUsageLogs] = useState<UserUsageLogItem[]>([]);
  const [usageTotal, setUsageTotal] = useState(0);
  const [usagePage, setUsagePage] = useState(1);
  const [usageLoading, setUsageLoading] = useState(false);

  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupRemark, setTopupRemark] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustRemark, setAdjustRemark] = useState("");
  const [rpmOpen, setRpmOpen] = useState(false);
  const [rpmValue, setRpmValue] = useState("");
  const [rpmRemark, setRpmRemark] = useState("");

  const [chartStart, setChartStart] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return formatShanghaiDateTimeLocalInput(d);
  });
  const [chartEnd, setChartEnd] = useState(() => formatShanghaiDateTimeLocalInput());
  const [chartKeyId, setChartKeyId] = useState<number | undefined>(undefined);

  const loadDetail = useCallback(async () => {
    if (!isValidUid) { setDetail(null); setLoadingDetail(false); return; }
    setLoadingDetail(true);
    try { setDetail(await userManagementApi.getDetail(uid)); }
    catch (error) { setDetail(null); toast.error("加载用户详情失败", getErrorDetail(error, "请稍后重试")); }
    finally { setLoadingDetail(false); }
  }, [isValidUid, uid]);

  const loadApiKeys = useCallback(async () => {
    if (!isValidUid) { setApiKeys([]); setKeysLoading(false); return; }
    setKeysLoading(true);
    try { setApiKeys(await userManagementApi.getApiKeys(uid)); }
    catch (error) { toast.error("加载API密钥失败", getErrorDetail(error, "请稍后重试")); }
    finally { setKeysLoading(false); }
  }, [isValidUid, uid]);

  const loadUsageLogs = useCallback(async () => {
    if (!isValidUid) { setUsageLogs([]); setUsageTotal(0); setUsageLoading(false); return; }
    setUsageLoading(true);
    try {
      const d = await userManagementApi.getUsageLogs({ user_uid: uid, page: usagePage, page_size: 10 });
      setUsageLogs(d.items); setUsageTotal(d.total);
    } catch (error) { toast.error("加载调用日志失败", getErrorDetail(error, "请稍后重试")); }
    finally { setUsageLoading(false); }
  }, [isValidUid, uid, usagePage]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);
  useEffect(() => { if (isValidUid) void loadApiKeys(); }, [isValidUid, loadApiKeys]);
  useEffect(() => { if (isValidUid && tab === "usage-logs") void loadUsageLogs(); }, [isValidUid, tab, loadUsageLogs]);

  /* ── action handlers (unchanged logic) ── */
  const handleToggleStatus = async () => {
    if (!detail) return;
    const nextStatus = detail.status === 1 ? 0 : 1;
    try { await userManagementApi.updateStatus(uid, { status: nextStatus as 0 | 1 }); toast.success(nextStatus === 1 ? "已启用用户" : "已禁用用户", `${detail.email} 状态已更新`); setStatusConfirmOpen(false); await loadDetail(); }
    catch (error) { toast.error("状态更新失败", getErrorDetail(error, "请稍后重试")); }
  };
  const handleResetPassword = async () => {
    if (!newPassword.trim()) { toast.error("密码不能为空", "请输入新密码"); return; }
    try { await userManagementApi.resetPassword(uid, { new_password: newPassword }); toast.success("密码已重置", "用户需要使用新密码登录"); setResetOpen(false); setNewPassword(""); }
    catch (error) { toast.error("重置失败", getErrorDetail(error, "请检查密码规则后重试")); }
  };
  const handleTopup = async () => {
    const microYuan = yuanToMicroYuan(topupAmount);
    if (!microYuan || microYuan <= 0) { toast.error("金额无效", "请输入正数金额（单位：元）"); return; }
    try { await userManagementApi.topup(uid, { amount: microYuan, remark: topupRemark || undefined }); toast.success("充值成功", `已充值 ${formatYuan(microYuan)}`); setTopupOpen(false); setTopupAmount(""); setTopupRemark(""); await loadDetail(); }
    catch (error) { toast.error("充值失败", getErrorDetail(error, "请稍后重试")); }
  };
  const handleAdjust = async () => {
    const microYuan = yuanToMicroYuan(adjustAmount);
    if (!microYuan) { toast.error("金额无效", "请输入调账金额（单位：元，可为负数）"); return; }
    if (!adjustRemark.trim()) { toast.error("备注必填", "调账操作必须填写备注"); return; }
    try { await userManagementApi.adjustBalance(uid, { amount: microYuan, remark: adjustRemark }); toast.success("调账成功", `已调整 ${formatYuan(microYuan)}`); setAdjustOpen(false); setAdjustAmount(""); setAdjustRemark(""); await loadDetail(); }
    catch (error) { toast.error("调账失败", getErrorDetail(error, "请稍后重试")); }
  };
  const handleUpdateRpm = async () => {
    // 留空 = 清除覆盖、走全局默认；填写需为正整数
    let rpmLimit: number | null = null;
    const trimmed = rpmValue.trim();
    if (trimmed !== "") {
      const parsed = Number(trimmed);
      if (!Number.isInteger(parsed) || parsed < 1) {
        toast.error("RPM 无效", "请输入 ≥1 的正整数，或留空恢复默认");
        return;
      }
      rpmLimit = parsed;
    }
    try {
      await userManagementApi.updateRpm(uid, { rpm_limit: rpmLimit, remark: rpmRemark || undefined });
      toast.success("RPM 已更新", rpmLimit == null ? "已恢复使用全局默认值" : `已设置为 ${rpmLimit} 次/分钟`);
      setRpmOpen(false);
      setRpmValue("");
      setRpmRemark("");
      await loadDetail();
    } catch (error) {
      toast.error("更新失败", getErrorDetail(error, "请稍后重试"));
    }
  };
  const handleDisableKey = async (keyId: number) => {
    try { await userManagementApi.disableApiKey(uid, keyId); toast.success("已禁用密钥", "该API密钥已被禁用"); await loadApiKeys(); }
    catch (error) { toast.error("禁用失败", getErrorDetail(error, "请稍后重试")); }
  };
  const handleEnableKey = async (keyId: number) => {
    try { await userManagementApi.enableApiKey(uid, keyId); toast.success("已启用密钥", "该API密钥已重新启用"); await loadApiKeys(); }
    catch (error) { toast.error("启用失败", getErrorDetail(error, "请稍后重试")); }
  };

  /* ── PLACEHOLDER_COLUMNS ── */

  const keyColumns = useMemo<Column<UserApiKeyItem>[]>(() => [
    { key: "name", header: "名称", headerClassName: "px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70", className: "px-5 py-3.5 text-sm font-medium text-foreground", render: (k) => k.name },
    { key: "key_prefix", header: "密钥前缀", headerClassName: "px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70", className: "px-5 py-3.5 text-sm font-mono text-muted-foreground", render: (k) => `${k.key_prefix}...` },
    { key: "status", header: "状态", headerClassName: "px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70", className: "px-5 py-3.5", render: (k) => { const c = STATUS_CONFIG[k.status] ?? STATUS_CONFIG[0]; return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${c.bg} ${c.text}`}><span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{c.label}</span>; } },
    { key: "quota", header: "配额", headerClassName: "px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70", className: "px-5 py-3.5 text-sm text-muted-foreground", render: (k) => k.quota_mode === 0 ? "无限制" : `${k.quota_used}/${k.quota_limit}` },
    { key: "last_used_at", header: "最近使用", headerClassName: "px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70", className: "px-5 py-3.5 text-sm text-muted-foreground", render: (k) => k.last_used_at ? formatShanghaiDateTime(k.last_used_at) : "从未使用" },
    { key: "actions", header: "", headerClassName: "px-5 py-3.5 w-24", className: "px-5 py-3.5 text-right", render: (k) => k.status === 1 ? <Button variant="outline" size="sm" className="h-7 border-red-200 text-xs text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700" onClick={() => handleDisableKey(k.id)}><Ban className="mr-1 h-3 w-3" />禁用</Button> : <Button variant="outline" size="sm" className="h-7 border-emerald-200 text-xs text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => handleEnableKey(k.id)}><CheckCircle className="mr-1 h-3 w-3" />启用</Button> },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const usageColumns = useMemo<Column<UserUsageLogItem>[]>(() => [
    { key: "time", header: "时间", className: "px-4 py-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap", render: (r) => formatShanghaiDateTime(r.created_at) },
    { key: "status", header: "类型", className: "px-4 py-3", render: (r) => { const cfg = USAGE_STATUS_LABELS[r.status] ?? USAGE_STATUS_LABELS[0]; return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>; } },
    { key: "model", header: "模型", className: "px-4 py-3", render: (r) => { const m = r.selected_model || r.model_name; return <span className={`inline-block max-w-[120px] truncate rounded-full px-2.5 py-0.5 text-xs font-medium ${getModelPillColor(m)}`}>{m}</span>; } },
    { key: "key", header: "Key", className: "px-4 py-3", render: (r) => <span className="inline-block max-w-[120px] truncate rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">{r.api_key_name || "—"}</span> },
    { key: "input", header: "输入", className: "px-4 py-3", render: (r) => <div><div className="font-mono text-xs">{formatCompactNumber(r.prompt_tokens)}</div>{r.cached_tokens > 0 && <div className="text-[10px] text-muted-foreground">缓存读 {formatCompactNumber(r.cached_tokens)} tokens</div>}</div> },
    { key: "output", header: "输出", className: "px-4 py-3 font-mono text-xs", render: (r) => formatCompactNumber(r.completion_tokens) },
    { key: "cost", header: "花费", className: "px-4 py-3 font-mono text-xs", render: (r) => formatYuanDetail(r.cost) },
  ], []);

  /* ── PLACEHOLDER_RENDER ── */

  if (loadingDetail) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner text="正在加载用户详情..." />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">用户不存在或加载失败</p>
        <Button variant="outline" onClick={() => router.push("/users")}>返回列表</Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[detail.status] ?? STATUS_CONFIG[0];
  const emailInitial = detail.email.charAt(0).toUpperCase();

  return (
    <div className="page-stack">
      {/* ── Hero profile header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-inset ring-gray-100 shadow-sm animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50/50" />
        <div className="absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-gradient-to-br from-gray-100/80 to-transparent" />
        <div className="absolute bottom-0 left-1/3 h-24 w-24 translate-y-8 rounded-full bg-gradient-to-tr from-gray-100/60 to-transparent" />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 text-xl font-semibold text-white shadow-lg shadow-gray-900/20">
                {emailInitial}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{detail.email}</h1>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusCfg.bg} ${statusCfg.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground/60">UID: {detail.uid}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{detail.email}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{detail.last_login_at ? formatShanghaiDateTime(detail.last_login_at) : "从未登录"}</span>
                  <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{detail.last_login_ip || "—"}</span>
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />注册于 {formatShanghaiDateTime(detail.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => router.push("/users")}>
                <ArrowLeft className="h-3.5 w-3.5" />返回列表
              </Button>
              <div className="h-4 w-px bg-gray-200" />
              <Button variant="outline" size="sm" onClick={() => setStatusConfirmOpen(true)}
                className={`h-8 gap-1.5 text-xs ${detail.status === 1 ? "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50" : "border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50"}`}
              >
                {detail.status === 1 ? <><Ban className="h-3.5 w-3.5" />禁用</> : <><CheckCircle className="h-3.5 w-3.5" />启用</>}
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setResetOpen(true); setNewPassword(""); }}>
                <KeyRound className="h-3.5 w-3.5" />重置密码
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setTopupOpen(true); setTopupAmount(""); setTopupRemark(""); }}>
                <Plus className="h-3.5 w-3.5" />充值
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setAdjustOpen(true); setAdjustAmount(""); setAdjustRemark(""); }}>
                <Minus className="h-3.5 w-3.5" />调账
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => {
                setRpmOpen(true);
                setRpmValue(detail.rpm_limit != null ? String(detail.rpm_limit) : "");
                setRpmRemark("");
              }}>
                <Gauge className="h-3.5 w-3.5" />调整 RPM
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <UserBalanceCards detail={detail} />

      {/* ── Charts ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <input
            type="datetime-local"
            className="h-8 rounded-md border border-gray-200 px-2 text-sm"
            value={chartStart}
            onChange={(e) => setChartStart(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">至</span>
          <input
            type="datetime-local"
            className="h-8 rounded-md border border-gray-200 px-2 text-sm"
            value={chartEnd}
            onChange={(e) => setChartEnd(e.target.value)}
          />
          {apiKeys.length > 0 && (
            <select
              className="h-8 rounded-md border border-gray-200 px-2 text-sm"
              value={chartKeyId ?? ""}
              onChange={(e) => setChartKeyId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">全部 Key</option>
              {apiKeys.map((k) => (
                <option key={k.id} value={k.id}>{k.name} ({k.key_prefix}...)</option>
              ))}
            </select>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <UserTokenTrendChart uid={uid} startTime={chartStart} endTime={chartEnd} selectedKeyId={chartKeyId} />
          <UserSpendingChart uid={uid} startTime={chartStart} endTime={chartEnd} selectedKeyId={chartKeyId} />
        </div>
      </div>

      {/* ── Data tabs ── */}
      <div className="animate-slide-up delay-200">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="apikeys" className="gap-1.5">
                <Key className="h-3.5 w-3.5" />API 密钥
              </TabsTrigger>
              <TabsTrigger value="usage-logs" className="gap-1.5">
                <FileSearch className="h-3.5 w-3.5" />调用日志
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        <div className="mt-3">
          {tab === "apikeys" && (
            <Card className="table-shell">
              <div className="overflow-hidden">
                <DataTable columns={keyColumns} data={apiKeys} loading={keysLoading} loadingText="正在加载API密钥..." emptyIcon={Key} emptyTitle="暂无API密钥" emptyDescription="该用户还没有创建任何API密钥。" rowKey={(k) => k.id} />
              </div>
            </Card>
          )}
          {tab === "usage-logs" && (
            <Card className="table-shell">
              <div className="overflow-hidden">
                <DataTable columns={usageColumns} data={usageLogs} loading={usageLoading} loadingText="正在加载调用日志..." emptyIcon={FileSearch} emptyTitle="暂无调用日志" emptyDescription="该用户还没有任何API调用记录。" rowKey={(r) => r.id} page={usagePage} pageSize={10} total={usageTotal} onPageChange={setUsagePage} showPageInfo />
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── PLACEHOLDER_DIALOGS ── */}

      <ConfirmDialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen} title={detail.status === 1 ? "禁用用户" : "启用用户"} description={detail.status === 1 ? `确定要禁用 ${detail.email} 吗？禁用后该用户将无法使用服务。` : `确定要启用 ${detail.email} 吗？`} confirmLabel="确认" onConfirm={handleToggleStatus} />

      <ConfirmDialog open={resetOpen} onOpenChange={(open) => { if (!open) { setResetOpen(false); setNewPassword(""); } }} title="重置用户密码" description={`为 ${detail.email} 设置新密码。`} confirmLabel="确认重置" onConfirm={handleResetPassword}>
        <div className="space-y-2">
          <Label htmlFor="reset-pwd">新密码</Label>
          <Input id="reset-pwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="请输入新密码" />
        </div>
      </ConfirmDialog>

      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>充值</DialogTitle>
            <DialogDescription>为 {detail.email} 充值余额。金额单位为元。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="topup-amount">金额（元）</Label>
              <Input id="topup-amount" type="number" step="0.01" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="例如 100 = ¥100.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topup-remark">备注（可选）</Label>
              <Input id="topup-remark" value={topupRemark} onChange={(e) => setTopupRemark(e.target.value)} placeholder="充值备注" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopupOpen(false)}>取消</Button>
            <Button onClick={() => void handleTopup()}>确认充值</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>调账</DialogTitle>
            <DialogDescription>为 {detail.email} 调整余额。金额单位为元，可为负数。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="adjust-amount">金额（元）</Label>
              <Input id="adjust-amount" type="number" step="0.01" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="正数增加，负数扣减" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-remark">备注（必填）</Label>
              <Input id="adjust-remark" value={adjustRemark} onChange={(e) => setAdjustRemark(e.target.value)} placeholder="请填写调账原因" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>取消</Button>
            <Button onClick={() => void handleAdjust()}>确认调账</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rpmOpen} onOpenChange={setRpmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>调整 RPM</DialogTitle>
            <DialogDescription>
              为 {detail.email} 设置每分钟请求上限。留空清除覆盖、恢复使用全局默认值（{detail.default_rpm ?? 20} 次/分钟）。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rpm-value">RPM 上限（次/分钟）</Label>
              <Input
                id="rpm-value"
                type="number"
                min={1}
                step={1}
                value={rpmValue}
                onChange={(e) => setRpmValue(e.target.value)}
                placeholder={`留空恢复默认（${detail.default_rpm ?? 20}）`}
              />
              <p className="text-xs text-muted-foreground">
                当前生效值：{detail.rpm_limit != null ? `${detail.rpm_limit} 次/分钟` : `${detail.default_rpm ?? 20} 次/分钟（默认）`}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rpm-remark">备注（可选）</Label>
              <Input
                id="rpm-remark"
                value={rpmRemark}
                onChange={(e) => setRpmRemark(e.target.value)}
                placeholder="例如：促销期间临时提升上限"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRpmOpen(false)}>取消</Button>
            <Button onClick={() => void handleUpdateRpm()}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
