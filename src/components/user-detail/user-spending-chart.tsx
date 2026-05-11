"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChartCard } from "@/components/dashboard/chart-card";
import { mergeChartOption } from "@/components/dashboard/chart-theme";
import { userManagementApi } from "@/lib/api/user-management";
import { buildSpendingChartViewModel } from "@/lib/user-usage-analytics";
import { formatYuanDetail } from "@/lib/pricing";
import type { UsageAnalyticsData, UsageAnalyticsRange, UserApiKeyItem } from "@/types";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const RANGE_TABS = [
  { key: "8h", label: "8h" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7 天" },
  { key: "30d", label: "30 天" },
  { key: "custom", label: "自定义" },
];

interface Props {
  uid: string;
  apiKeys?: UserApiKeyItem[];
}

export function UserSpendingChart({ uid, apiKeys = [] }: Props) {
  const [range, setRange] = useState<UsageAnalyticsRange | "custom">("24h");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedKeyId, setSelectedKeyId] = useState<number | undefined>(undefined);
  const [analytics, setAnalytics] = useState<UsageAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (range === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);
    try {
      const params: Parameters<typeof userManagementApi.getUserUsageAnalytics>[1] = {};
      if (range === "custom") {
        params.start = new Date(customStart).toISOString();
        params.end = new Date(customEnd).toISOString();
      } else {
        params.range = range;
      }
      if (selectedKeyId) params.api_key_id = selectedKeyId;
      const data = await userManagementApi.getUserUsageAnalytics(uid, params);
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [uid, range, customStart, customEnd, selectedKeyId]);

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
    <ChartCard
      title="费用分布"
      tabs={RANGE_TABS}
      activeTab={range}
      onTabChange={(k) => setRange(k as UsageAnalyticsRange | "custom")}
      loading={loading}
    >
      <div className="flex flex-col h-full">
        {(range === "custom" || apiKeys.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 px-1 pb-2">
            {range === "custom" && (
              <>
                <input
                  type="datetime-local"
                  className="h-7 rounded-md border border-gray-200 px-2 text-xs"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">至</span>
                <input
                  type="datetime-local"
                  className="h-7 rounded-md border border-gray-200 px-2 text-xs"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </>
            )}
            {apiKeys.length > 0 && (
              <select
                className="h-7 rounded-md border border-gray-200 px-2 text-xs"
                value={selectedKeyId ?? ""}
                onChange={(e) => setSelectedKeyId(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">全部 Key</option>
                {apiKeys.map((k) => (
                  <option key={k.id} value={k.id}>{k.name} ({k.key_prefix}...)</option>
                ))}
              </select>
            )}
          </div>
        )}
        <div className="flex-1 min-h-0">
          <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
        </div>
      </div>
    </ChartCard>
  );
}
