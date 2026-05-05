"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { UserGrowthPoint } from "@/types";
import { mergeChartOption, chartColors } from "./chart-theme";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface Props {
  data: UserGrowthPoint[];
  activeTab: string;
}

export function UserGrowthChart({ data, activeTab }: Props) {
  const items = data ?? [];
  const option = useMemo<EChartsOption>(() => {
    const dates = items.map((d) => d.date);
    const isNew = activeTab === "new";

    return mergeChartOption({
      tooltip: {
        trigger: "axis",
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: { color: "#111827", fontSize: 13 },
        extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px; padding: 10px 14px;",
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
          name: isNew ? "新增用户" : "累计用户",
          type: "line",
          data: items.map((d) => (isNew ? d.new_users : d.cumulative)),
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: chartColors[0] },
          lineStyle: { width: 2.5 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: isNew ? "rgba(37,99,235,0.15)" : "rgba(99,102,241,0.15)" },
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
