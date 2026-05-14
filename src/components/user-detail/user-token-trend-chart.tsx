"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChartCard } from "@/components/dashboard/chart-card";
import { mergeChartOption } from "@/components/dashboard/chart-theme";
import { userManagementApi } from "@/lib/api/user-management";
import {
  buildTokenTrendViewModel,
  formatTokenAxisValue,
  TOKEN_COLORS,
} from "@/lib/user-usage-analytics";
import { toShanghaiApiDateTime } from "@/lib/time";
import type { UserUsageStatItem } from "@/types";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface Props {
  uid: string;
  startTime: string;
  endTime: string;
  selectedKeyId?: number;
}

export function UserTokenTrendChart({ uid, startTime, endTime, selectedKeyId }: Props) {
  const [stats, setStats] = useState<UserUsageStatItem[]>([]);
  const [loading, setLoading] = useState(true);

  const startIso = useMemo(() => toShanghaiApiDateTime(startTime), [startTime]);
  const endIso = useMemo(() => toShanghaiApiDateTime(endTime), [endTime]);

  const loadData = useCallback(async () => {
    if (!startTime || !endTime) return;
    setLoading(true);
    try {
      const data = await userManagementApi.getUserUsageStats(uid, {
        start: startIso,
        end: endIso,
        api_key_id: selectedKeyId,
      });
      setStats(data);
    } catch {
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, [uid, startIso, endIso, selectedKeyId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const viewModel = useMemo(
    () => buildTokenTrendViewModel(stats, startIso, endIso),
    [stats, startIso, endIso],
  );

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
    <ChartCard title="Token 使用趋势" loading={loading}>
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />
    </ChartCard>
  );
}
