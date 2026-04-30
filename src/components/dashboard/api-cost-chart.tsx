"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { DailyUsageTrend } from "@/types";
import { mergeChartOption, chartColors } from "./chart-theme";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const MICRO_YUAN = 1_000_000;

interface Props {
  daily: DailyUsageTrend[];
  activeTab: string;
}

export function ApiCostChart({ daily, activeTab }: Props) {
  const items = daily ?? [];
  const option = useMemo<EChartsOption>(() => {
    const dates = items.map((d) => d.date);

    let seriesData: number[];
    let seriesName: string;
    let color: string;

    if (activeTab === "cost") {
      seriesName = "总成本";
      seriesData = items.map((d) => d.total_provider_cost / MICRO_YUAN);
      color = chartColors[5];
    } else if (activeTab === "profit") {
      seriesName = "利润";
      seriesData = items.map(
        (d) => (d.total_revenue - d.total_provider_cost) / MICRO_YUAN,
      );
      color = chartColors[3];
    } else {
      seriesName = "调用花费";
      seriesData = items.map((d) => d.total_revenue / MICRO_YUAN);
      color = chartColors[1];
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
        valueFormatter: (v: any) => `¥${Number(v).toFixed(2)}`,
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
        axisLabel: {
          color: "#9ca3af",
          fontSize: 12,
          formatter: (v: number) => `¥${v}`,
        },
      },
      series: [
        {
          name: seriesName,
          type: "line",
          data: seriesData,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color },
          lineStyle: { width: 2.5 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: color + "26" },
                { offset: 1, color: "rgba(255,255,255,0)" },
              ],
            },
          },
        },
      ],
    });
  }, [items, activeTab]);

  return <ReactECharts option={option} style={{ height: "100%" }} />;
}
