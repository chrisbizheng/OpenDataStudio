import type { EChartsOption } from "echarts"
import type { SeriesConfig } from "@/lib/chart-types"
import type { ChartConfig } from "@/lib/chart-types"

export const COLORS = [
  "#6366F1", "#EC4899", "#F59E0B", "#10B981", "#EF4444",
  "#8B5CF6", "#06B6D4", "#F97316", "#14B8A6", "#E11D48",
  "#3B82F6", "#84CC16", "#D946EF", "#0EA5E9", "#22C55E",
]

export const COLOR_THEMES: Record<string, string[]> = {
  default: COLORS,
  warm: ["#F59E0B", "#EF4444", "#F97316", "#E11D48", "#FB923C", "#FBBF24", "#F87171", "#FCA5A5", "#FDE68A", "#FECACA"],
  cool: ["#6366F1", "#3B82F6", "#06B6D4", "#8B5CF6", "#0EA5E9", "#14B8A6", "#A78BFA", "#38BDF8", "#67E8F9", "#5EEAD4"],
  pastel: ["#C4B5FD", "#FBCFE8", "#FDE68A", "#A7F3D0", "#FCA5A5", "#DDD6FE", "#A5F3FC", "#FED7AA", "#99F6E4", "#FECDD3"],
  dark: ["#818CF8", "#F472B6", "#FBBF24", "#34D399", "#F87171", "#A78BFA", "#22D3EE", "#FB923C", "#2DD4BF", "#FB7185"],
}

const TYPE_MAP: Record<string, string> = {
  bar: "bar", barchart: "bar", column: "bar",
  line: "line", linechart: "line",
  area: "area", areachart: "area",
  pie: "pie", piechart: "pie", donut: "pie",
  scatter: "scatter", scatterplot: "scatter", bubble: "scatter",
  radar: "radar", radarchart: "radar",
  radialbar: "radialBar", radial: "radialBar",
  treemap: "treemap", tree: "treemap",
  composed: "composed", combo: "composed", mixed: "composed",
}

export function resolveType(type: string): string {
  return TYPE_MAP[(type || "bar").toLowerCase().replace(/[_\s-]/g, "")] || "bar"
}

interface BarSeries {
  type: "bar"
  name?: string
  emphasis?: { focus?: string }
  data: number[] | { value: number; name: string; itemStyle: { color: string } }[]
  itemStyle: {
    color?: string | ((params: { dataIndex: number }) => string)
    borderRadius: [number, number, number, number]
  }
  barMaxWidth?: number
  coordinateSystem?: "polar"
  roundCap?: boolean
}

interface LineSeries {
  type: "line"
  name?: string
  emphasis?: { focus?: string }
  data: number[] | [unknown, number][]
  smooth?: boolean
  lineStyle?: { width: number; color: string }
  itemStyle?: { color: string }
  areaStyle?: { opacity: number; color: string }
}

interface PieSeries {
  type: "pie"
  name?: string
  radius: [string, string]
  center: [string, string]
  data: { name: string; value: number }[]
  label: { formatter: string; fontSize: number }
  emphasis: { itemStyle: { shadowBlur: number; shadowOffsetX: number; shadowColor: string } }
}

interface RadarSeries {
  type: "radar"
  name?: string
  data: { value: number[]; name: string; areaStyle: { opacity: number } }[]
}

interface ScatterSeries {
  type: "scatter"
  name?: string
  emphasis?: { focus?: string }
  data: [unknown, number][]
  itemStyle: { color: string }
  symbolSize: number
}

interface TreemapSeries {
  type: "treemap"
  name?: string
  data: { name: string; value: number; itemStyle: { color: string } }[]
  label: { fontSize: number }
  breadcrumb: { show: boolean }
}

export type ChartSeries = BarSeries | LineSeries | PieSeries | RadarSeries | ScatterSeries | TreemapSeries

function barSeries(data: number[], overrides: Partial<BarSeries> = {}): BarSeries {
  return {
    type: "bar",
    data,
    emphasis: { focus: "series" },
    itemStyle: {
      color: COLORS[0],
      borderRadius: [2, 2, 0, 0],
    },
    barMaxWidth: 40,
    ...overrides,
  }
}

function lineSeries(data: number[], overrides: Partial<LineSeries> = {}): LineSeries {
  return {
    type: "line",
    data,
    smooth: true,
    emphasis: { focus: "series" },
    lineStyle: { width: 2, color: COLORS[0] },
    itemStyle: { color: COLORS[0] },
    ...overrides,
  }
}

function areaSeries(data: number[], color: string): LineSeries {
  return {
    type: "line",
    data,
    smooth: true,
    emphasis: { focus: "series" },
    lineStyle: { width: 2, color },
    itemStyle: { color },
    areaStyle: { opacity: 0.15, color },
  }
}

function composedBar(i: number, data: number[], name: string): BarSeries {
  return {
    type: "bar",
    data,
    name,
    emphasis: { focus: "series" },
    itemStyle: { color: COLORS[i % COLORS.length], borderRadius: [2, 2, 0, 0] },
    barMaxWidth: 30,
  }
}

function composedLine(i: number, data: number[], name: string): LineSeries {
  return {
    type: "line",
    data,
    name,
    smooth: true,
    emphasis: { focus: "series" },
    lineStyle: { width: 2, color: COLORS[i % COLORS.length] },
    itemStyle: { color: COLORS[i % COLORS.length] },
  }
}

function composedArea(i: number, data: number[], name: string): LineSeries {
  return {
    type: "line",
    data,
    name,
    smooth: true,
    emphasis: { focus: "series" },
    lineStyle: { width: 2, color: COLORS[i % COLORS.length] },
    itemStyle: { color: COLORS[i % COLORS.length] },
    areaStyle: { opacity: 0.15, color: COLORS[i % COLORS.length] },
  }
}

export function buildSeries(
  resolvedType: string,
  chartData: Record<string, unknown>[],
  config: ChartConfig,
  xKey: string,
  barGroups?: string[],
  isDark?: boolean,
): ChartSeries[] {
  const series: SeriesConfig[] = config.series?.length
    ? config.series
    : [{ yKey: config.yKey || "", chartType: resolvedType === "composed" ? undefined : resolvedType }]

  if (resolvedType === "pie") {
    const pieData = chartData.map((d) => ({ name: String(d[xKey] ?? ""), value: Number(d[config.yKey || ""]) || 0 }))
    return [{
      type: "pie",
      radius: ["35%", "65%"],
      center: ["50%", "50%"],
      data: pieData,
      label: { formatter: "{b}: {d}%", fontSize: 10 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.3)" } },
    }]
  }

  if (resolvedType === "radar") {
    return [{
      type: "radar",
      data: [{
        value: chartData.map((d) => Number(d[config.yKey || ""]) || 0),
        name: config.yKey || "value",
        areaStyle: { opacity: 0.15 },
      }],
    }]
  }

  if (resolvedType === "radialBar") {
    const radialData = chartData.map((d, i) => ({
      value: Number(d[config.yKey || ""]) || 0,
      name: String(d[xKey] ?? ""),
      itemStyle: { color: COLORS[i % COLORS.length] },
    }))
    return [{
      type: "bar",
      data: radialData.map((d) => d.value),
      coordinateSystem: "polar",
      roundCap: true,
      itemStyle: {
        color: (p: { dataIndex: number }) => COLORS[p.dataIndex % COLORS.length],
        borderRadius: [2, 2, 0, 0],
      },
    }]
  }

  if (resolvedType === "treemap") {
    const tData = chartData.map((d, i) => ({
      name: String(d[xKey] ?? ""),
      value: Number(d[config.yKey || ""]) || 0,
      itemStyle: { color: COLORS[i % COLORS.length] },
    }))
    return [{
      type: "treemap",
      data: tData,
      label: { fontSize: 10 },
      breadcrumb: { show: config.style?.treemapBreadcrumb ?? false },
      ...(config.style?.treemapLeafDepth && { leafDepth: config.style.treemapLeafDepth }),
    }]
  }

  if (barGroups && barGroups.length > 0) {
    return barGroups.map((group, i) =>
      barSeries(chartData.map((d) => Number(d[group]) || 0), {
        name: group,
        itemStyle: {
          color: COLORS[i % COLORS.length],
          borderRadius: [2, 2, 0, 0],
        },
      })
    )
  }

  if (resolvedType === "scatter") {
    return series.map((s, i) => ({
      type: "scatter" as const,
      name: s.label || s.yKey,
      data: chartData.map((d): [unknown, number] => [d[xKey], Number(d[s.yKey]) || 0]),
      itemStyle: { color: COLORS[i % COLORS.length] },
      symbolSize: config.style?.scatterSymbolSize ?? 8,
      ...(config.style?.scatterSymbol && { symbol: config.style.scatterSymbol }),
      emphasis: { focus: "series" as const },
    }))
  }

  if (resolvedType === "composed") {
    return series.map((s, i) => {
      const ct = s.chartType ? resolveType(s.chartType) : (i === 0 ? "bar" : "line")
      const name = s.label || s.yKey
      const data = chartData.map((d) => Number(d[s.yKey]) || 0)
      if (ct === "bar") return composedBar(i, data, name)
      if (ct === "area") return composedArea(i, data, name)
      return composedLine(i, data, name)
    })
  }

  const yKey = config.yKey || ""
  const data = chartData.map((d) => Number(d[yKey]) || 0)

  if (resolvedType === "area") return [areaSeries(data, COLORS[0])]
  if (resolvedType === "line") return [lineSeries(data)]
  return [barSeries(data)]
}

export function buildAxisExtras(
  resolvedType: string,
  chartData: Record<string, unknown>[],
  config: ChartConfig,
  resolvedXKey: string,
  yKey: string,
  isDark: boolean,
): Partial<Pick<EChartsOption, "radar" | "polar" | "angleAxis" | "radiusAxis">> | undefined {
  if (resolvedType === "radar") {
    return {
      radar: {
        indicator: chartData.map((d) => ({ name: String(d[resolvedXKey] ?? "").slice(0, 8) })),
        shape: (config.style?.radarShape ?? "polygon") as "polygon" | "circle",
        ...(config.style?.radarSplitNumber && { splitNumber: config.style.radarSplitNumber }),
        splitArea: { areaStyle: { color: isDark ? ["#1a1a2e", "#16213e"] : ["#f5f5ff", "#fff"] } },
        axisLine: { lineStyle: { color: isDark ? "#444" : "#ddd" } },
        splitLine: { lineStyle: { color: isDark ? "#333" : "#eee" } },
      },
    }
  }

  if (resolvedType === "radialBar") {
    const startAngle = config.style?.radialStartAngle ?? 90
    const endAngle = config.style?.radialEndAngle ?? -90
    return {
      polar: { radius: ["20%", "80%"] },
      angleAxis: {
        max: Math.max(...chartData.map((d) => Number(d[yKey]) || 0)) * 1.2,
        startAngle,
        endAngle,
        show: false,
      },
      radiusAxis: {
        type: "category",
        data: chartData.map((d) => String(d[resolvedXKey] ?? "")),
        axisLabel: { fontSize: 9 },
      },
    }
  }

  return undefined
}

export function markMax(
  option: EChartsOption,
  maxItem: Record<string, unknown> | null,
  xKey: string,
  yKey: string,
  resolvedType: string,
) {
  if (resolvedType === "pie" || resolvedType === "radar" || resolvedType === "radialBar" || resolvedType === "treemap") return
  if (!Array.isArray(option.series) || option.series.length === 0) return

  const markData = maxItem
    ? [{ coord: [String(maxItem[xKey] ?? ""), Number(maxItem[yKey]) || 0], symbol: "circle" as const, symbolSize: 10, itemStyle: { color: "#F59E0B", borderColor: "#fff", borderWidth: 2 } }]
    : []

  const first = option.series[0] as { markPoint?: { data: typeof markData } }
  first.markPoint = { data: markData }
}
