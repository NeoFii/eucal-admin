"use client";

import BenchmarkPageClient from "@/components/benchmark/benchmark-page-client";

export default function BenchmarkPage() {
  return <BenchmarkPageClient />;
}

/*

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center">
      <LoadingSpinner text="正在加载趋势图..." />
    </div>
  ),
});

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const TREND_COLORS = [
  "#F97316",
  "#0EA5E9",
  "#10B981",
  "#6366F1",
  "#EF4444",
  "#D97706",
  "#14B8A6",
  "#8B5CF6",
];

const SAMPLE_WINDOW = 5;
const POLL_INTERVAL_MS = 10_000;
const POLL_DURATION_MS = 120_000;

type TrendMetric = "throughput" | "ttft" | "e2e";
type TrendPoint = ProviderTrendLine["data_points"][number];
type BenchmarkOfferingCardData = ModelOfferingResponse & {
  metrics?: OfferingMetricsResponse | null;
  latest_probe?: LatestProbeResult | null;
  manual_probe?: AdminProbeAudit | null;
};
type TooltipParam = {
  axisValueLabel?: string;
  color?: unknown;
  seriesName?: string;
  value?: number | string | (number | string | null)[] | null;
};

const METRIC_CONFIG: Record<
  TrendMetric,
  {
    label: string;
    unit: string;
    dataKey: keyof TrendPoint;
  }
> = {
  throughput: { label: "吞吐", unit: "tokens/s", dataKey: "avg_throughput_tps" },
  ttft: { label: "首字延迟", unit: "ms", dataKey: "avg_ttft_ms" },
  e2e: { label: "E2E 延迟", unit: "ms", dataKey: "avg_e2e_latency_ms" },
};

const formatMetric = (value?: number | null, digits = 1) => {
  if (value == null) return "-";
  return value.toFixed(digits);
};

const formatDateTime = (value?: string) => {
  if (!value) return "暂无";
  return new Date(value).toLocaleString("zh-CN");
};

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

const sortModelsByOfferings = (items: BenchmarkModelSummary[]) =>
  [...items].sort((left, right) => {
    const offeringDelta = right.offerings.length - left.offerings.length;
    if (offeringDelta !== 0) return offeringDelta;
    return left.model_name.localeCompare(right.model_name, "zh-CN");
  });

const getDefaultModelSlug = (items: BenchmarkModelSummary[]) => sortModelsByOfferings(items)[0]?.model_slug ?? "";

function OfferingMetricCard({
  offering,
  index,
}: {
  offering: BenchmarkOfferingCardData;
  index: number;
}) {
  const metrics = offering.metrics;
  const hasMetrics = !!metrics && metrics.sample_count > 0;
  const latestProbe = offering.latest_probe;
  const accentColor = TREND_COLORS[index % TREND_COLORS.length];

  return (
    <div className="card-hover relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-5 shadow-soft">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
        style={{ background: `linear-gradient(90deg, ${accentColor}, rgba(255,255,255,0))` }}
      />
      <div className="flex items-start justify-between gap-4">
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
            <h3 className="text-base font-semibold text-foreground">{offering.provider.name}</h3>
            <p className="text-xs text-muted-foreground">{offering.provider_model_name || offering.provider.slug}</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
          {offering.is_active ? "启用中" : "已停用"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-orange-50/70 p-3">
          <p className="text-xs text-muted-foreground">输入价格 / 1M</p>
          <p className="mt-1 font-semibold text-foreground">
            {offering.price_input_per_m != null ? `￥${offering.price_input_per_m}` : "-"}
          </p>
        </div>
        <div className="rounded-2xl bg-sky-50/65 p-3">
          <p className="text-xs text-muted-foreground">输出价格 / 1M</p>
          <p className="mt-1 font-semibold text-foreground">
            {offering.price_output_per_m != null ? `￥${offering.price_output_per_m}` : "-"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-4">
        {hasMetrics ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">首字延迟</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatMetric(metrics.avg_ttft_ms, 0)} ms</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E2E 延迟</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatMetric(metrics.avg_e2e_latency_ms, 0)} ms</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">吞吐</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatMetric(metrics.avg_throughput_tps, 2)} t/s</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">样本数</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{metrics.sample_count}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              最近 {metrics.sample_count} 次成功探测均值
              {metrics.probe_region ? ` · ${metrics.probe_region}` : ""}
              {" · "}
              最近更新时间 {formatDateTime(metrics.last_measured_at)}
            </p>
          </>
        ) : (
          <div className={cn(
            "rounded-2xl px-4 py-4 text-sm",
            latestProbe?.success === false
              ? "border border-red-200 bg-red-50/80 text-red-700"
              : "bg-secondary/50 text-muted-foreground"
          )}>
            <div className="flex items-start gap-3">
              <TimerReset className={cn("mt-0.5 h-4 w-4", latestProbe?.success === false ? "text-red-500" : "text-primary")} />
              <div>
                <p className="font-medium">
                  {latestProbe?.success === false ? "最近一次评测失败" : "暂无有效评测结果"}
                </p>
                <p className="mt-1 text-xs">
                  {latestProbe?.success === false
                    ? `${latestProbe.error_code || "unknown"} · ${formatDateTime(latestProbe.measured_at)}${latestProbe.probe_region ? ` · ${latestProbe.probe_region}` : ""}`
                    : "触发探测后会在这里展示成功指标或失败原因。"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
*/

/*
export default function BenchmarkPage() {
  const [summaryItems, setSummaryItems] = useState<BenchmarkModelSummary[]>([]);
  const [selectedModelSlug, setSelectedModelSlug] = useState("");
  const [selectedDays, setSelectedDays] = useState(7);
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>("throughput");
  const [modelDetail, setModelDetail] = useState<ModelDetail | null>(null);
  const [trendData, setTrendData] = useState<BenchmarkTrendResponse | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [summaryRefreshing, setSummaryRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [polling, setPolling] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollDeadlineRef = useRef<number | null>(null);
  const selectedModelSlugRef = useRef("");
  const selectedDaysRef = useRef(7);

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
    }));
  }, [modelDetail, selectedSummaryModel]);

  const activeOfferings = useMemo(
    () => mergedOfferings.filter((offering) => offering.is_active),
    [mergedOfferings]
  );

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
    setPolling(false);
  }, []);

  const loadSummary = useCallback(
    async (silent = false) => {
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
        console.error("加载评测汇总失败:", error);
        setSummaryError("评测汇总加载失败，请检查 testing 服务连接。");
      } finally {
        if (!silent) {
          setSummaryRefreshing(false);
        }
      }
    },
    []
  );

  const loadSelectedModelData = useCallback(
    async (slug: string, days: number, silent = false) => {
      if (!slug) {
        setModelDetail(null);
        setTrendData(null);
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
        setModelDetail(detail);
        setTrendData(trend);
      } catch (error) {
        console.error("加载模型评测详情失败:", error);
        if (!silent) {
          toast.error("评测数据加载失败", "请稍后刷新重试。");
        }
      } finally {
        if (!silent) {
          setDetailLoading(false);
        }
      }
    },
    []
  );

  const refreshAllData = useCallback(
    async (silent = false) => {
      await loadSummary(silent);
      if (selectedModelSlugRef.current) {
        await loadSelectedModelData(selectedModelSlugRef.current, selectedDaysRef.current, silent);
      }
    },
    [loadSelectedModelData, loadSummary]
  );

  const startPolling = useCallback(async () => {
    stopPolling();
    setPolling(true);
    pollDeadlineRef.current = Date.now() + POLL_DURATION_MS;
    await refreshAllData(true);

    pollTimerRef.current = setInterval(() => {
      const deadline = pollDeadlineRef.current;
      if (!deadline || Date.now() >= deadline) {
        stopPolling();
        return;
      }
      void refreshAllData(true);
    }, POLL_INTERVAL_MS);
  }, [refreshAllData, stopPolling]);

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
      return;
    }

    void loadSelectedModelData(selectedModelSlug, selectedDays, false);
  }, [loadSelectedModelData, selectedDays, selectedModelSlug]);

  const handleRefresh = async () => {
    await refreshAllData(false);
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const message = await testingApi.triggerBenchmarkAll();
      toast.success("评测任务已提交", message || "任务已受理，页面会自动轮询最新结果。");
      await startPolling();
    } catch (error) {
      console.error("触发全量评测失败:", error);
      toast.error("触发失败", "请检查管理员登录态和 testing 服务状态。");
    } finally {
      setTriggering(false);
    }
  };

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
        backgroundColor: "#fff",
        borderColor: "#F3E8D8",
        borderWidth: 1,
        textStyle: { color: "#1f2937" },
        formatter: (params: unknown) => {
          const items = (Array.isArray(params) ? params : [params]) as TooltipParam[];
          const header = items[0]?.axisValueLabel ? `<div style="font-weight:600;margin-bottom:8px">${items[0].axisValueLabel}</div>` : "";
          const rows = items
            .filter((item) => Array.isArray(item.value) || item.value != null)
            .map((item) => {
              const value = Array.isArray(item.value) ? item.value[1] : item.value;
              const color = typeof item.color === "string" ? item.color : "#F97316";
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
        textStyle: { color: "#6b7280", fontSize: 12 },
      },
      grid: { top: 28, left: 18, right: 18, bottom: 70, containLabel: true },
      xAxis: {
        type: "time",
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#F3E8D8" } },
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
        <LoadingSpinner text="正在加载评测页面..." />
      </div>
    );
  }

  return (
    <div className="page-stack max-w-7xl">
      <section className="panel relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-12 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-orange-300/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              管理端性能评测
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">统一触发评测并观察模型性能走势</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              主按钮会调用 testing 服务的全量探测接口。任务提交后页面会自动轮询 2 分钟，用最新样本刷新汇总、指标卡和趋势图。
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleTrigger} disabled={triggering} className="min-w-[178px]">
              <Activity className={cn("mr-2 h-4 w-4", triggering && "animate-pulse")} />
              {triggering ? "提交中..." : "手动触发全量评测"}
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={summaryRefreshing || detailLoading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", (summaryRefreshing || detailLoading) && "animate-spin")} />
              刷新数据
            </Button>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>样本窗口：最近 {SAMPLE_WINDOW} 次成功探测</span>
          <span>最近汇总更新时间：{formatDateTime(latestMeasuredAt)}</span>
          <span className={cn("rounded-full px-2 py-1", polling ? "bg-primary/10 text-primary" : "bg-secondary/80")}>
            {polling ? "自动轮询中" : "未轮询"}
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-orange-100 p-3 text-primary">
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
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-600">
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
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">样本窗口</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{SAMPLE_WINDOW}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">模型视角评测</h2>
            <p className="mt-1 text-sm text-muted-foreground">默认选中当前接入服务商最多的模型，并展示该模型在各服务商下的指标概览和时间序列趋势。</p>
          </div>

          <div className="w-full lg:max-w-sm">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">选择模型</label>
            <select
              className="h-11 w-full rounded-2xl border border-input/90 bg-white/90 px-4 text-sm shadow-sm outline-none transition focus:ring-4 focus:ring-primary/10"
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
          <p className="text-base font-medium text-destructive">评测汇总加载失败</p>
          <p className="mt-2 text-sm text-muted-foreground">{summaryError}</p>
        </section>
      ) : null}

      {!summaryError && summaryItems.length === 0 ? (
        <section className="panel p-12 text-center">
          <p className="text-lg font-medium text-foreground">暂无评测对象</p>
          <p className="mt-2 text-sm text-muted-foreground">请先在模型管理中配置模型、服务商和报价，再返回这里触发评测。</p>
        </section>
      ) : null}

      {!summaryError && summaryItems.length > 0 && detailLoading ? (
        <section className="panel">
          <LoadingSpinner text="正在加载模型评测详情..." />
        </section>
      ) : null}

      {!summaryError && summaryItems.length > 0 && !detailLoading && modelDetail ? (
        <>
          <section className="page-stack">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">服务商指标卡</h3>
              <p className="text-sm text-muted-foreground">优先展示汇总接口中的最近 {SAMPLE_WINDOW} 次成功探测均值。</p>
            </div>

            {activeOfferings.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {activeOfferings.map((offering, index) => (
                  <OfferingMetricCard key={offering.id} offering={offering} index={index} />
                ))}
              </div>
            ) : (
              <div className="panel p-12 text-center">
                <p className="text-base font-medium text-foreground">该模型暂无活跃报价</p>
                <p className="mt-2 text-sm text-muted-foreground">请先在模型详情中添加服务商报价，再触发评测。</p>
              </div>
            )}
          </section>

          <section className="panel p-6 md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">趋势可视化</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {trendData?.date_range ? `原始测点时间序列 · ${trendData.date_range}` : "按探测时间顺序展示各服务商性能变化趋势"}
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
                        <th className="px-5 py-4 text-right font-medium text-primary">平均 ({metricCfg.unit})</th>
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
                                <span
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: TREND_COLORS[index % TREND_COLORS.length] }}
                                />
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
                <p className="mt-2 text-sm text-muted-foreground">如果刚触发了评测，请稍后刷新或等待自动轮询完成。</p>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
*/
