import type { EChartsOption } from "echarts"
import type { ChartConfig } from "@/lib/chart-types"
import {
  COLORS,
  COLOR_THEMES,
  resolveType,
  buildSeries,
  buildAxisExtras,
  markMax,
} from "@/lib/chart-series-builders"
import {
  buildTooltip,
  buildToolbox,
  buildDataZoom,
  buildBrush,
} from "@/lib/chart-props-builders"
import { autoPivot } from "@/lib/pivot-utils"

export const CHART_TYPE_OPTIONS = [
  { value: "bar", key: "dashboard.chart_type_bar" },
  { value: "line", key: "dashboard.chart_type_line" },
  { value: "area", key: "dashboard.chart_type_area" },
  { value: "pie", key: "dashboard.chart_type_pie" },
  { value: "scatter", key: "dashboard.chart_type_scatter" },
  { value: "radar", key: "dashboard.chart_type_radar" },
  { value: "radialBar", key: "dashboard.chart_type_radial_bar" },
  { value: "treemap", key: "dashboard.chart_type_treemap" },
  { value: "composed", key: "dashboard.chart_type_composed" },
] as const

// Re-export shared primitives so existing direct importers from chart-helpers
// continue to work without touching their import sites.
export { COLORS, COLOR_THEMES, resolveType } from "@/lib/chart-series-builders"
export { buildSeries, buildAxisExtras, markMax } from "@/lib/chart-series-builders"
export type { ChartSeries } from "@/lib/chart-series-builders"
export { formatNum, buildTooltip, buildToolbox, buildDataZoom, buildBrush } from "@/lib/chart-props-builders"
export { autoPivot } from "@/lib/pivot-utils"

export function isSequentialData(data: Record<string, unknown>[], xKey: string): boolean {
  if (data.length <= 15) return false
  const values = data.map((d) => d[xKey])
  const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}|^\d{1,2}[-/]\d{1,2}[-/]\d{4}|^\d{4}Q\d|^\d{6}$/
  if (values.some((v) => datePattern.test(String(v)))) return true
  if (values.every((v) => !isNaN(Number(v)))) return true
  const monthPattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i
  if (values.some((v) => monthPattern.test(String(v)))) return true
  return false
}

export interface ChartPreparedData {
  chartData: Record<string, unknown>[]
  resolvedType: string
  resolvedXKey: string
  barGroups?: string[]
  stats: { max: number; maxItem: Record<string, unknown> | null }
  yKey: string
}

function computeStats(data: Record<string, unknown>[], yKey: string) {
  let max = -Infinity
  let maxItem: Record<string, unknown> | null = null
  for (const d of data) {
    const v = Number(d[yKey])
    if (v > max) { max = v; maxItem = d }
  }
  return { max, maxItem }
}

export function prepareChartData(
  data: Record<string, unknown>[],
  config: ChartConfig,
): ChartPreparedData {
  const yKey = config.yKey || config.series?.[0]?.yKey || ""

  if (!data || data.length === 0) {
    return {
      chartData: [],
      resolvedType: "bar",
      resolvedXKey: config.xKey,
      stats: { max: 0, maxItem: null },
      yKey,
    }
  }

  const rawYKey = config.yKey || ""
  const rawData = rawYKey
    ? data.map((row) => ({ ...row, [rawYKey]: Number(row[rawYKey]) || 0 }))
    : data

  const type = resolveType(config.type)

  if (type === "composed" && config.series?.length) {
    return {
      chartData: rawData,
      resolvedType: type,
      resolvedXKey: config.xKey,
      stats: yKey ? computeStats(rawData, yKey) : { max: 0, maxItem: null },
      yKey,
    }
  }

  if (rawYKey && type !== "pie" && type !== "radar" && type !== "radialBar" && type !== "treemap") {
    const pivoted = autoPivot(rawData, rawYKey, config.xKey)
    return {
      chartData: pivoted.data,
      resolvedType: type,
      resolvedXKey: pivoted.xKey,
      barGroups: pivoted.barGroups,
      stats: computeStats(pivoted.data, rawYKey),
      yKey,
    }
  }

  return {
    chartData: rawData,
    resolvedType: type,
    resolvedXKey: config.xKey,
    stats: yKey ? computeStats(rawData, yKey) : { max: 0, maxItem: null },
    yKey,
  }
}

export function buildEChartsOption(params: ChartPreparedData & {
  config: ChartConfig
  isDark: boolean
  onBrushSelect?: (items: Record<string, unknown>[]) => void
}): EChartsOption {
  const { chartData, config, resolvedType, resolvedXKey, barGroups, isDark, stats, yKey, onBrushSelect } = params
  if (chartData.length === 0) return {}

  const series = buildSeries(resolvedType, chartData, config, resolvedXKey, barGroups, isDark)
  const hasMultipleSeries = series.length > 1 || !!barGroups?.length || (config.series?.length ?? 0) > 1
  const needsXY = !["pie", "radar", "radialBar", "treemap"].includes(resolvedType)

  const opt: EChartsOption = {
    color: COLORS,
    tooltip: buildTooltip(isDark),
    toolbox: buildToolbox(resolvedType, hasMultipleSeries),
    animation: true,
    animationDuration: config.style?.animationDuration ?? 600,
    animationEasing: "cubicOut",
  }

  if (config.title) {
    opt.title = {
      text: config.title,
      left: "center",
      top: 4,
      textStyle: { fontSize: 13, fontWeight: 600, color: isDark ? "#e0e0e0" : "#333" },
    }
  }

  if (config.showLegend !== false && series.length > 0) {
    opt.legend = {
      left: "left",
      top: config.title ? 24 : 0,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { fontSize: 10, color: isDark ? "#ccc" : "#666" },
    }
  }

  if (needsXY) {
    const hasDataZoom = ["bar", "line", "area", "scatter", "composed"].includes(resolvedType) && isSequentialData(chartData, resolvedXKey)
    const gridBottom = hasDataZoom ? 68 : onBrushSelect ? 60 : 32
    opt.grid = { left: 50, right: 20, top: config.title ? 52 : 32, bottom: gridBottom, containLabel: false }
    if (config.style?.canvasBg) {
      opt.backgroundColor = config.style.canvasBg
    }
    if (config.style?.chartBg || config.style?.gridBorderWidth || config.style?.gridBorderColor
        || config.style?.gridPaddingLeft !== undefined || config.style?.gridPaddingRight !== undefined
        || config.style?.gridPaddingTop !== undefined || config.style?.gridPaddingBottom !== undefined) {
      opt.grid = {
        ...opt.grid,
        ...(config.style.chartBg && { backgroundColor: config.style.chartBg }),
        ...(config.style.gridPaddingLeft !== undefined && { left: config.style.gridPaddingLeft }),
        ...(config.style.gridPaddingRight !== undefined && { right: config.style.gridPaddingRight }),
        ...(config.style.gridPaddingTop !== undefined && { top: config.style.gridPaddingTop }),
        ...(config.style.gridPaddingBottom !== undefined && { bottom: config.style.gridPaddingBottom }),
        ...(config.style.gridBorderWidth !== undefined && { borderWidth: config.style.gridBorderWidth }),
        ...(config.style.gridBorderColor && { borderColor: config.style.gridBorderColor }),
      }
    }
    opt.xAxis = {
      type: "category",
      data: chartData.map((d) => String(d[resolvedXKey] ?? "")),
      axisLabel: { fontSize: 10, color: isDark ? "#aaa" : "#666", rotate: chartData.length > 10 ? 30 : 0 },
      axisLine: { lineStyle: { color: isDark ? "#444" : "#ddd" } },
      axisTick: { show: false },
    }
    opt.yAxis = {
      type: "value",
      axisLabel: { fontSize: 10, color: isDark ? "#aaa" : "#666" },
      splitLine: { lineStyle: { color: isDark ? "#333" : "#eee" } },
      axisLine: { show: false },
    }
    if (config.style?.splitLineShow === false) {
      (opt.yAxis as Record<string, unknown>).splitLine = { show: false }
    } else if (config.style?.splitLineColor || config.style?.splitLineType) {
      const sl = { ...((opt.yAxis as Record<string, unknown>).splitLine as object || {}) } as Record<string, unknown>
      const ls = { ...(sl.lineStyle as object || {}) } as Record<string, unknown>
      if (config.style.splitLineColor) ls.color = config.style.splitLineColor
      if (config.style.splitLineType) ls.type = config.style.splitLineType
      sl.lineStyle = ls
      ;(opt.yAxis as Record<string, unknown>).splitLine = sl
    }

    if (["bar", "line", "area", "scatter", "composed"].includes(resolvedType) && isSequentialData(chartData, resolvedXKey)) {
      opt.dataZoom = buildDataZoom()
    }

    if (onBrushSelect) {
      opt.brush = buildBrush(resolvedXKey, chartData, onBrushSelect)
    }
  }

  const axisExtras = buildAxisExtras(resolvedType, chartData, config, resolvedXKey, yKey, isDark)
  if (axisExtras) {
    if (axisExtras.radar) opt.radar = axisExtras.radar
    if (axisExtras.polar) opt.polar = axisExtras.polar
    if (axisExtras.angleAxis) opt.angleAxis = axisExtras.angleAxis
    if (axisExtras.radiusAxis) opt.radiusAxis = axisExtras.radiusAxis
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opt.series = series as any

  if (needsXY && yKey) {
    markMax(opt, stats.maxItem, resolvedXKey, yKey, resolvedType)
  }

  if (config.axis && needsXY) {
    const ac = config.axis
    if (opt.xAxis && typeof opt.xAxis === "object" && !Array.isArray(opt.xAxis)) {
      if (ac.xAxisName) opt.xAxis.name = ac.xAxisName
      if (ac.xAxisRotate !== undefined) {
        opt.xAxis.axisLabel = { ...opt.xAxis.axisLabel, rotate: ac.xAxisRotate }
      }
      if (ac.xAxisHide) opt.xAxis.show = false
    }
    if (opt.yAxis && typeof opt.yAxis === "object" && !Array.isArray(opt.yAxis)) {
      if (ac.yAxisName) opt.yAxis.name = ac.yAxisName
      if (ac.yAxisUnit) {
        opt.yAxis.axisLabel = { ...opt.yAxis.axisLabel, formatter: `{value}${ac.yAxisUnit}` }
      }
      if (ac.yAxisMin !== undefined) opt.yAxis.min = ac.yAxisMin
      if (ac.yAxisMax !== undefined) opt.yAxis.max = ac.yAxisMax
      if (ac.yAxisHide) opt.yAxis.show = false
    }
    if (ac.dualYAxis && resolvedType === "composed" && Array.isArray(opt.series)) {
      opt.yAxis = [
        opt.yAxis as object,
        { type: "value" as const, name: "", position: "right" as const, axisLabel: { fontSize: 10 }, splitLine: { show: false } },
      ]
    }
  }

  if (config.style) {
    const sc = config.style
    if (sc.colorTheme && COLOR_THEMES[sc.colorTheme]) {
      opt.color = COLOR_THEMES[sc.colorTheme]
    }
    if (Array.isArray(opt.series)) {
      for (const s of opt.series) {
        const si = s as Record<string, unknown>
        if (si.type === "bar") {
          if (sc.barRadius !== undefined) {
            si.itemStyle = { ...(si.itemStyle as object), borderRadius: [sc.barRadius, sc.barRadius, 0, 0] }
          }
          if (sc.barWidth !== undefined) {
            si.barMaxWidth = sc.barWidth
          }
        }
        if (si.type === "line") {
          if (sc.lineSmooth !== undefined) si.smooth = sc.lineSmooth
          if (sc.areaFill) si.areaStyle = { opacity: 0.15 }
          if (sc.lineMarkPoint) {
            si.markPoint = { data: [{ type: "max", name: "Max" }, { type: "min", name: "Min" }] }
          }
        }
        if (si.type === "pie") {
          if (sc.pieDonut) {
            const inner = sc.pieRadius ?? 50
            si.radius = [`${inner}%`, "70%"]
          }
        }
      }
    }
  }

  if (config.label) {
    const lc = config.label
    const formatValue = (v: number): string => {
      let result = v
      if (lc.decimalPlaces !== undefined) {
        result = Number(v.toFixed(lc.decimalPlaces))
      }
      switch (lc.numberFormat) {
        case "comma": return result.toLocaleString()
        case "percent": return `${result}%`
        case "thousand": return `${(result / 1000).toFixed(lc.decimalPlaces ?? 1)}K`
        case "million": return `${(result / 1000000).toFixed(lc.decimalPlaces ?? 1)}M`
        default: return String(result)
      }
    }

    if (Array.isArray(opt.series)) {
      for (const s of opt.series) {
        const si = s as Record<string, unknown>
        if (lc.showDataLabels) {
          const isPie = si.type === "pie"
          si.label = {
            ...(si.label as object || {}),
            show: true,
            position: isPie ? "outside" : "top",
            formatter: isPie ? undefined : (params: { value: number }) => formatValue(params.value),
          }
        }
      }
    }

    if (lc.showTotalLabel && (resolvedType === "bar" || resolvedType === "pie") && Array.isArray(opt.series)) {
      const total = chartData.reduce((sum, d) => sum + (Number(d[yKey]) || 0), 0)
      const si = opt.series[0] as Record<string, unknown>
      if (resolvedType === "bar") {
        si.markLine = {
          silent: true,
          data: [{ yAxis: total / chartData.length, name: "Avg" }],
          label: { formatter: () => `Avg: ${formatValue(total / chartData.length)}` },
        }
      }
    }
  }

  if (config.jsonOverride) {
    try {
      const override = JSON.parse(config.jsonOverride) as Partial<EChartsOption>
      for (const key of Object.keys(override)) {
        const k = key as keyof EChartsOption
        if (typeof override[k] === "object" && override[k] !== null && !Array.isArray(override[k])) {
          (opt as Record<string, unknown>)[k] = { ...((opt as Record<string, unknown>)[k] as object || {}), ...(override[k] as object) }
        } else {
          (opt as Record<string, unknown>)[k] = override[k]
        }
      }
    } catch {
      // Silently skip invalid JSON — validated in UI
    }
  }

  return opt
}
