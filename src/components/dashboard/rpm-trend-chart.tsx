"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import { BarChart3, LineChart } from "lucide-react";
import type { RpmTrendPoint, TpmTrendPoint } from "@/types";
import { Button } from "@/components/ui/button";
import { mergeChartOption, chartColors } from "./chart-theme";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// ── Densify helpers ─────────────────────────────────────────

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
      existing ?? { bucket_start: new Date(t).toISOString(), request_count: 0, rpm: 0 },
    );
  }
  return out;
}

export function densifyTpmPoints(
  points: TpmTrendPoint[],
  start: Date,
  end: Date,
  bucketSeconds: number,
): TpmTrendPoint[] {
  const stepMs = bucketSeconds * 1000;
  const startMs = Math.floor(start.getTime() / stepMs) * stepMs;
  const endMs = end.getTime();
  const byKey = new Map<number, TpmTrendPoint>();
  for (const p of points) {
    const t = new Date(p.bucket_start).getTime();
    if (Number.isNaN(t)) continue;
    byKey.set(Math.floor(t / stepMs) * stepMs, p);
  }
  const out: TpmTrendPoint[] = [];
  for (let t = startMs; t < endMs; t += stepMs) {
    const existing = byKey.get(t);
    out.push(
      existing ?? { bucket_start: new Date(t).toISOString(), total_tokens: 0, tpm: 0 },
    );
  }
  return out;
}

// ── Shared utilities ────────────────────────────────────────

function formatBucketLabel(iso: string, bucketSeconds: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const HHmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (bucketSeconds >= 86400) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (bucketSeconds <= 7200) return HHmm;
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${HHmm}`;
}

function pickLabelInterval(count: number): number | "auto" {
  if (count <= 8) return 0;
  return Math.ceil(count / 8) - 1;
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

// ── Unified RateTrendChart ──────────────────────────────────

interface RateTrendChartProps {
  metric: "rpm" | "tpm";
  mode: "bar" | "line";
  points: RpmTrendPoint[] | TpmTrendPoint[];
  bucketSeconds: number;
  onToggleMode: () => void;
}

export function RateTrendChart({
  metric,
  mode,
  points,
  bucketSeconds,
  onToggleMode,
}: RateTrendChartProps) {
  const option = useMemo<EChartsOption>(() => {
    const labels: string[] = [];
    const values: number[] = [];
    const iso: string[] = [];
    const secondary: number[] = [];

    for (const p of points) {
      labels.push(formatBucketLabel(p.bucket_start, bucketSeconds));
      iso.push(p.bucket_start);
      if (metric === "rpm") {
        const rp = p as RpmTrendPoint;
        values.push(Number(rp.rpm) || 0);
        secondary.push(Number(rp.request_count) || 0);
      } else {
        const tp = p as TpmTrendPoint;
        values.push(Number(tp.tpm) || 0);
        secondary.push(Number(tp.total_tokens) || 0);
      }
    }

    const color = metric === "rpm" ? chartColors[1] : chartColors[3] ?? chartColors[0];
    const minutes = bucketSeconds / 60;
    const showSymbol = labels.length <= 50;

    const formatter = (params: unknown) => {
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
        : `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const val = first.value as number;
      const sec = secondary[idx] ?? 0;
      if (metric === "rpm") {
        return `<div style="font-weight:500;margin-bottom:4px;">${head}</div>
<div>RPM：<b style="color:${color}">${val.toFixed(2)}</b></div>
<div style="color:#6b7280;font-size:12px;margin-top:2px;">桶宽 ${minutes} 分钟 · 请求 ${sec.toLocaleString()} 次</div>`;
      }
      return `<div style="font-weight:500;margin-bottom:4px;">${head}</div>
<div>TPM：<b style="color:${color}">${val.toFixed(2)}</b></div>
<div style="color:#6b7280;font-size:12px;margin-top:2px;">桶宽 ${minutes} 分钟 · Tokens ${sec.toLocaleString()}</div>`;
    };

    const series =
      mode === "bar"
        ? [
            {
              name: metric.toUpperCase(),
              type: "bar" as const,
              data: values,
              itemStyle: { color, borderRadius: [4, 4, 0, 0] },
              barMaxWidth: 24,
            },
          ]
        : [
            {
              name: metric.toUpperCase(),
              type: "line" as const,
              data: values,
              smooth: true,
              showSymbol,
              symbol: "circle",
              symbolSize: 5,
              itemStyle: { color },
              lineStyle: { width: 2.5, color },
              areaStyle: {
                color: {
                  type: "linear" as const,
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: `${color}33` },
                    { offset: 1, color: "rgba(255,255,255,0)" },
                  ],
                },
              },
            },
          ];

    return mergeChartOption({
      tooltip: {
        ...TOOLTIP_BASE,
        ...(mode === "bar" ? { axisPointer: { type: "shadow" } } : {}),
        formatter,
      },
      grid: { top: 30, right: 16, bottom: 30, left: 16, containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        boundaryGap: mode === "bar",
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
      series,
    });
  }, [points, bucketSeconds, metric, mode]);

  return (
    <div className="relative h-full">
      <div className="absolute right-0 top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleMode}
          title={mode === "bar" ? "切换折线图" : "切换柱状图"}
        >
          {mode === "bar" ? (
            <LineChart className="h-4 w-4" />
          ) : (
            <BarChart3 className="h-4 w-4" />
          )}
        </Button>
      </div>
      <ReactECharts option={option} style={{ height: "100%" }} notMerge />
    </div>
  );
}

// ── Legacy exports (kept for backwards compat if needed elsewhere) ──

interface LegacyProps {
  points: RpmTrendPoint[];
  bucketSeconds: number;
}

export function RpmBarChart({ points, bucketSeconds }: LegacyProps) {
  return (
    <RateTrendChart
      metric="rpm"
      mode="bar"
      points={points}
      bucketSeconds={bucketSeconds}
      onToggleMode={() => {}}
    />
  );
}

export function RpmLineChart({ points, bucketSeconds }: LegacyProps) {
  return (
    <RateTrendChart
      metric="rpm"
      mode="line"
      points={points}
      bucketSeconds={bucketSeconds}
      onToggleMode={() => {}}
    />
  );
}
