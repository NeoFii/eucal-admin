"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import { mergeChartOption, chartColors } from "@/components/dashboard/chart-theme";
import type {
  ModelBucket,
  ProviderLatency,
  ScoreBucket,
  TimeBucket,
} from "@/types";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });


export function SuccessRateChart({ data }: { data: TimeBucket[] }) {
  const { labels, successRates, errorRates } = useMemo(() => {
    const ls: string[] = [];
    const sr: number[] = [];
    const er: number[] = [];
    const interval = data.length >= 2 ? data[1].timestamp - data[0].timestamp : 0;
    for (const b of data) {
      const d = new Date(b.timestamp * 1000);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const MM = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      if (interval >= 86400) {
        ls.push(`${MM}-${dd}`);
      } else if (interval >= 3600) {
        ls.push(`${MM}-${dd} ${hh}:00`);
      } else {
        ls.push(`${hh}:${mm}`);
      }
      const total = b.total || 1;
      sr.push(+((b.success / total) * 100).toFixed(1));
      er.push(+((b.error / total) * 100).toFixed(1));
    }
    return { labels: ls, successRates: sr, errorRates: er };
  }, [data]);

  const option = useMemo<EChartsOption>(
    () =>
      mergeChartOption({
        tooltip: {
          trigger: "axis",
          formatter: (params: unknown) => {
            const arr = params as Array<{ name: string; value: number; seriesName: string; marker: string }>;
            return `<b>${arr[0]?.name}</b><br/>${arr.map((p) => `${p.marker} ${p.seriesName}: ${p.value}%`).join("<br/>")}`;
          },
        },
        grid: { top: 24, right: 16, bottom: 24, left: 16, containLabel: true },
        legend: { show: true, bottom: 0, textStyle: { color: "#6b7280", fontSize: 12 } },
        xAxis: {
          type: "category",
          data: labels,
          boundaryGap: false,
        },
        yAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
        series: [
          {
            name: "成功率",
            type: "line",
            smooth: true,
            symbol: "none",
            lineStyle: { color: "#10b981", width: 2 },
            areaStyle: { color: "rgba(16,185,129,0.08)" },
            data: successRates,
          },
          {
            name: "失败率",
            type: "line",
            smooth: true,
            symbol: "none",
            lineStyle: { color: "#ef4444", width: 2 },
            areaStyle: { color: "rgba(239,68,68,0.08)" },
            data: errorRates,
          },
        ],
      }),
    [labels, successRates, errorRates],
  );

  return <ReactECharts option={option} style={{ height: 280 }} />;
}

export function ModelShareChart({ data }: { data: ModelBucket[] }) {
  const items = data.slice(0, 10);
  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: "item",
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: { color: "#111827", fontSize: 13 },
        extraCssText:
          "box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px; padding: 10px 14px;",
        formatter: (p: unknown) => {
          const item = p as { name: string; value: number; percent: number };
          return `${item.name}<br/>${item.value} 次（${item.percent}%）`;
        },
      },
      legend: { show: false },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
          label: { show: true, fontSize: 12, color: "#6b7280" },
          data: items.map((m, i) => ({
            name: m.selected_model,
            value: m.count,
            itemStyle: { color: chartColors[i % chartColors.length] },
          })),
        },
      ],
      color: chartColors,
    }),
    [items],
  );
  return <ReactECharts option={option} style={{ height: 280 }} />;
}

export function ScoreHistogramChart({ data }: { data: ScoreBucket[] }) {
  const buckets = useMemo(() => {
    // Backend returns `floor` 0-9 (10 clamped to 9); collapse same-floor and fill gaps.
    const map = new Map<number, number>();
    for (const b of data) map.set(b.floor, (map.get(b.floor) ?? 0) + b.count);
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((floor) => ({
      label: `${floor}-${floor + 1}`,
      count: map.get(floor) ?? 0,
    }));
  }, [data]);

  const option = useMemo<EChartsOption>(
    () =>
      mergeChartOption({
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { top: 16, right: 16, bottom: 24, left: 16, containLabel: true },
        xAxis: {
          type: "category",
          data: buckets.map((b) => b.label),
          axisLabel: { color: "#9ca3af", fontSize: 11 },
        },
        yAxis: { type: "value" },
        series: [
          {
            type: "bar",
            data: buckets.map((b, i) => ({
              value: b.count,
              itemStyle: {
                color: chartColors[i % chartColors.length],
                borderRadius: [4, 4, 0, 0],
              },
            })),
            barMaxWidth: 36,
          },
        ],
      }),
    [buckets],
  );
  return <ReactECharts option={option} style={{ height: 280 }} />;
}

export function ProviderLatencyTable({ data }: { data: ProviderLatency[] }) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center py-12 text-sm text-muted-foreground">
        当前时间范围内无上游调用数据
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="table-head border-b border-border">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Provider</th>
            <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider">样本数</th>
            <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider">P50 (ms)</th>
            <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider">P95 (ms)</th>
            <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider">P99 (ms)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((p) => (
            <tr key={p.provider_slug} className="table-row">
              <td className="px-4 py-2 font-medium text-foreground">{p.provider_slug}</td>
              <td className="px-4 py-2 text-right text-muted-foreground">{p.count}</td>
              <td className="px-4 py-2 text-right">{p.p50_ms ?? "—"}</td>
              <td className="px-4 py-2 text-right">{p.p95_ms ?? "—"}</td>
              <td className="px-4 py-2 text-right">{p.p99_ms ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
