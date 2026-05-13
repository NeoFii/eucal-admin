import type {
  UserUsageStatItem,
  UsageAnalyticsData,
} from "@/types";

// ── Token trend ──────────────────────────────────────────

export interface TokenTrendViewModel {
  xAxis: string[];
  series: { name: string; data: number[] }[];
  hasData: boolean;
}

const TOKEN_COLORS = ["#2563eb", "#f97316", "#10b981"] as const;
const TOKEN_SERIES_NAMES = ["输入 Tokens", "输出 Tokens", "缓存 Tokens"] as const;

export { TOKEN_COLORS, TOKEN_SERIES_NAMES };

export function buildTokenTrendViewModel(
  stats: UserUsageStatItem[],
  start: string,
  end: string,
): TokenTrendViewModel {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const durationMs = endDate.getTime() - startDate.getTime();
  const isHourly = durationMs <= 48 * 60 * 60 * 1000;

  const bucketMap = new Map<string, { prompt: number; completion: number; cached: number }>();

  for (const stat of stats) {
    const d = new Date(stat.stat_hour);
    const key = isHourly
      ? `${String(d.getHours()).padStart(2, "0")}:00`
      : `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const existing = bucketMap.get(key) ?? { prompt: 0, completion: 0, cached: 0 };
    existing.prompt += stat.prompt_tokens;
    existing.completion += stat.completion_tokens;
    existing.cached += stat.cached_tokens;
    bucketMap.set(key, existing);
  }

  const xAxis = generateTimeLabelsFromWindow(startDate, endDate, isHourly);
  const promptData = xAxis.map((k) => bucketMap.get(k)?.prompt ?? 0);
  const completionData = xAxis.map((k) => bucketMap.get(k)?.completion ?? 0);
  const cachedData = xAxis.map((k) => bucketMap.get(k)?.cached ?? 0);

  return {
    xAxis,
    series: [
      { name: TOKEN_SERIES_NAMES[0], data: promptData },
      { name: TOKEN_SERIES_NAMES[1], data: completionData },
      { name: TOKEN_SERIES_NAMES[2], data: cachedData },
    ],
    hasData: stats.length > 0,
  };
}

function generateTimeLabelsFromWindow(start: Date, end: Date, isHourly: boolean): string[] {
  const labels: string[] = [];
  if (isHourly) {
    const cursor = new Date(start);
    cursor.setMinutes(0, 0, 0);
    while (cursor <= end) {
      labels.push(`${String(cursor.getHours()).padStart(2, "0")}:00`);
      cursor.setTime(cursor.getTime() + 60 * 60 * 1000);
    }
  } else {
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      labels.push(
        `${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`,
      );
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return labels;
}

export function formatTokenAxisValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

// ── Spending chart ───────────────────────────────────────

const MODEL_COLORS = [
  "#2563eb", "#f97316", "#8b5cf6", "#10b981", "#eab308",
  "#ef4444", "#06b6d4", "#ec4899",
];
const OTHER_COLOR = "#94a3b8";
const MAX_MODELS = 8;

export { MODEL_COLORS, OTHER_COLOR };

export interface SpendingModelBreakdown {
  model: string;
  requestCount: number;
  requestSharePercent: number;
  totalCost: number;
  color: string;
}

export interface SpendingChartViewModel {
  labels: string[];
  series: { model: string; color: string; data: number[] }[];
  models: SpendingModelBreakdown[];
  hasData: boolean;
}

export function buildSpendingChartViewModel(
  analytics: UsageAnalyticsData,
): SpendingChartViewModel {
  const topModels = analytics.models.slice(0, MAX_MODELS);
  const otherModels = analytics.models.slice(MAX_MODELS);
  const topModelNames = new Set(topModels.map((m) => m.effective_model));

  const models: SpendingModelBreakdown[] = topModels.map((m, i) => ({
    model: m.effective_model,
    requestCount: m.request_count,
    requestSharePercent: Math.round(m.request_share * 100),
    totalCost: m.total_cost,
    color: MODEL_COLORS[i],
  }));

  if (otherModels.length > 0) {
    models.push({
      model: "其他",
      requestCount: otherModels.reduce((s, m) => s + m.request_count, 0),
      requestSharePercent: Math.round(
        otherModels.reduce((s, m) => s + m.request_share, 0) * 100,
      ),
      totalCost: otherModels.reduce((s, m) => s + m.total_cost, 0),
      color: OTHER_COLOR,
    });
  }

  const labels = analytics.buckets.map((b) => b.label);

  const seriesMap = new Map<string, number[]>();
  for (const m of models) {
    seriesMap.set(m.model, new Array(labels.length).fill(0));
  }

  analytics.buckets.forEach((bucket, idx) => {
    for (const cost of bucket.costs) {
      const modelName = topModelNames.has(cost.effective_model)
        ? cost.effective_model
        : "其他";
      const arr = seriesMap.get(modelName);
      if (arr) arr[idx] += cost.total_cost;
    }
  });

  const series = models.map((m) => ({
    model: m.model,
    color: m.color,
    data: seriesMap.get(m.model) ?? [],
  }));

  return {
    labels,
    series,
    models,
    hasData: analytics.overview.total_requests > 0,
  };
}
