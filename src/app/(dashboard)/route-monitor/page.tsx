"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  GitCompareArrows,
  Hash,
  RefreshCw,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import type { Column } from "@/components/data-table";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { routeMonitorApi } from "@/lib/api/route-monitor";
import { formatShanghaiDateTime } from "@/lib/time";
import { useAuthStore } from "@/stores/auth";
import type {
  RouteAggregateData,
  RouteCompareData,
  RouteRequestDetail,
  RouteRequestListItem,
  RouteRequestListParams,
} from "@/types";
import {
  ModelShareChart,
  ProviderLatencyTable,
  ScoreHistogramChart,
  TierDistributionChart,
} from "./_charts";

const STATUS_LABELS: Record<number, { label: string; cls: string }> = {
  0: { label: "Pending", cls: "border-gray-200 bg-gray-50 text-gray-700" },
  1: { label: "成功", cls: "border-green-200 bg-green-50 text-green-700" },
  2: { label: "失败", cls: "border-red-200 bg-red-50 text-red-700" },
  3: { label: "已退款", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  4: { label: "已中断", cls: "border-amber-200 bg-amber-50 text-amber-700" },
};

const TIER_OPTIONS = [
  { value: "", label: "全部 Tier" },
  { value: "1", label: "Tier 1" },
  { value: "2", label: "Tier 2" },
  { value: "3", label: "Tier 3" },
  { value: "4", label: "Tier 4" },
  { value: "5", label: "Tier 5" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "1", label: "成功" },
  { value: "2", label: "失败" },
  { value: "4", label: "已中断" },
];

const RANGE_OPTIONS: Array<{ value: "1h" | "24h" | "7d" | "30d"; label: string }> = [
  { value: "1h", label: "最近 1 小时" },
  { value: "24h", label: "最近 24 小时" },
  { value: "7d", label: "最近 7 天" },
  { value: "30d", label: "最近 30 天" },
];

function rangeToISO(range: "1h" | "24h" | "7d" | "30d"): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  if (range === "1h") start.setHours(start.getHours() - 1);
  else if (range === "24h") start.setHours(start.getHours() - 24);
  else if (range === "7d") start.setDate(start.getDate() - 7);
  else start.setDate(start.getDate() - 30);
  return { start: start.toISOString(), end: end.toISOString() };
}

function fmtScore(v: string | number | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toFixed(2);
}

function fmtMicroYuan(microyuan: number): string {
  // 1 元 = 1,000,000 微元；显示到小数点后 4 位的元
  return `¥${(microyuan / 1_000_000).toFixed(4)}`;
}

function ScoreBars({ scores }: { scores: Record<string, number> | null | undefined }) {
  if (!scores) return <span className="text-xs text-muted-foreground">—</span>;
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 0.001);
  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 text-muted-foreground">{k}</span>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-indigo-500"
              style={{ width: `${Math.min(100, (v / max) * 100)}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right font-mono text-foreground">{v.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}

export default function RouteMonitorPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";

  const [activeTab, setActiveTab] = useState<"requests" | "dashboard">("requests");

  // ── Tab 1: 列表 ────────────────────────────────────────────
  const [requests, setRequests] = useState<RouteRequestListItem[]>([]);
  const [reqTotal, setReqTotal] = useState(0);
  const [reqPage, setReqPage] = useState(1);
  const [pageSize] = useState(20);
  const [reqLoading, setReqLoading] = useState(true);

  // filters
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [scoreMinInput, setScoreMinInput] = useState("");
  const [scoreMaxInput, setScoreMaxInput] = useState("");
  const [appliedScore, setAppliedScore] = useState<{ min?: number; max?: number }>({});
  const [listRange, setListRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");

  // detail / compare
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<RouteRequestDetail | null>(null);
  const [compare, setCompare] = useState<RouteCompareData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Tab 2: 仪表盘 ─────────────────────────────────────────
  const [aggRange, setAggRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");
  const [aggregates, setAggregates] = useState<RouteAggregateData | null>(null);
  const [aggLoading, setAggLoading] = useState(true);

  // ── 拉数据 ───────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const { start, end } = rangeToISO(listRange);
      const params: RouteRequestListParams = {
        page: reqPage,
        page_size: pageSize,
        start,
        end,
      };
      if (tierFilter) params.routing_tier = parseInt(tierFilter, 10);
      if (statusFilter) params.status = parseInt(statusFilter, 10);
      if (appliedSearch) {
        // 32 字符 hex → 当作 input_hash；长度 > 0 否则作为 request_id 精确匹配
        if (/^[0-9a-f]{32}$/i.test(appliedSearch)) params.input_hash = appliedSearch;
        else params.request_id = appliedSearch;
      }
      if (appliedScore.min != null) params.score_min = appliedScore.min;
      if (appliedScore.max != null) params.score_max = appliedScore.max;

      const data = await routeMonitorApi.list(params);
      setRequests(data.items ?? []);
      setReqTotal(data.total ?? 0);
    } catch {
      setRequests([]);
      setReqTotal(0);
    } finally {
      setReqLoading(false);
    }
  }, [reqPage, pageSize, tierFilter, statusFilter, appliedSearch, appliedScore, listRange]);

  const fetchAggregates = useCallback(async () => {
    setAggLoading(true);
    try {
      const { start, end } = rangeToISO(aggRange);
      const data = await routeMonitorApi.aggregates({ start, end });
      setAggregates(data);
    } catch {
      setAggregates(null);
    } finally {
      setAggLoading(false);
    }
  }, [aggRange]);

  useEffect(() => {
    if (activeTab === "requests") fetchRequests();
  }, [activeTab, fetchRequests]);

  useEffect(() => {
    if (activeTab === "dashboard") fetchAggregates();
  }, [activeTab, fetchAggregates]);

  const openDetail = async (row: RouteRequestListItem) => {
    if (!isSuperAdmin) return;
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setCompare(null);
    try {
      const [d, c] = await Promise.all([
        routeMonitorApi.detail(row.request_id),
        row.input_hash
          ? routeMonitorApi.compare(row.request_id, 20).catch(() => null)
          : Promise.resolve(null),
      ]);
      setDetail(d);
      setCompare(c);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setAppliedSearch(searchInput.trim());
    const min = scoreMinInput.trim() === "" ? undefined : parseFloat(scoreMinInput.trim());
    const max = scoreMaxInput.trim() === "" ? undefined : parseFloat(scoreMaxInput.trim());
    setAppliedScore({
      min: Number.isFinite(min) ? min : undefined,
      max: Number.isFinite(max) ? max : undefined,
    });
    setReqPage(1);
  };

  const handleResetFilters = () => {
    setTierFilter("");
    setStatusFilter("");
    setSearchInput("");
    setAppliedSearch("");
    setScoreMinInput("");
    setScoreMaxInput("");
    setAppliedScore({});
    setReqPage(1);
  };

  // ── 列定义 ───────────────────────────────────────────────
  const columns: Column<RouteRequestListItem>[] = useMemo(
    () => [
      {
        key: "time",
        header: "时间",
        render: (r) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatShanghaiDateTime(r.created_at)}
          </span>
        ),
      },
      {
        key: "user",
        header: "用户",
        render: (r) => <span className="text-xs text-muted-foreground">UID {r.user_id}</span>,
      },
      {
        key: "models",
        header: "请求 / 选中模型",
        render: (r) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs text-muted-foreground">{r.model_name}</span>
            <span className="font-mono text-sm font-medium">
              {r.selected_model ?? <span className="text-muted-foreground/60">—</span>}
            </span>
          </div>
        ),
      },
      {
        key: "tier",
        header: "Tier / 总分",
        render: (r) =>
          r.routing_tier == null ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                T{r.routing_tier}
              </span>
              <span className="font-mono text-xs text-foreground">{fmtScore(r.total_score_0_10)}</span>
            </div>
          ),
      },
      {
        key: "status",
        header: "状态",
        render: (r) => {
          const cfg = STATUS_LABELS[r.status] ?? STATUS_LABELS[0];
          return (
            <span
              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}
            >
              {r.status === 1 ? <CheckCircle2 className="h-3 w-3" /> : null}
              {r.status === 2 ? <XCircle className="h-3 w-3" /> : null}
              {cfg.label}
              {r.error_code ? <span className="text-[10px]">/{r.error_code}</span> : null}
            </span>
          );
        },
      },
      {
        key: "latency",
        header: "耗时 (ms)",
        render: (r) => (
          <div className="text-right">
            <div className="text-sm">{r.duration_ms ?? "—"}</div>
            {r.upstream_latency_ms != null ? (
              <div className="text-[10px] text-muted-foreground">↗ {r.upstream_latency_ms}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: "tokens",
        header: "Tokens",
        render: (r) => (
          <div className="font-mono text-xs">
            {r.prompt_tokens}
            <span className="text-muted-foreground/50"> / </span>
            {r.completion_tokens}
          </div>
        ),
      },
      {
        key: "cost",
        header: "费用",
        render: (r) => <span className="font-mono text-xs">{fmtMicroYuan(r.cost)}</span>,
      },
      {
        key: "ops",
        header: "",
        render: (r) =>
          isSuperAdmin ? (
            <Button variant="outline" size="sm" onClick={() => openDetail(r)}>
              <Eye className="mr-1 h-3.5 w-3.5" />
              详情
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground" title="仅超级管理员可查看输入/响应原文">
              —
            </span>
          ),
      },
    ],
    [isSuperAdmin],
  );

  return (
    <div className="page-stack">
      <PageHeader
        icon={Activity}
        title="路由监控"
        subtitle="按请求记录路由打分、选中模型与上游延迟，分析路由算法表现。"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => (activeTab === "requests" ? fetchRequests() : fetchAggregates())}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            刷新
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "requests" | "dashboard")}>
        <TabsList>
          <TabsTrigger value="requests">请求详情</TabsTrigger>
          <TabsTrigger value="dashboard">聚合仪表盘</TabsTrigger>
        </TabsList>

        {/* Tab 1: 请求详情列表 */}
        <TabsContent value="requests">
          <Card className="panel">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => {
                      setListRange(o.value);
                      setReqPage(1);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      listRange === o.value
                        ? "bg-gray-950 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
                <div className="space-y-2">
                  <Label htmlFor="rm-tier">Tier</Label>
                  <select
                    id="rm-tier"
                    value={tierFilter}
                    onChange={(e) => {
                      setTierFilter(e.target.value);
                      setReqPage(1);
                    }}
                    className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gray-950/10"
                  >
                    {TIER_OPTIONS.map((o) => (
                      <option key={o.value || "all"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rm-status">状态</Label>
                  <select
                    id="rm-status"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setReqPage(1);
                    }}
                    className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gray-950/10"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value || "all"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>总分范围 0–10</Label>
                  <div className="flex gap-1">
                    <Input
                      placeholder="min"
                      value={scoreMinInput}
                      onChange={(e) => setScoreMinInput(e.target.value)}
                      className="w-20"
                    />
                    <Input
                      placeholder="max"
                      value={scoreMaxInput}
                      onChange={(e) => setScoreMaxInput(e.target.value)}
                      className="w-20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rm-search">request_id 或 input_hash</Label>
                  <Input
                    id="rm-search"
                    placeholder="完整 32 字符 hex 当作 input_hash"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleApplyFilters}>
                    <Search className="mr-1 h-3.5 w-3.5" />
                    应用
                  </Button>
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
                columns={columns}
                data={requests}
                loading={reqLoading}
                loadingText="正在加载路由请求..."
                emptyIcon={Activity}
                emptyTitle="暂无路由请求"
                emptyDescription="当前筛选条件下没有命中任何请求。"
                rowKey={(r) => r.id}
                page={reqPage}
                pageSize={pageSize}
                total={reqTotal}
                onPageChange={setReqPage}
                showPageInfo
              />
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: 聚合仪表盘 */}
        <TabsContent value="dashboard">
          <Card className="panel">
            <CardContent className="p-5">
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setAggRange(o.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      aggRange === o.value
                        ? "bg-gray-950 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {aggLoading ? (
            <Card className="panel">
              <CardContent className="p-10">
                <LoadingSpinner text="正在加载聚合数据..." />
              </CardContent>
            </Card>
          ) : !aggregates || aggregates.total === 0 ? (
            <Card className="panel">
              <CardContent className="p-0">
                <EmptyState
                  icon={Activity}
                  title="该时间范围内没有数据"
                  description="先发起一些请求，再回来查看聚合分析。"
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 总览卡片 */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="panel">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">总请求数</p>
                    <p className="mt-1 text-2xl font-semibold">{aggregates.total}</p>
                  </CardContent>
                </Card>
                <Card className="panel">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">成功</p>
                    <p className="mt-1 text-2xl font-semibold text-green-700">
                      {aggregates.success_total}
                    </p>
                  </CardContent>
                </Card>
                <Card className="panel">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">失败</p>
                    <p className="mt-1 text-2xl font-semibold text-red-700">
                      {aggregates.error_total}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <Card className="panel">
                  <CardContent className="p-4">
                    <p className="mb-2 text-sm font-medium">Tier 分布与成败</p>
                    <TierDistributionChart data={aggregates.by_tier} />
                  </CardContent>
                </Card>
                <Card className="panel">
                  <CardContent className="p-4">
                    <p className="mb-2 text-sm font-medium">选中模型分布（Top 10）</p>
                    <ModelShareChart data={aggregates.by_model} />
                  </CardContent>
                </Card>
                <Card className="panel">
                  <CardContent className="p-4">
                    <p className="mb-2 text-sm font-medium">总分直方图（0–10）</p>
                    <ScoreHistogramChart data={aggregates.by_score} />
                  </CardContent>
                </Card>
                <Card className="panel">
                  <CardContent className="p-4">
                    <p className="mb-2 text-sm font-medium">上游 Provider 延迟分布</p>
                    <ProviderLatencyTable data={aggregates.by_provider_latency} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 详情 Dialog（含对比回放） */}
      <Dialog open={detailOpen} onOpenChange={(open) => !open && setDetailOpen(false)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              路由请求详情
            </DialogTitle>
            <DialogDescription>
              查看本次路由的打分细节、上下文与同输入历史。
            </DialogDescription>
          </DialogHeader>

          {!isSuperAdmin ? (
            <div className="py-10">
              <EmptyState
                icon={Shield}
                title="无权限"
                description="只有超级管理员可以查看包含用户输入与响应原文的详情。"
              />
            </div>
          ) : detailLoading ? (
            <div className="py-10">
              <LoadingSpinner text="正在加载..." />
            </div>
          ) : detail ? (
            <div className="max-h-[70vh] space-y-5 overflow-y-auto py-2 pr-2">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-secondary/40 p-4 text-sm">
                  <p className="mb-2 text-sm font-medium">路由决策</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p>请求 ID: <span className="font-mono text-foreground">{detail.request_id}</span></p>
                    <p>请求模型: <span className="font-mono text-foreground">{detail.model_name}</span></p>
                    <p>选中模型: <span className="font-mono text-foreground">{detail.selected_model ?? "—"}</span></p>
                    <p>Tier: T{detail.routing_tier ?? "—"} / 总分 {fmtScore(detail.total_score_0_10)}</p>
                    <p>评分来源: <span className="font-mono">{detail.score_source ?? "—"}</span></p>
                    {detail.input_hash ? (
                      <p>
                        Input Hash:{" "}
                        <span className="inline-flex items-center gap-1 font-mono text-foreground">
                          <Hash className="h-3 w-3" />
                          {detail.input_hash}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-secondary/40 p-4 text-sm">
                  <p className="mb-2 text-sm font-medium">上下文</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p>用户 UID: {detail.user_id}</p>
                    <p>Provider: <span className="font-mono text-foreground">{detail.provider_slug ?? "—"}</span></p>
                    <p>Upstream: <span className="font-mono text-foreground">{detail.upstream_model ?? "—"}</span></p>
                    <p>耗时: {detail.duration_ms ?? "—"}ms (↗ 上游 {detail.upstream_latency_ms ?? "—"}ms)</p>
                    <p>Tokens: {detail.prompt_tokens} / {detail.completion_tokens}</p>
                    <p>费用: {fmtMicroYuan(detail.cost)}</p>
                    <p>时间: {formatShanghaiDateTime(detail.created_at)}</p>
                  </div>
                </div>
              </div>

              {detail.routing_detail ? (
                <div className="rounded-2xl border border-border/80 bg-white p-4">
                  <p className="mb-3 text-sm font-medium">五路评分</p>
                  <ScoreBars scores={detail.routing_detail.scores_0_2 ?? null} />
                  {detail.routing_detail.proto_weighted_0_2 != null ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Proto 加权: {detail.routing_detail.proto_weighted_0_2.toFixed(4)}
                    </p>
                  ) : null}
                  {(detail.routing_detail.fallback_routes?.length ?? 0) > 0 ? (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      Fallback: {detail.routing_detail.fallback_routes?.join(", ")}
                    </p>
                  ) : null}
                  {detail.routing_detail.tier_model_map ? (
                    <div className="mt-3 grid grid-cols-5 gap-1 text-[10px] text-muted-foreground">
                      {Object.entries(detail.routing_detail.tier_model_map).map(([t, m]) => (
                        <div key={t} className="rounded-md border border-border/60 px-2 py-1">
                          <div className="font-semibold text-foreground">T{t}</div>
                          <div className="font-mono">{m}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {detail.request_preview ? (
                <div className="rounded-2xl border border-border/80 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium">输入与响应</p>
                    {detail.request_preview.is_truncated ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        部分内容已截断
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {detail.request_preview.messages.map((m, i) => (
                      <div key={i} className="rounded-md bg-secondary/40 p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {m.role}
                        </div>
                        <div className="mt-1 whitespace-pre-wrap break-all text-sm">{m.content}</div>
                      </div>
                    ))}
                    {detail.request_preview.response_text ? (
                      <div className="rounded-md bg-emerald-50/50 p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                          assistant (response)
                        </div>
                        <div className="mt-1 whitespace-pre-wrap break-all text-sm">
                          {detail.request_preview.response_text}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {compare && compare.siblings.length > 0 ? (
                <div className="rounded-2xl border border-border/80 bg-white p-4">
                  <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium">
                    <GitCompareArrows className="h-4 w-4" />
                    相同输入历史（{compare.siblings.length} 条）
                  </p>
                  <div className="space-y-1.5">
                    {compare.siblings.map((s) => (
                      <div
                        key={s.id}
                        className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-xs"
                      >
                        <span className="text-muted-foreground">
                          {formatShanghaiDateTime(s.created_at)}
                        </span>
                        <span className="font-mono text-foreground">{s.selected_model ?? "—"}</span>
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-bold text-indigo-700">
                          T{s.routing_tier ?? "—"}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {fmtScore(s.total_score_0_10)}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-medium ${
                            STATUS_LABELS[s.status]?.cls ?? STATUS_LABELS[0].cls
                          }`}
                        >
                          {STATUS_LABELS[s.status]?.label ?? "?"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : compare ? (
                <p className="text-xs text-muted-foreground">无相同输入的历史记录。</p>
              ) : null}
            </div>
          ) : (
            <div className="py-10">
              <EmptyState icon={Activity} title="未能加载详情" description="请稍后重试。" />
            </div>
          )}

          <DialogFooter>
            {!isSuperAdmin ? (
              <Button asChild>
                <Link href="/">返回仪表盘</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
