"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { DailyUsageTrend, ModelCallStat } from "@/types";
import { mergeChartOption, chartColors } from "./chart-theme";
import { Button } from "@/components/ui/button";
import { BarChart3, PieChart } from "lucide-react";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface Props {
  daily: DailyUsageTrend[];
  byModel: ModelCallStat[];
  activeTab: string;
}

function TrendChart({ daily }: { daily: DailyUsageTrend[] }) {
  const items = daily ?? [];
  const option = useMemo<EChartsOption>(
    () =>
      mergeChartOption({
        tooltip: {
          trigger: "axis",
          backgroundColor: "#fff",
          borderColor: "#e5e7eb",
          borderWidth: 1,
          textStyle: { color: "#111827", fontSize: 13 },
          extraCssText:
            "box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px; padding: 10px 14px;",
        },
        xAxis: {
          type: "category",
          data: items.map((d) => d.date),
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          axisTick: { show: false },
          axisLabel: { color: "#9ca3af", fontSize: 12 },
        },
        yAxis: {
          type: "value",
          splitLine: { lineStyle: { color: "#f3f4f6" } },
          axisLabel: { color: "#9ca3af", fontSize: 12 },
        },
        series: [
          {
            name: "调用次数",
            type: "line",
            data: items.map((d) => d.request_count),
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            itemStyle: { color: chartColors[1] },
            lineStyle: { width: 2.5 },
            areaStyle: {
              color: {
                type: "linear",
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(249,115,22,0.15)" },
                  { offset: 1, color: "rgba(255,255,255,0)" },
                ],
              },
            },
          },
        ],
      }),
    [items],
  );
  return <ReactECharts option={option} style={{ height: "100%" }} />;
}

function ModelChart({ byModel }: { byModel: ModelCallStat[] }) {
  const [showPie, setShowPie] = useState(false);
  const items = byModel ?? [];
  const top10 = items.slice(0, 10);

  const barOption = useMemo<EChartsOption>(
    () =>
      mergeChartOption({
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: "#fff",
          borderColor: "#e5e7eb",
          borderWidth: 1,
          textStyle: { color: "#111827", fontSize: 13 },
          extraCssText:
            "box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px; padding: 10px 14px;",
        },
        grid: { top: 40, right: 16, bottom: 60, left: 16, containLabel: true },
        xAxis: {
          type: "category",
          data: top10.map((m) => m.model),
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          axisTick: { show: false },
          axisLabel: { color: "#9ca3af", fontSize: 11, rotate: 30 },
        },
        yAxis: {
          type: "value",
          splitLine: { lineStyle: { color: "#f3f4f6" } },
          axisLabel: { color: "#9ca3af", fontSize: 12 },
        },
        series: [
          {
            name: "调用次数",
            type: "bar",
            data: top10.map((m, i) => ({
              value: m.request_count,
              itemStyle: { color: chartColors[i % chartColors.length], borderRadius: [4, 4, 0, 0] },
            })),
            barMaxWidth: 36,
          },
        ],
      }),
    [top10],
  );

  const pieOption = useMemo<EChartsOption>(() => {
    const total = items.reduce((s, m) => s + m.request_count, 0);
    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: { color: "#111827", fontSize: 13 },
        extraCssText:
          "box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px; padding: 10px 14px;",
        formatter: (p: any) =>
          `${p.name}<br/>调用 ${p.value.toLocaleString()} 次 (${p.percent}%)`,
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
          data: top10.map((m, i) => ({
            name: m.model,
            value: m.request_count,
            itemStyle: { color: chartColors[i % chartColors.length] },
          })),
        },
      ],
      color: chartColors,
    };
  }, [top10, items]);

  return (
    <div className="relative h-full">
      <div className="absolute right-0 top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowPie(!showPie)}
          title={showPie ? "切换柱状图" : "切换环形图"}
        >
          {showPie ? <BarChart3 className="h-4 w-4" /> : <PieChart className="h-4 w-4" />}
        </Button>
      </div>
      <ReactECharts option={showPie ? pieOption : barOption} style={{ height: "100%" }} notMerge />
    </div>
  );
}

export function ApiCallsChart({ daily, byModel, activeTab }: Props) {
  if (activeTab === "model") {
    return <ModelChart byModel={byModel} />;
  }
  return <TrendChart daily={daily} />;
}
