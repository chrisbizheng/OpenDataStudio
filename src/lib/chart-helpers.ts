import type { EChartsOption } from "echarts"
import type { SeriesConfig } from "@/lib/agent-types"
import { COLORS, COLOR_THEMES, resolveType, formatNum, isSequentialData } from "./chart-data"

export interface ChartConfig {
  type: string
  xKey: string
  yKey?: string
  series?: SeriesConfig[]
  title?: string
  showLegend?: boolean
  height?: number
  axis?: {
    xAxisName?: string
    xAxisRotate?: number
    xAxisHide?: boolean
    yAxisName?: string
    yAxisUnit?: string
    yAxisMin?: number
    yAxisMax?: number
    yAxisHide?: boolean
    dualYAxis?: boolean
  }
  style?: {
    barRadius?: number
    barWidth?: number
    lineSmooth?: boolean
    areaFill?: boolean
    lineMarkPoint?: boolean
    pieDonut?: boolean
    pieRadius?: number
    colorTheme?: string
    // Background & Grid
    canvasBg?: string
    chartBg?: string
    gridPaddingLeft?: number
    gridPaddingRight?: number
    gridPaddingTop?: number
    gridPaddingBottom?: number
    gridBorderWidth?: number
    gridBorderColor?: string
    // Split Line
    splitLineShow?: boolean
    splitLineColor?: string
    splitLineType?: string
    // Animation
    animationDuration?: number
    // Scatter-specific
    scatterSymbolSize?: number
    scatterSymbol?: string
    // Radar-specific
    radarShape?: string
    radarSplitNumber?: number
    // RadialBar-specific
    radialStartAngle?: number
    radialEndAngle?: number
    // Treemap-specific
    treemapLeafDepth?: number
    treemapBreadcrumb?: boolean
  }
  label?: {
    showDataLabels?: boolean
    showTotalLabel?: boolean
    numberFormat?: string
    decimalPlaces?: number
  }
  jsonOverride?: string
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

type ChartSeries = BarSeries | LineSeries | PieSeries | RadarSeries | ScatterSeries | TreemapSeries

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

export function buildTooltip(isDark: boolean): EChartsOption["tooltip"] {
  return {
    trigger: "axis",
    backgroundColor: isDark ? "#1e1e2e" : "#ffffff",
    borderColor: isDark ? "#333" : "#e5e7eb",
    textStyle: { color: isDark ? "#e0e0e0" : "#333", fontSize: 11 },
    confine: true,
    formatter(params: unknown) {
      const p = params as { name: string; value: number | number[]; seriesName: string; color: string; marker: string }[]
      if (!Array.isArray(p) || p.length === 0) return ""
      const name = p[0].name
      const total = p.reduce((s, item) => s + (Array.isArray(item.value) ? item.value[item.value.length - 1] : Number(item.value) || 0), 0)
      const lines = p.map((item) => {
        const val = Array.isArray(item.value) ? item.value[item.value.length - 1] : Number(item.value) || 0
        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0"
        return `${item.marker} ${item.seriesName}: <b>${formatNum(val)}</b> <span style="color:#999;font-size:10px">(${pct}%)</span>`
      })
      return `<div style="font-size:12px"><div style="font-weight:600;margin-bottom:4px;border-bottom:1px solid ${isDark ? "#444" : "#eee"};padding-bottom:4px">${name}</div>${lines.join("<br/>")}</div>`
    },
  }
}

export function buildToolbox(resolvedType: string, hasMultipleSeries: boolean): EChartsOption["toolbox"] {
  const magicTypes: string[] = []
  if (["bar", "area"].includes(resolvedType)) magicTypes.push("line")
  if (["line", "area", "pie"].includes(resolvedType)) magicTypes.push("bar")
  if (["bar", "line"].includes(resolvedType)) magicTypes.push("pie")
  if (hasMultipleSeries && ["bar", "line", "area", "composed"].includes(resolvedType)) magicTypes.push("stack")
  const hasMagicType = magicTypes.length > 0

  return {
    right: 10,
    top: 0,
    feature: {
      saveAsImage: { title: "Save", pixelRatio: 2 },
      dataView: { title: "Data", readOnly: true, lang: ["Data View", "Close", "Refresh"] },
      restore: { title: "Restore" },
      ...(hasMagicType ? {
        magicType: {
          title: Object.fromEntries(magicTypes.map((t) => [t, t.charAt(0).toUpperCase() + t.slice(1)])),
          type: magicTypes as ("line" | "bar" | "stack")[],
        }
      } : {}),
    },
    iconStyle: { borderColor: "#999" },
    emphasis: { iconStyle: { borderColor: "#6366F1" } },
  }
}

export function buildDataZoom(): EChartsOption["dataZoom"] {
  return [
    { type: "inside", start: 0, end: 100 },
    { type: "slider", start: 0, end: 100, height: 18, bottom: 2, left: 50, right: 20 },
  ]
}

export function buildBrush(xKey: string, data: Record<string, unknown>[], onBrushSelect?: (items: Record<string, unknown>[]) => void): EChartsOption["brush"] {
  if (!onBrushSelect) return undefined
  return {
    toolbox: ["rect", "clear"],
    xAxisIndex: 0,
    brushStyle: { borderWidth: 1, color: "rgba(99,102,241,0.15)", borderColor: "rgba(99,102,241,0.6)" },
    outOfBrush: { colorAlpha: 0.3 },
    throttleType: "debounce",
    throttleDelay: 300,
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

function buildAxisExtras(
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

export interface ChartPreparedData {
  chartData: Record<string, unknown>[]
  resolvedType: string
  resolvedXKey: string
  barGroups?: string[]
  stats: { max: number; maxItem: Record<string, unknown> | null }
  yKey: string
}

function autoPivot(
  data: Record<string, unknown>[],
  yKey: string,
  xKey: string,
): { data: Record<string, unknown>[]; xKey: string; barGroups?: string[] } {
  if (!data[0] || typeof data[0] !== "object") return { data, xKey }
  const dimCols = Object.keys(data[0]).filter((k) => k !== yKey)
  if (dimCols.length < 2) return { data, xKey }

  const dimStats = dimCols.map((k) => {
    const unique = new Set(data.map((d) => String(d[k] ?? "")))
    return { col: k, uniqueCount: unique.size }
  })
  dimStats.sort((a, b) => a.uniqueCount - b.uniqueCount)

  const bestXKey = dimStats[0].col
  const bestSecondary = dimStats[1].col

  const groups = new Map<string, Set<string>>()
  for (const row of data) {
    const xk = String(row[bestXKey] ?? "")
    if (!groups.has(xk)) groups.set(xk, new Set())
    groups.get(xk)!.add(String(row[bestSecondary] ?? ""))
  }
  const hasGrouping = Array.from(groups.values()).some((s) => s.size > 1)
  if (!hasGrouping) return { data, xKey }

  const secondaryValues = [...new Set(data.map((d) => String(d[bestSecondary] ?? "")))]
  const pivoted = new Map<string, Record<string, unknown>>()
  for (const row of data) {
    const xk = String(row[bestXKey] ?? "")
    if (!pivoted.has(xk)) pivoted.set(xk, { [bestXKey]: xk })
    const sv = String(row[bestSecondary] ?? "")
    pivoted.get(xk)![sv] = Number(row[yKey]) || 0
  }
  return { data: Array.from(pivoted.values()), xKey: bestXKey, barGroups: secondaryValues }
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
