"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChartCard } from "@/components/dashboard/chart-card";
import { mergeChartOption } from "@/components/dashboard/chart-theme";
import { userManagementApi } from "@/lib/api/user-management";
import { buildSpendingChartViewModel } from "@/lib/user-usage-analytics";
import { formatYuanDetail } from "@/lib/pricing";
import { toShanghaiApiDateTime } from "@/lib/time";
import type { UsageAnalyticsData } from "@/types";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface Props {
  uid: string;
  startTime: string;
  endTime: string;
  selectedKeyId?: number;
}

export function UserSpendingChart({ uid, startTime, endTime, selectedKeyId }: Props) {
  const [analytics, setAnalytics] = useState<UsageAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!startTime || !endTime) return;
    setLoading(true);
    try {
      const data = await userManagementApi.getUserUsageAnalytics(uid, {
        start: toShanghaiApiDateTime(startTime),
        end: toShanghaiApiDateTime(endTime),
        api_key_id: selectedKeyId,
      });
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [uid, startTime, endTime, selectedKeyId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const viewModel = useMemo(
    () => analytics ? buildSpendingChartViewModel(analytics) : null,
    [analytics],
  );

  const MICRO_YUAN = 1_000_000;

  const option = useMemo(() => {
    if (!viewModel) return mergeChartOption({});
    return mergeChartOption({
      tooltip: {
        trigger: "axis",
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number; color: string }[];
          if (!Array.isArray(items) || items.length === 0) return "";
          let html = `<div style="font-weight:600;margin-bottom:4px">${(items[0] as { axisValue?: string }).axisValue ?? ""}</div>`;
          for (const item of items) {
            if (item.value > 0) {
              html += `<div style="display:flex;align-items:center;gap:6px;font-size:13px">`;
              html += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color}"></span>`;
              html += `<span>${item.seriesName}</span>`;
              html += `<span style="margin-left:auto;font-weight:500">${formatYuanDetail(item.value)}</span>`;
              html += `</div>`;
            }
          }
          return html;
        },
      },
      legend: {
        data: viewModel.series.map((s) => s.model),
        top: 4,
        right: 0,
        textStyle: { fontSize: 12 },
        type: "scroll",
      },
      xAxis: {
        type: "category",
        data: viewModel.labels,
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (v: number) => `¥${(v / MICRO_YUAN).toFixed(2)}`,
        },
      },
      series: viewModel.series.map((s) => ({
        name: s.model,
        type: "bar",
        stack: "cost",
        data: s.data,
        itemStyle: { color: s.color },
        barMaxWidth: 32,
      })),
    });
  }, [viewModel]);

  return (
    <ChartCard title="费用分布" loading={loading}>
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
    </ChartCard>
  );
}
