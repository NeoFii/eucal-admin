"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { DailyUsageTrend } from "@/types";
import { mergeChartOption, chartColors, formatDateLabel } from "./chart-theme";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface Props {
  daily: DailyUsageTrend[];
  activeTab: string;
  bucketSeconds?: number;
}

export function SuccessRateChart({ daily, activeTab, bucketSeconds = 86400 }: Props) {
  const items = daily ?? [];
  const option = useMemo<EChartsOption>(() => {
    const dates = items.map((d) => formatDateLabel(d.date, bucketSeconds));

    if (activeTab === "rate") {
      const rates = items.map((d) => {
        return d.request_count > 0
          ? +((d.success_count / d.request_count) * 100).toFixed(2)
          : 100;
      });
      const errorRates = items.map((d) => {
        return d.request_count > 0
          ? +((d.error_count / d.request_count) * 100).toFixed(2)
          : 0;
      });

      return mergeChartOption({
        tooltip: {
          trigger: "axis",
          backgroundColor: "#fff",
          borderColor: "#e5e7eb",
          borderWidth: 1,
          textStyle: { color: "#111827", fontSize: 13 },
          extraCssText:
            "box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px;",
          valueFormatter: (v: any) => `${v}%`,
        },
        xAxis: {
          type: "category",
          data: dates,
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          axisTick: { show: false },
          axisLabel: { color: "#9ca3af", fontSize: 12 },
        },
        yAxis: {
          type: "value",
          min: 0,
          max: 100,
          splitLine: { lineStyle: { color: "#f3f4f6" } },
          axisLabel: {
            color: "#9ca3af",
            fontSize: 12,
            formatter: (v: number) => `${v}%`,
          },
        },
        legend: {
          data: ["成功率", "失败率"],
          top: 8,
          right: 16,
          textStyle: { color: "#6b7280", fontSize: 12 },
        },
        series: [
          {
            name: "成功率",
            type: "line",
            data: rates,
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            itemStyle: { color: chartColors[3] },
            lineStyle: { width: 2.5 },
            areaStyle: {
              color: {
                type: "linear",
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(16,185,129,0.15)" },
                  { offset: 1, color: "rgba(255,255,255,0)" },
                ],
              },
            },
          },
          {
            name: "失败率",
            type: "line",
            data: errorRates,
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            itemStyle: { color: chartColors[5] },
            lineStyle: { width: 2.5 },
            areaStyle: {
              color: {
                type: "linear",
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(239,68,68,0.10)" },
                  { offset: 1, color: "rgba(255,255,255,0)" },
                ],
              },
            },
          },
        ],
      });
    }

    return mergeChartOption({
      tooltip: {
        trigger: "axis",
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: { color: "#111827", fontSize: 13 },
        extraCssText:
          "box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px;",
      },
      legend: {
        data: ["成功", "失败"],
        top: 8,
        right: 16,
        textStyle: { color: "#6b7280", fontSize: 12 },
      },
      xAxis: {
        type: "category",
        data: dates,
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
          name: "成功",
          type: "line",
          data: items.map((d) => d.success_count),
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          itemStyle: { color: chartColors[3] },
          lineStyle: { width: 2 },
        },
        {
          name: "失败",
          type: "line",
          data: items.map((d) => d.error_count),
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          itemStyle: { color: chartColors[5] },
          lineStyle: { width: 2 },
        },
      ],
    });
  }, [items, activeTab]);

  return <ReactECharts option={option} style={{ height: "100%" }} notMerge />;
}
