"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import {
  Activity,
  BarChart3,
  Clock3,
  Cpu,
  Gauge,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  type AdminProbeAudit,
  type BenchmarkJobAcceptedResponse,
  type BenchmarkJobStatusResponse,
  type BenchmarkModelSummary,
  type BenchmarkTrendResponse,
  type LatestProbeResult,
  type ModelDetail,
  type ModelOfferingResponse,
  type OfferingMetricsResponse,
  type ProviderTrendLine,
  testingApi,
} from "@/lib/api/testing";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center">
      <LoadingSpinner text="正在加载趋势图..." />
    </div>
  ),
});

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const TREND_COLORS = ["#2563EB", "#0F766E", "#D97706", "#7C3AED", "#DC2626", "#0891B2", "#EA580C", "#16A34A"];
const SAMPLE_WINDOW = 5;
const POLL_INTERVAL_MS = 4000;
const POLL_DURATION_MS = 180000;
const TERMINAL_JOB_STATUSES = new Set(["succeeded", "failed", "partial"]);

type TrendMetric = "throughput" | "ttft" | "e2e";
type TrendPoint = ProviderTrendLine["data_points"][number];
type TooltipParam = {
  axisValueLabel?: string;
  color?: unknown;
  seriesName?: string;
  value?: number | string | (number | string | null)[] | null;
};

type BenchmarkOfferingCardData = ModelOfferingResponse & {
  metrics?: OfferingMetricsResponse | null;
  latest_probe?: LatestProbeResult | null;
  manual_probe?: AdminProbeAudit | null;
};

const METRIC_CONFIG: Record<TrendMetric, { label: string; unit: string; dataKey: keyof TrendPoint }> = {
  throughput: { label: "吞吐", unit: "tokens/s", dataKey: "avg_throughput_tps" },
  ttft: { label: "首字延迟", unit: "ms", dataKey: "avg_ttft_ms" },
  e2e: { label: "E2E 延迟", unit: "ms", dataKey: "avg_e2e_latency_ms" },
};

const formatMetric = (value?: number | null, digits = 1) => (value == null ? "-" : value.toFixed(digits));

const formatDateTime = (value?: string | null) => {
  if (!value) return "暂无";
  return new Date(value).toLocaleString("zh-CN");
};

const sortModelsByOfferings = (items: BenchmarkModelSummary[]) =>
  [...items].sort((left, right) => {
    const offeringDelta = right.offerings.length - left.offerings.length;
    if (offeringDelta !== 0) return offeringDelta;
    return left.model_name.localeCompare(right.model_name, "zh-CN");
  });

const getDefaultModelSlug = (items: BenchmarkModelSummary[]) => sortModelsByOfferings(items)[0]?.model_slug ?? "";

const getMetricSummary = (provider: ProviderTrendLine, metric: TrendMetric) => {
  if (metric === "throughput") {
    return { min: provider.min_throughput, max: provider.max_throughput, avg: provider.avg_throughput };
  }
  if (metric === "ttft") {
    return { min: provider.min_ttft, max: provider.max_ttft, avg: provider.avg_ttft };
  }
  const values = provider.data_points
    .map((point) => point.avg_e2e_latency_ms)
    .filter((value): value is number => value != null);
  if (values.length === 0) {
    return { min: undefined, max: undefined, avg: undefined };
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: Math.round(values.reduce((total, value) => total + value, 0) / values.length),
  };
};

const getJobStatusLabel = (status?: string) => {
  switch (status) {
    case "queued":
      return "排队中";
    case "running":
      return "执行中";
    case "succeeded":
      return "已完成";
    case "partial":
      return "部分完成";
    case "failed":
      return "执行失败";
    default:
      return "未知状态";
  }
};

const getJobStatusTone = (status?: string) => {
  switch (status) {
    case "succeeded":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "partial":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const isTerminalJobStatus = (status?: string) => (status ? TERMINAL_JOB_STATUSES.has(status) : false);

function OfferingMetricCard({
  offering,
  index,
  onTriggerSingle,
  pendingSingle,
}: {
  offering: BenchmarkOfferingCardData;
  index: number;
  onTriggerSingle: (offeringId: number) => Promise<void>;
  pendingSingle: boolean;
}) {
  const metrics = offering.metrics;
  const hasMetrics = !!metrics && metrics.sample_count > 0;
  const latestProbe = offering.latest_probe;
  const manualProbe = offering.manual_probe;
  const accentColor = TREND_COLORS[index % TREND_COLORS.length];

  return (
    <div className="panel relative overflow-hidden border border-border/70 bg-white/95 p-5">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
        style={{ background: `linear-gradient(90deg, ${accentColor}, rgba(255,255,255,0))` }}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          {offering.provider.logo_url ? (
            <img
              src={offering.provider.logo_url}
              alt={offering.provider.name}
              className="h-11 w-11 rounded-2xl border border-border/70 bg-white p-2 object-contain"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-sm font-semibold text-muted-foreground">
              {offering.provider.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{offering.provider.name}</h3>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  offering.is_active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                )}
              >
                {offering.is_active ? "可测评" : "已停用"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Offering ID {offering.id} · {offering.provider_model_name || offering.provider.slug}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onTriggerSingle(offering.id)}
          disabled={pendingSingle || !offering.is_active}
          className="border-slate-200 bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
        >
          <PlayCircle className={cn("mr-2 h-4 w-4", pendingSingle && "animate-pulse")} />
          {pendingSingle ? "测评中..." : "单次测评"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-slate-50 p-3">
          <p className="text-xs text-muted-foreground">输入价格 / 1M</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {offering.price_input_per_m != null ? `¥${offering.price_input_per_m}` : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-slate-50 p-3">
          <p className="text-xs text-muted-foreground">输出价格 / 1M</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {offering.price_output_per_m != null ? `¥${offering.price_output_per_m}` : "-"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/70 bg-background/80 p-4">
        {hasMetrics ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">首字延迟</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatMetric(metrics.avg_ttft_ms, 0)} ms</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E2E 延迟</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatMetric(metrics.avg_e2e_latency_ms, 0)} ms
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">吞吐</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatMetric(metrics.avg_throughput_tps, 2)} t/s
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">样本数</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{metrics.sample_count}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              最近 {metrics.sample_count} 次成功测评均值
              {metrics.probe_region ? ` · ${metrics.probe_region}` : ""}
              {" · "}
              最近更新时间 {formatDateTime(metrics.last_measured_at)}
            </p>
          </>
        ) : (
          <div
            className={cn(
              "rounded-2xl px-4 py-4 text-sm",
              latestProbe?.success === false
                ? "border border-red-200 bg-red-50/80 text-red-700"
                : "bg-secondary/50 text-muted-foreground"
            )}
          >
            <div className="flex items-start gap-3">
              <TimerReset
                className={cn(
                  "mt-0.5 h-4 w-4",
                  latestProbe?.success === false ? "text-red-500" : "text-slate-500"
                )}
              />
              <div>
                <p className="font-medium">
                  {latestProbe?.success === false ? "最近一次全量测评失败" : "暂无有效全量测评结果"}
                </p>
                <p className="mt-1 text-xs">
                  {latestProbe?.success === false
                    ? `${latestProbe.error_code || "unknown"} · ${formatDateTime(latestProbe.measured_at)}${
                        latestProbe.probe_region ? ` · ${latestProbe.probe_region}` : ""
                      }`
                    : "触发全量测评后，这里会展示最新成功指标或失败原因。"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">管理员单测审计</p>
            <p className="mt-1 text-sm text-foreground">{manualProbe ? "最近一次手动测评结果" : "当前没有手动测评记录"}</p>
          </div>
          {manualProbe ? (
            <span className={cn("rounded-full border px-2 py-1 text-[11px] font-medium", getJobStatusTone(manualProbe.status))}>
              {manualProbe.success ? "成功" : "失败"}
            </span>
          ) : null}
        </div>

        {manualProbe ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">TTFT</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatMetric(manualProbe.ttft_ms, 0)} ms</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">E2E</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatMetric(manualProbe.e2e_latency_ms, 0)} ms</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">吞吐</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatMetric(manualProbe.throughput_tps, 2)} t/s</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">完成时间</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatDateTime(manualProbe.finished_at)}</p>
            </div>
            {manualProbe.error_code ? (
              <div className="sm:col-span-4">
                <p className="text-xs text-muted-foreground">错误码</p>
                <p className="mt-1 text-sm font-medium text-red-600">{manualProbe.error_code}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            单次测评结果只对管理员可见，不会进入用户前端面板，也不会污染全量测评趋势。
          </p>
        )}
      </div>
    </div>
  );
}

export default function BenchmarkPageClient() {
  const [summaryItems, setSummaryItems] = useState<BenchmarkModelSummary[]>([]);
  const [selectedModelSlug, setSelectedModelSlug] = useState("");
  const [selectedDays, setSelectedDays] = useState(7);
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>("throughput");
  const [modelDetail, setModelDetail] = useState<ModelDetail | null>(null);
  const [trendData, setTrendData] = useState<BenchmarkTrendResponse | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [summaryRefreshing, setSummaryRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [triggeringAll, setTriggeringAll] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [fullJob, setFullJob] = useState<BenchmarkJobStatusResponse | null>(null);
  const [singleJobsByOffering, setSingleJobsByOffering] = useState<Record<number, BenchmarkJobStatusResponse>>({});
  const [manualAuditsByOffering, setManualAuditsByOffering] = useState<Record<number, AdminProbeAudit | null>>({});

  const selectedModelSlugRef = useRef("");
  const selectedDaysRef = useRef(7);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollDeadlineRef = useRef<number | null>(null);
  const fullJobIdRef = useRef<string | null>(null);
  const singleJobIdsRef = useRef<Record<number, string>>({});
  const pollInFlightRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const detailRequestIdRef = useRef(0);

  const selectedSummaryModel = useMemo(
    () => summaryItems.find((item) => item.model_slug === selectedModelSlug) ?? null,
    [selectedModelSlug, summaryItems]
  );

  const mergedOfferings = useMemo(() => {
    if (!modelDetail) return [];
    const summaryMap = new Map(
      (selectedSummaryModel?.offerings ?? []).map((offering) => [
        offering.offering_id,
        {
          metrics: offering.metrics ?? null,
          latest_probe: offering.latest_probe ?? null,
        },
      ])
    );

    return modelDetail.offerings.map((offering) => ({
      ...offering,
      metrics: summaryMap.get(offering.id)?.metrics ?? offering.metrics ?? null,
      latest_probe: summaryMap.get(offering.id)?.latest_probe ?? null,
      manual_probe: manualAuditsByOffering[offering.id] ?? null,
    }));
  }, [manualAuditsByOffering, modelDetail, selectedSummaryModel]);

  const activeOfferings = useMemo(() => mergedOfferings.filter((offering) => offering.is_active), [mergedOfferings]);

  const totalOfferings = useMemo(
    () => summaryItems.reduce((count, item) => count + item.offerings.length, 0),
    [summaryItems]
  );

  const latestMeasuredAt = useMemo(() => {
    const dates = summaryItems
      .flatMap((item) => item.offerings.map((offering) => offering.metrics?.last_measured_at))
      .filter((value): value is string => !!value)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
    return dates[0];
  }, [summaryItems]);

  const pendingSingleOfferingIds = useMemo(
    () =>
      new Set(
        Object.entries(singleJobsByOffering)
          .filter(([, job]) => !isTerminalJobStatus(job.status))
          .map(([offeringId]) => Number(offeringId))
      ),
    [singleJobsByOffering]
  );

  const pendingJobCount =
    (fullJob && !isTerminalJobStatus(fullJob.status) ? 1 : 0) +
    Object.values(singleJobsByOffering).filter((job) => !isTerminalJobStatus(job.status)).length;

  useEffect(() => {
    selectedModelSlugRef.current = selectedModelSlug;
    selectedDaysRef.current = selectedDays;
  }, [selectedDays, selectedModelSlug]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollDeadlineRef.current = null;
  }, []);

  const loadSummary = useCallback(async (silent = false) => {
    if (!silent) {
      setSummaryRefreshing(true);
    }

    try {
      const response = await testingApi.getBenchmarkStatsSummary(SAMPLE_WINDOW);
      const sorted = sortModelsByOfferings(response.items);
      setSummaryItems(sorted);
      setSummaryError(null);
      setSelectedModelSlug((current) => {
        if (sorted.length === 0) return "";
        if (!current || !sorted.some((item) => item.model_slug === current)) {
          return getDefaultModelSlug(sorted);
        }
        return current;
      });
    } catch (error) {
      console.error("加载测评汇总失败:", error);
      setSummaryError("测评汇总加载失败，请检查 testing 服务和管理员登录状态。");
    } finally {
      if (!silent) {
        setSummaryRefreshing(false);
      }
    }
  }, []);

  const loadManualAudits = useCallback(async (offeringIds: number[]) => {
    if (offeringIds.length === 0) {
      return {};
    }

    const auditEntries = await Promise.all(
      offeringIds.map(async (offeringId) => {
        try {
          const response = await testingApi.getProbeAudits({ offering_id: offeringId, limit: 1 });
          return [offeringId, response.items[0] ?? null] as const;
        } catch (error) {
          console.error(`加载 offering ${offeringId} 单测审计失败:`, error);
          return [offeringId, null] as const;
        }
      })
    );

    return Object.fromEntries(auditEntries) as Record<number, AdminProbeAudit | null>;
  }, []);

  const loadSelectedModelData = useCallback(
    async (slug: string, days: number, silent = false) => {
      const requestId = ++detailRequestIdRef.current;

      if (!slug) {
        setModelDetail(null);
        setTrendData(null);
        setManualAuditsByOffering({});
        return;
      }

      if (!silent) {
        setDetailLoading(true);
      }

      try {
        const [detail, trend] = await Promise.all([
          testingApi.getModelDetail(slug),
          testingApi.getBenchmarkTrends(slug, days),
        ]);
        const manualAudits = await loadManualAudits(detail.offerings.map((offering) => offering.id));
        if (detailRequestIdRef.current !== requestId) {
          return;
        }
        setModelDetail(detail);
        setTrendData(trend);
        setManualAuditsByOffering(manualAudits);
      } catch (error) {
        console.error("加载模型测评详情失败:", error);
        if (!silent) {
          toast.error("测评数据加载失败", "请稍后刷新重试。");
        }
      } finally {
        if (!silent) {
          setDetailLoading(false);
        }
      }
    },
    [loadManualAudits]
  );

  const refreshAllData = useCallback((silent = false) => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshPromise = (async () => {
      await loadSummary(silent);
      if (selectedModelSlugRef.current) {
        await loadSelectedModelData(selectedModelSlugRef.current, selectedDaysRef.current, silent);
      }
    })().finally(() => {
      refreshPromiseRef.current = null;
    });

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [loadSelectedModelData, loadSummary]);

  const syncJobStatus = useCallback(async (accepted: BenchmarkJobAcceptedResponse, offeringId?: number) => {
    const job = await testingApi.getBenchmarkJob(accepted.job_id);
    if (accepted.job_type === "full") {
      fullJobIdRef.current = job.job_id;
      setFullJob(job);
      return;
    }
    if (offeringId != null) {
      singleJobIdsRef.current = { ...singleJobIdsRef.current, [offeringId]: job.job_id };
      setSingleJobsByOffering((current) => ({ ...current, [offeringId]: job }));
    }
  }, []);

  const pollJobs = useCallback(async () => {
    if (pollInFlightRef.current) {
      return;
    }

    const fullJobId = fullJobIdRef.current;
    const singleEntries = Object.entries(singleJobIdsRef.current);
    if (!fullJobId && singleEntries.length === 0) {
      stopPolling();
      return;
    }

    pollInFlightRef.current = true;

    try {

      if (pollDeadlineRef.current && Date.now() >= pollDeadlineRef.current) {
      stopPolling();
      toast.info("自动轮询已停止", "任务仍可继续执行，你可以稍后手动刷新查看。");
      return;
    }

      let shouldRefreshBenchmarkData = false;

      if (fullJobId) {
      try {
        const job = await testingApi.getBenchmarkJob(fullJobId);
        setFullJob(job);
        if (isTerminalJobStatus(job.status)) {
          fullJobIdRef.current = null;
          shouldRefreshBenchmarkData = true;
          if (job.status === "succeeded" || job.status === "partial") {
            toast.success("全量测评已完成", `任务 ${job.job_id} 状态：${getJobStatusLabel(job.status)}`);
          } else {
            toast.error("全量测评失败", job.error_message || "请检查 testing worker 和 Redis 状态。");
          }
        }
      } catch (error) {
        console.error("轮询全量测评任务失败:", error);
      }
    }

      if (singleEntries.length > 0) {
      const nextMap = { ...singleJobIdsRef.current };
      await Promise.all(
        singleEntries.map(async ([offeringIdKey, jobId]) => {
          const offeringId = Number(offeringIdKey);
          try {
            const job = await testingApi.getBenchmarkJob(jobId);
            setSingleJobsByOffering((current) => ({ ...current, [offeringId]: job }));
            if (isTerminalJobStatus(job.status)) {
              delete nextMap[offeringId];
              const audits = await testingApi.getProbeAudits({ offering_id: offeringId, limit: 1 });
              setManualAuditsByOffering((current) => ({ ...current, [offeringId]: audits.items[0] ?? null }));
              if (job.status === "succeeded" || job.status === "partial") {
                toast.success("单次测评完成", `Offering ${offeringId} 已返回最新管理员审计结果。`);
              } else {
                toast.error("单次测评失败", job.error_message || `Offering ${offeringId} 执行失败。`);
              }
            }
          } catch (error) {
            console.error(`轮询单次测评任务失败 offering=${offeringId}:`, error);
          }
        })
      );
      singleJobIdsRef.current = nextMap;
    }

      if (shouldRefreshBenchmarkData) {
        await refreshAllData(true);
      }

      if (!fullJobIdRef.current && Object.keys(singleJobIdsRef.current).length === 0) {
        stopPolling();
      }
    } finally {
      pollInFlightRef.current = false;
    }
  }, [refreshAllData, stopPolling]);

  const startPolling = useCallback(() => {
    if (!pollTimerRef.current) {
      pollDeadlineRef.current = Date.now() + POLL_DURATION_MS;
      pollTimerRef.current = setInterval(() => {
        void pollJobs();
      }, POLL_INTERVAL_MS);
    }
    void pollJobs();
  }, [pollJobs]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setPageLoading(true);
      await loadSummary(false);
      if (mounted) {
        setPageLoading(false);
      }
    };

    void init();

    return () => {
      mounted = false;
      stopPolling();
    };
  }, [loadSummary, stopPolling]);

  useEffect(() => {
    if (!selectedModelSlug) {
      setModelDetail(null);
      setTrendData(null);
      setManualAuditsByOffering({});
      return;
    }
    void loadSelectedModelData(selectedModelSlug, selectedDays, false);
  }, [loadSelectedModelData, selectedDays, selectedModelSlug]);

  const handleRefresh = async () => {
    await refreshAllData(false);
  };

  const handleTriggerAll = async () => {
    setTriggeringAll(true);
    try {
      const accepted = await testingApi.triggerBenchmarkAll();
      await syncJobStatus(accepted);
      toast.success("全量测评任务已提交", `任务 ${accepted.job_id} 已入队，共 ${accepted.queued_count} 个 offering。`);
      startPolling();
    } catch (error) {
      console.error("触发全量测评失败:", error);
      toast.error("触发失败", "请检查 Redis、testing worker 和管理员登录状态。");
    } finally {
      setTriggeringAll(false);
    }
  };

  const handleTriggerSingle = useCallback(async (offeringId: number) => {
    try {
      const accepted = await testingApi.triggerBenchmarkOne(offeringId);
      await syncJobStatus(accepted, offeringId);
      toast.success("单次测评已提交", `Offering ${offeringId} 的测评任务已经入队。`);
      startPolling();
    } catch (error) {
      console.error("触发单次测评失败:", error);
      toast.error("单次测评提交失败", `Offering ${offeringId} 触发失败，请稍后重试。`);
    }
  }, [startPolling, syncJobStatus]);

  const metricCfg = METRIC_CONFIG[selectedMetric];

  const chartOption = useMemo(() => {
    if (!trendData || trendData.providers.length === 0) {
      return {} as EChartsOption;
    }

    return {
      color: TREND_COLORS,
      animationDuration: 400,
      tooltip: {
        trigger: "axis",
        backgroundColor: "#ffffff",
        borderColor: "#E5E7EB",
        borderWidth: 1,
        textStyle: { color: "#111827" },
        formatter: (params: unknown) => {
          const items = (Array.isArray(params) ? params : [params]) as TooltipParam[];
          const header = items[0]?.axisValueLabel
            ? `<div style="font-weight:600;margin-bottom:8px">${items[0].axisValueLabel}</div>`
            : "";
          const rows = items
            .filter((item) => Array.isArray(item.value) || item.value != null)
            .map((item) => {
              const value = Array.isArray(item.value) ? item.value[1] : item.value;
              const color = typeof item.color === "string" ? item.color : "#111827";
              return `
                <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${color}"></span>
                  <span>${item.seriesName}</span>
                  <span style="margin-left:auto;font-weight:600">${value ?? "-"} ${metricCfg.unit}</span>
                </div>
              `;
            })
            .join("");
          return `${header}${rows}`;
        },
      },
      legend: {
        bottom: 0,
        itemGap: 18,
        textStyle: { color: "#6B7280", fontSize: 12 },
      },
      grid: { top: 28, left: 18, right: 18, bottom: 70, containLabel: true },
      xAxis: {
        type: "time",
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#E5E7EB" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#9CA3AF",
          fontSize: 12,
          formatter: (value: string | number) =>
            new Date(value).toLocaleString("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
        },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#F3F4F6" } },
        axisLabel: { color: "#9CA3AF", fontSize: 12 },
      },
      series: trendData.providers.map((provider, index) => ({
        name: provider.provider_name,
        type: "line",
        smooth: true,
        showSymbol: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: 2.5, color: TREND_COLORS[index % TREND_COLORS.length] },
        itemStyle: { color: TREND_COLORS[index % TREND_COLORS.length] },
        connectNulls: false,
        data: provider.data_points
          .map((point) => {
            const metricValue = point[metricCfg.dataKey];
            if (metricValue == null) return null;
            return [point.date, metricValue];
          })
          .filter((point): point is [string, number] => point !== null),
      })),
    } as EChartsOption;
  }, [metricCfg.dataKey, metricCfg.unit, trendData]);

  if (pageLoading) {
    return (
      <div className="panel">
        <LoadingSpinner text="正在加载测评管理页..." />
      </div>
    );
  }

  return (
    <div className="page-stack max-w-7xl">
      <section className="panel relative overflow-hidden border border-slate-200 bg-white/95 p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-12 h-44 w-44 rounded-full bg-slate-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-slate-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-900 px-3 py-1 text-xs font-medium text-white">
              <ShieldCheck className="h-3.5 w-3.5" />
              仅管理员可触发
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">队列化测评调度与单次测评审计</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              全量测评现在只负责入队，由 testing worker 并发执行。单次测评同样走异步任务，但结果只写入管理员审计，不进入用户可见趋势面板。
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleTriggerAll} disabled={triggeringAll} className="min-w-[196px] bg-slate-900 text-white hover:bg-slate-800">
              <Activity className={cn("mr-2 h-4 w-4", triggeringAll && "animate-pulse")} />
              {triggeringAll ? "提交中..." : "手动触发全量测评"}
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={summaryRefreshing || detailLoading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", (summaryRefreshing || detailLoading) && "animate-spin")} />
              刷新数据
            </Button>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>统计窗口：最近 {SAMPLE_WINDOW} 次成功全量测评样本</span>
          <span>最近汇总更新时间：{formatDateTime(latestMeasuredAt)}</span>
          <span>待轮询任务数：{pendingJobCount}</span>
        </div>

        {fullJob ? (
          <div className="relative mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">当前全量任务</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-1 text-[11px] font-medium", getJobStatusTone(fullJob.status))}>
                    {getJobStatusLabel(fullJob.status)}
                  </span>
                  <span className="text-sm font-medium text-foreground">{fullJob.job_id}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">总数</p>
                  <p className="mt-1 font-semibold text-foreground">{fullJob.total_offerings}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">已完成</p>
                  <p className="mt-1 font-semibold text-foreground">{fullJob.completed_offerings}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">成功</p>
                  <p className="mt-1 font-semibold text-emerald-600">{fullJob.succeeded_offerings}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">失败</p>
                  <p className="mt-1 font-semibold text-red-600">{fullJob.failed_offerings}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-900">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">模型数量</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{summaryItems.length}</p>
            </div>
          </div>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-900">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">活跃报价数</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{totalOfferings}</p>
            </div>
          </div>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-900">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">样本窗口</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{SAMPLE_WINDOW}</p>
            </div>
          </div>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-900">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">轮询状态</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{pendingJobCount > 0 ? "进行中" : "空闲"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">模型测评视角</h2>
            <p className="mt-1 text-sm text-muted-foreground">默认选中当前接入服务商最多的模型，展示全量测评趋势和管理员单次测评审计。</p>
          </div>
          <div className="w-full lg:max-w-sm">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">选择模型</label>
            <select
              className="h-11 w-full rounded-2xl border border-input/90 bg-white/90 px-4 text-sm shadow-sm outline-none transition focus:ring-4 focus:ring-slate-900/10"
              value={selectedModelSlug}
              onChange={(event) => setSelectedModelSlug(event.target.value)}
              disabled={summaryItems.length === 0}
            >
              {summaryItems.length === 0 ? <option value="">暂无模型</option> : null}
              {summaryItems.map((item) => (
                <option key={item.model_slug} value={item.model_slug}>
                  {item.vendor_name} / {item.model_name} ({item.offerings.length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {summaryError ? (
        <section className="panel border-destructive/20 p-8 text-center">
          <p className="text-base font-medium text-destructive">测评汇总加载失败</p>
          <p className="mt-2 text-sm text-muted-foreground">{summaryError}</p>
        </section>
      ) : null}

      {!summaryError && summaryItems.length === 0 ? (
        <section className="panel p-12 text-center">
          <p className="text-lg font-medium text-foreground">暂无可测评对象</p>
          <p className="mt-2 text-sm text-muted-foreground">请先在模型管理中配置模型、服务商和报价，再返回这里触发测评。</p>
        </section>
      ) : null}

      {!summaryError && summaryItems.length > 0 && detailLoading ? (
        <section className="panel">
          <LoadingSpinner text="正在加载模型测评详情..." />
        </section>
      ) : null}

      {!summaryError && summaryItems.length > 0 && !detailLoading && modelDetail ? (
        <>
          <section className="page-stack">
            <div>
              <h3 className="text-lg font-semibold text-foreground">服务商指标卡</h3>
              <p className="mt-1 text-sm text-muted-foreground">指标卡展示全量测评聚合结果，单次测评审计单独显示，不进入用户前端。</p>
            </div>

            {activeOfferings.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {activeOfferings.map((offering, index) => (
                  <OfferingMetricCard
                    key={offering.id}
                    offering={offering}
                    index={index}
                    onTriggerSingle={handleTriggerSingle}
                    pendingSingle={pendingSingleOfferingIds.has(offering.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="panel p-12 text-center">
                <p className="text-base font-medium text-foreground">该模型暂无活跃报价</p>
                <p className="mt-2 text-sm text-muted-foreground">请先在模型详情中添加服务商报价，再触发测评。</p>
              </div>
            )}
          </section>

          <section className="panel p-6 md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">全量测评趋势</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {trendData?.date_range ? `原始测点时间范围 · ${trendData.date_range}` : "按探测时间顺序展示各服务商性能变化趋势"}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-2xl bg-secondary/70 p-1">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setSelectedDays(days)}
                      className={cn(
                        "rounded-2xl px-4 py-2 text-sm transition-colors",
                        selectedDays === days ? "bg-white text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {days} 天
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl bg-secondary/70 p-1">
                  {(Object.keys(METRIC_CONFIG) as TrendMetric[]).map((metric) => (
                    <button
                      key={metric}
                      type="button"
                      onClick={() => setSelectedMetric(metric)}
                      className={cn(
                        "rounded-2xl px-4 py-2 text-sm transition-colors",
                        selectedMetric === metric ? "bg-white text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {METRIC_CONFIG[metric].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {trendData && trendData.providers.length > 0 ? (
              <>
                <div className="mt-6 overflow-hidden rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-soft">
                  <ReactECharts option={chartOption} style={{ height: 360 }} />
                </div>

                <div className="mt-6 overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-soft">
                  <table className="w-full text-sm">
                    <thead className="table-head">
                      <tr>
                        <th className="px-5 py-4 text-left font-medium">服务商</th>
                        <th className="px-5 py-4 text-right font-medium">最低 ({metricCfg.unit})</th>
                        <th className="px-5 py-4 text-right font-medium">最高 ({metricCfg.unit})</th>
                        <th className="px-5 py-4 text-right font-medium text-foreground">平均 ({metricCfg.unit})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/80">
                      {trendData.providers.map((provider, index) => {
                        const summary = getMetricSummary(provider, selectedMetric);
                        const digits = selectedMetric === "throughput" ? 2 : 0;
                        return (
                          <tr key={provider.provider_id} className="table-row">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: TREND_COLORS[index % TREND_COLORS.length] }} />
                                <div>
                                  <p className="font-medium text-foreground">{provider.provider_name}</p>
                                  <p className="text-xs text-muted-foreground">{provider.provider_slug}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-right text-foreground">{formatMetric(summary.min, digits)}</td>
                            <td className="px-5 py-4 text-right text-foreground">{formatMetric(summary.max, digits)}</td>
                            <td className="px-5 py-4 text-right font-semibold text-foreground">{formatMetric(summary.avg, digits)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-[28px] border border-dashed border-border/80 bg-secondary/45 p-12 text-center">
                <p className="text-base font-medium text-foreground">暂无趋势数据</p>
                <p className="mt-2 text-sm text-muted-foreground">如果刚触发了测评，请稍后刷新或等待自动轮询完成。</p>
              </div>
            )}
          </section>

          {Object.values(singleJobsByOffering).length > 0 ? (
            <section className="panel p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-900" />
                <h3 className="text-lg font-semibold text-foreground">管理员单测任务</h3>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {Object.entries(singleJobsByOffering)
                  .sort((left, right) => Number(left[0]) - Number(right[0]))
                  .map(([offeringId, job]) => (
                    <div key={job.job_id} className="rounded-2xl border border-border/70 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Offering {offeringId}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{job.job_id}</p>
                        </div>
                        <span className={cn("rounded-full border px-2 py-1 text-[11px] font-medium", getJobStatusTone(job.status))}>
                          {getJobStatusLabel(job.status)}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">完成</p>
                          <p className="mt-1 font-semibold text-foreground">{job.completed_offerings}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">成功</p>
                          <p className="mt-1 font-semibold text-emerald-600">{job.succeeded_offerings}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">失败</p>
                          <p className="mt-1 font-semibold text-red-600">{job.failed_offerings}</p>
                        </div>
                      </div>
                      {job.error_message ? <p className="mt-3 text-xs text-red-600">{job.error_message}</p> : null}
                    </div>
                  ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
