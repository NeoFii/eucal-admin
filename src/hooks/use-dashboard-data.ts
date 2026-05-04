"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dashboardApi } from "@/lib/api/dashboard";
import type {
  DashboardSummary,
  UserGrowthPoint,
  UsageTrendsData,
} from "@/types";

export type DashboardRangePreset = "7d" | "30d" | "90d" | "custom";

export interface DashboardRange {
  /** ISO 8601 格式的起始时间（含） */
  start: string;
  /** ISO 8601 格式的结束时间（不含） */
  end: string;
  preset: DashboardRangePreset;
}

interface DashboardData {
  summary: DashboardSummary | null;
  userGrowth: UserGrowthPoint[];
  usageTrends: UsageTrendsData | null;
  range: DashboardRange;
  setRange: (range: DashboardRange) => void;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** 构造预设区间：以当前时间作为 end，往前推 N 天作为 start。 */
export function buildPresetRange(preset: Exclude<DashboardRangePreset, "custom">): DashboardRange {
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    preset,
  };
}

export function useDashboardData(initialPreset: Exclude<DashboardRangePreset, "custom"> = "30d"): DashboardData {
  const [range, setRange] = useState<DashboardRange>(() => buildPresetRange(initialPreset));
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthPoint[]>([]);
  const [usageTrends, setUsageTrends] = useState<UsageTrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => ({ start: range.start, end: range.end }), [range.start, range.end]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryData, growthData, trendsData] = await Promise.all([
        dashboardApi.getSummary(params),
        dashboardApi.getUserGrowth(params),
        dashboardApi.getUsageTrends(params),
      ]);
      setSummary(summaryData);
      setUserGrowth(growthData);
      setUsageTrends(trendsData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "数据加载失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { summary, userGrowth, usageTrends, range, setRange, loading, error, refresh: fetchData };
}
