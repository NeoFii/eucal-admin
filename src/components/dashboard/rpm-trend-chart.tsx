"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { RpmTrendPoint } from "@/types";
import { mergeChartOption, chartColors } from "./chart-theme";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface Props {
  points: RpmTrendPoint[];
  bucketSeconds: number;
}

/** Fill missing buckets with zeros so the time axis stays continuous.
 *
 *  The backend only returns buckets that have at least one row. For a chart,
 *  gaps need explicit zero samples or the bar/line will skip over quiet
 *  windows and mislead the operator about traffic shape.
 */
export function densifyRpmPoints(
  points: RpmTrendPoint[],
  start: Date,
  end: Date,
  bucketSeconds: number,
): RpmTrendPoint[] {
  const stepMs = bucketSeconds * 1000;
  const startMs = Math.floor(start.getTime() / stepMs) * stepMs;
  const endMs = end.getTime();
  const byKey = new Map<number, RpmTrendPoint>();
  for (const p of points) {
    const t = new Date(p.bucket_start).getTime();
    if (Number.isNaN(t)) continue;
    byKey.set(Math.floor(t / stepMs) * stepMs, p);
  }
  const out: RpmTrendPoint[] = [];
  for (let t = startMs; t < endMs; t += stepMs) {
    const existing = byKey.get(t);
    out.push(
      existing ?? {
        bucket_start: new Date(t).toISOString(),
        request_count: 0,
        rpm: 0,
      },
    );
  }
  return out;
}

function formatBucketLabel(iso: string, bucketSeconds: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const HHmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (bucketSeconds >= 86400) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (bucketSeconds <= 7200) return HHmm;
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${HHmm}`;
}

function buildAxisData(
  points: RpmTrendPoint[],
  bucketSeconds: number,
): { labels: string[]; rpm: number[]; counts: number[]; iso: string[] } {
  const labels: string[] = [];
  const rpm: number[] = [];
  const counts: number[] = [];
  const iso: string[] = [];
  for (const p of points) {
    labels.push(formatBucketLabel(p.bucket_start, bucketSeconds));
    rpm.push(Number(p.rpm) || 0);
    counts.push(Number(p.request_count) || 0);
    iso.push(p.bucket_start);
  }
  return { labels, rpm, counts, iso };
}

const TOOLTIP_BASE = {
  trigger: "axis" as const,
  backgroundColor: "#fff",
  borderColor: "#e5e7eb",
  borderWidth: 1,
  textStyle: { color: "#111827", fontSize: 13 },
  extraCssText:
    "box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px; padding: 10px 14px;",
};

function makeTooltipFormatter(
  iso: string[],
  counts: number[],
  bucketSeconds: number,
) {
  return (params: unknown) => {
    const arr = Array.isArray(params) ? params : [params];
    if (arr.length === 0) return "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const first = arr[0] as any;
    const idx = first.dataIndex as number;
    const ts = iso[idx];
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const head = Number.isNaN(d.getTime())
      ? ts
      : `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(
          d.getHours(),
        )}:${pad(d.getMinutes())}`;
    const rpmVal = first.value as number;
    const reqCount = counts[idx] ?? 0;
    const minutes = bucketSeconds / 60;
    return `<div style="font-weight:500;margin-bottom:4px;">${head}</div>
<div>RPM：<b style="color:${chartColors[1]}">${rpmVal.toFixed(2)}</b></div>
<div style="color:#6b7280;font-size:12px;margin-top:2px;">桶宽 ${minutes} 分钟 · 请求 ${reqCount.toLocaleString()} 次</div>`;
  };
}

/** Compute a sane x-axis label interval so the labels don't overlap when there
 *  are many buckets. ECharts accepts `interval: 'auto' | number`. We pick a
 *  number derived from the point count so the label density caps near ~12.
 */
function pickLabelInterval(count: number): number | "auto" {
  if (count <= 12) return 0; // show every label
  return Math.max(0, Math.floor(count / 12) - 1);
}

export function RpmBarChart({ points, bucketSeconds }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const { labels, rpm, counts, iso } = buildAxisData(points, bucketSeconds);
    return mergeChartOption({
      tooltip: {
        ...TOOLTIP_BASE,
        axisPointer: { type: "shadow" },
        formatter: makeTooltipFormatter(iso, counts, bucketSeconds),
      },
      grid: { top: 30, right: 16, bottom: 30, left: 16, containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#9ca3af",
          fontSize: 11,
          interval: pickLabelInterval(labels.length),
        },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#f3f4f6" } },
        axisLabel: { color: "#9ca3af", fontSize: 12 },
      },
      series: [
        {
          name: "RPM",
          type: "bar",
          data: rpm,
          itemStyle: {
            color: chartColors[1],
            borderRadius: [4, 4, 0, 0],
          },
          barMaxWidth: 24,
        },
      ],
    });
  }, [points, bucketSeconds]);
  return <ReactECharts option={option} style={{ height: "100%" }} notMerge />;
}

export function RpmLineChart({ points, bucketSeconds }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const { labels, rpm, counts, iso } = buildAxisData(points, bucketSeconds);
    const showSymbol = labels.length <= 50;
    return mergeChartOption({
      tooltip: {
        ...TOOLTIP_BASE,
        formatter: makeTooltipFormatter(iso, counts, bucketSeconds),
      },
      grid: { top: 30, right: 16, bottom: 30, left: 16, containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#9ca3af",
          fontSize: 11,
          interval: pickLabelInterval(labels.length),
        },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#f3f4f6" } },
        axisLabel: { color: "#9ca3af", fontSize: 12 },
      },
      series: [
        {
          name: "RPM",
          type: "line",
          data: rpm,
          smooth: true,
          showSymbol,
          symbol: "circle",
          symbolSize: 5,
          itemStyle: { color: chartColors[2] },
          lineStyle: { width: 2.5, color: chartColors[2] },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(139,92,246,0.20)" },
                { offset: 1, color: "rgba(255,255,255,0)" },
              ],
            },
          },
        },
      ],
    });
  }, [points, bucketSeconds]);
  return <ReactECharts option={option} style={{ height: "100%" }} notMerge />;
}
