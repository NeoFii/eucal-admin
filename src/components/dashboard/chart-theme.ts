import type { EChartsOption } from "echarts";

const COLORS = [
  "#2563eb", "#6366f1", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

export const chartColors = COLORS;

export const baseChartOption: Partial<EChartsOption> = {
  color: COLORS,
  textStyle: {
    fontFamily: "MiSans, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  grid: {
    top: 40,
    right: 16,
    bottom: 24,
    left: 16,
    containLabel: true,
  },
  tooltip: {
    trigger: "axis",
    backgroundColor: "#fff",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    textStyle: { color: "#111827", fontSize: 13 },
    extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px; padding: 10px 14px;",
  },
  xAxis: {
    axisLine: { lineStyle: { color: "#e5e7eb" } },
    axisTick: { show: false },
    axisLabel: { color: "#9ca3af", fontSize: 12 },
  },
  yAxis: {
    splitLine: { lineStyle: { color: "#f3f4f6" } },
    axisLabel: { color: "#9ca3af", fontSize: 12 },
  },
};

export function mergeChartOption(override: EChartsOption): EChartsOption {
  return {
    ...baseChartOption,
    ...override,
    textStyle: { ...baseChartOption.textStyle, ...(override.textStyle as object) },
    grid: { ...baseChartOption.grid, ...(override.grid as object) },
  };
}
