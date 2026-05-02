"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChartCard } from "@/components/dashboard/chart-card";
import { mergeChartOption } from "@/components/dashboard/chart-theme";
import { userManagementApi } from "@/lib/api/user-management";
import {
  buildTokenTrendViewModel,
  getTokenTrendQueryWindow,
  formatTokenAxisValue,
  TOKEN_COLORS,
  type TokenTrendRange,
} from "@/lib/user-usage-analytics";
import type { UserUsageStatItem } from "@/types";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const RANGE_TABS = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7 天" },
  { key: "30d", label: "30 天" },
];

interface Props {
  uid: string;
}

export function UserTokenTrendChart({ uid }: Props) {
  const [range, setRange] = useState<TokenTrendRange>("24h");
  const [stats, setStats] = useState<UserUsageStatItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getTokenTrendQueryWindow(range);
      const data = await userManagementApi.getUserUsageStats(uid, { start, end });
      setStats(data);
    } catch {
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, [uid, range]);

  useEffect(() => { void loadData(); }, [loadData]);

  const viewModel = useMemo(() => buildTokenTrendViewModel(stats, range), [stats, range]);

  const option = useMemo(
    () =>
      mergeChartOption({
        tooltip: {
          trigger: "axis",
          valueFormatter: (v) => formatTokenAxisValue(v as number),
        },
        legend: {
          data: viewModel.series.map((s) => s.name),
          top: 4,
          right: 0,
          textStyle: { fontSize: 12 },
        },
        xAxis: {
          type: "category",
          data: viewModel.xAxis,
          boundaryGap: false,
        },
        yAxis: {
          type: "value",
          axisLabel: { formatter: formatTokenAxisValue },
        },
        series: viewModel.series.map((s, i) => ({
          name: s.name,
          type: "line",
          data: s.data,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: TOKEN_COLORS[i] },
          itemStyle: { color: TOKEN_COLORS[i] },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${TOKEN_COLORS[i]}20` },
                { offset: 1, color: `${TOKEN_COLORS[i]}00` },
              ],
            },
          },
        })),
      }),
    [viewModel],
  );

  return (
    <ChartCard
      title="Token 使用趋势"
      tabs={RANGE_TABS}
      activeTab={range}
      onTabChange={(k) => setRange(k as TokenTrendRange)}
      loading={loading}
    >
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
    </ChartCard>
  );
}
