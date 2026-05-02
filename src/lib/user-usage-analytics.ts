import type {
  UserUsageStatItem,
  UsageAnalyticsData,
  UsageAnalyticsRange,
} from "@/types";

// ── Token trend ──────────────────────────────────────────

export type TokenTrendRange = "24h" | "7d" | "30d";

export interface TokenTrendViewModel {
  xAxis: string[];
  series: { name: string; data: number[] }[];
  hasData: boolean;
}

const TOKEN_COLORS = ["#2563eb", "#f97316", "#10b981"] as const;
const TOKEN_SERIES_NAMES = ["输入 Tokens", "输出 Tokens", "缓存 Tokens"] as const;

export { TOKEN_COLORS, TOKEN_SERIES_NAMES };

export function getTokenTrendQueryWindow(range: TokenTrendRange): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;
  if (range === "24h") {
    start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (range === "7d") {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export function buildTokenTrendViewModel(
  stats: UserUsageStatItem[],
  range: TokenTrendRange,
): TokenTrendViewModel {
  const bucketMap = new Map<string, { prompt: number; completion: number; cached: number }>();

  for (const stat of stats) {
    const d = new Date(stat.stat_hour);
    const key = range === "24h"
      ? `${String(d.getHours()).padStart(2, "0")}:00`
      : `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const existing = bucketMap.get(key) ?? { prompt: 0, completion: 0, cached: 0 };
    existing.prompt += stat.prompt_tokens;
    existing.completion += stat.completion_tokens;
    existing.cached += stat.cached_tokens;
    bucketMap.set(key, existing);
  }

  const xAxis = generateTimeLabels(range);
  const promptData = xAxis.map((k) => bucketMap.get(k)?.prompt ?? 0);
  const completionData = xAxis.map((k) => bucketMap.get(k)?.completion ?? 0);
  const cachedData = xAxis.map((k) => bucketMap.get(k)?.cached ?? 0);

  const hasData = stats.length > 0;

  return {
    xAxis,
    series: [
      { name: TOKEN_SERIES_NAMES[0], data: promptData },
      { name: TOKEN_SERIES_NAMES[1], data: completionData },
      { name: TOKEN_SERIES_NAMES[2], data: cachedData },
    ],
    hasData,
  };
}

function generateTimeLabels(range: TokenTrendRange): string[] {
  const labels: string[] = [];
  const now = new Date();

  if (range === "24h") {
    const startHour = new Date(now.getTime() - 23 * 60 * 60 * 1000);
    startHour.setMinutes(0, 0, 0);
    for (let i = 0; i < 24; i++) {
      const d = new Date(startHour.getTime() + i * 60 * 60 * 1000);
      labels.push(`${String(d.getHours()).padStart(2, "0")}:00`);
    }
  } else {
    const days = range === "7d" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      labels.push(
        `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      );
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
  "#111827", "#6366f1", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899",
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
