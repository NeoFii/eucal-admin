"use client";

import { useCallback, useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api/dashboard";
import type {
  DashboardSummary,
  UserGrowthPoint,
  UsageTrendsData,
} from "@/types";

interface DashboardData {
  summary: DashboardSummary | null;
  userGrowth: UserGrowthPoint[];
  usageTrends: UsageTrendsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function useDashboardData(days = 30): DashboardData {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthPoint[]>([]);
  const [usageTrends, setUsageTrends] = useState<UsageTrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const range = getDateRange(days);

    try {
      const [summaryData, growthData, trendsData] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getUserGrowth(range),
        dashboardApi.getUsageTrends(range),
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
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { summary, userGrowth, usageTrends, loading, error, refresh: fetchData };
}
