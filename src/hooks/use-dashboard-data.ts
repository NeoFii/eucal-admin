"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export function useDashboardData(start: string, end: string): DashboardData {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthPoint[]>([]);
  const [usageTrends, setUsageTrends] = useState<UsageTrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => ({ start, end }), [start, end]);

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

  return { summary, userGrowth, usageTrends, loading, error, refresh: fetchData };
}
