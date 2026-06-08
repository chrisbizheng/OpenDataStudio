"use client"

import { useMemo, useCallback } from "react"
import ReactECharts from "echarts-for-react"
import type { EChartsOption } from "echarts"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SeriesOption = Record<string, any>
import { useTheme } from "@/components/theme-provider"

interface SeriesConfig {
  yKey: string
  chartType?: string
  label?: string
}

interface ChartConfig {
  type: string
  xKey: string
  yKey?: string
  series?: SeriesConfig[]
  title?: string
  showLegend?: boolean
  height?: number
}

interface ChartProps {
  data: Record<string, unknown>[]
  config: ChartConfig
  onClick?: (item: { key: string; value: number; row: Record<string, unknown> }) => void
  onBrushSelect?: (items: Record<string, unknown>[]) => void
}

const COLORS = [
  "#6366F1", "#EC4899", "#F59E0B", "#10B981", "#EF4444",
  "#8B5CF6", "#06B6D4", "#F97316", "#14B8A6", "#E11D48",
  "#3B82F6", "#84CC16", "#D946EF", "#0EA5E9", "#22C55E",
]

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

const METRIC_PATTERN = /^(sum|total|avg|min|max|count|amount|qty|quantity|sales|revenue|sold|units)/i

function resolveType(type: string): string {
  return TYPE_MAP[(type || "bar").toLowerCase().replace(/[_\s-]/g, "")] || "bar"
}

function formatNum(v: unknown): string {
  const n = Number(v)
  if (isNaN(n)) return String(v ?? "")
  return n.toLocaleString()
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
  const vals = data.map((d) => Number(d[yKey])).filter((v) => !isNaN(v))
  let max = -Infinity
  let maxItem: Record<string, unknown> | null = null
  for (const d of data) {
    const v = Number(d[yKey])
    if (v > max) { max = v; maxItem = d }
  }
  return { max, maxItem }
}

function buildTooltip(isDark: boolean): EChartsOption["tooltip"] {
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

function buildToolbox(resolvedType: string, hasMultipleSeries: boolean): EChartsOption["toolbox"] {
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

function isSequentialData(data: Record<string, unknown>[], xKey: string): boolean {
  if (data.length <= 15) return false
  const values = data.map((d) => d[xKey])
  // Date-like strings
  const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}|^\d{1,2}[-/]\d{1,2}[-/]\d{4}|^\d{4}Q\d|^\d{6}$/
  if (values.some((v) => datePattern.test(String(v)))) return true
  // Numeric values
  if (values.every((v) => !isNaN(Number(v)))) return true
  // ISO date or month abbreviations
  const monthPattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i
  if (values.some((v) => monthPattern.test(String(v)))) return true
  return false
}

function buildDataZoom(): EChartsOption["dataZoom"] {
  return [
    { type: "inside", start: 0, end: 100 },
    { type: "slider", start: 0, end: 100, height: 18, bottom: 2, left: 50, right: 20 },
  ]
}

function buildBrush(xKey: string, data: Record<string, unknown>[], onBrushSelect?: (items: Record<string, unknown>[]) => void): EChartsOption["brush"] {
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

function buildSeries(
  resolvedType: string,
  chartData: Record<string, unknown>[],
  config: ChartConfig,
  xKey: string,
  barGroups?: string[],
  isDark?: boolean,
): SeriesOption[] {
  const series: SeriesConfig[] = config.series?.length
    ? config.series
    : [{ yKey: config.yKey || "", chartType: resolvedType === "composed" ? undefined : resolvedType }]

  if (resolvedType === "pie") {
    return [{
      type: "pie",
      radius: ["35%", "65%"],
      center: ["50%", "50%"],
      data: chartData.map((d) => ({ name: String(d[xKey] ?? ""), value: Number(d[config.yKey || ""]) || 0 })),
      label: { formatter: "{b}: {d}%", fontSize: 10 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.3)" } },
    }]
  }

  if (resolvedType === "radar") {
    const indicator = chartData.map((d) => ({ name: String(d[xKey] ?? ""), max: undefined }))
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
    return [{
      type: "bar",
      data: chartData.map((d, i) => ({
        value: Number(d[config.yKey || ""]) || 0,
        name: String(d[xKey] ?? ""),
        itemStyle: { color: COLORS[i % COLORS.length] },
      })),
      coordinateSystem: "polar",
      roundCap: true,
    }]
  }

  if (resolvedType === "treemap") {
    return [{
      type: "treemap",
      data: chartData.map((d, i) => ({
        name: String(d[xKey] ?? ""),
        value: Number(d[config.yKey || ""]) || 0,
        itemStyle: { color: COLORS[i % COLORS.length] },
      })),
      label: { fontSize: 10 },
      breadcrumb: { show: false },
    }]
  }

  if (barGroups && barGroups.length > 0) {
    return barGroups.map((group, i) => ({
      type: "bar",
      name: group,
      data: chartData.map((d) => Number(d[group]) || 0),
      itemStyle: { color: COLORS[i % COLORS.length], borderRadius: [2, 2, 0, 0] },
      emphasis: { focus: "series" },
    }))
  }

  if (resolvedType === "scatter") {
    return series.map((s, i) => ({
      type: "scatter" as const,
      name: s.label || s.yKey,
      data: chartData.map((d): [unknown, number] => [d[xKey], Number(d[s.yKey]) || 0]),
      itemStyle: { color: COLORS[i % COLORS.length] },
      symbolSize: 8,
      emphasis: { focus: "series" as const },
    }))
  }

  if (resolvedType === "composed") {
    return series.map((s, i) => {
      const ct = s.chartType ? resolveType(s.chartType) : (i === 0 ? "bar" : "line")
      const base: SeriesOption = {
        type: ct === "radialBar" ? "bar" : ct,
        name: s.label || s.yKey,
        data: chartData.map((d) => Number(d[s.yKey]) || 0),
        emphasis: { focus: "series" },
      }
      if (ct === "bar") {
        (base as Record<string, unknown>).itemStyle = { color: COLORS[i % COLORS.length], borderRadius: [2, 2, 0, 0] }
        ;(base as Record<string, unknown>).barMaxWidth = 30
      } else if (ct === "line") {
        (base as Record<string, unknown>).smooth = true
        ;(base as Record<string, unknown>).lineStyle = { width: 2, color: COLORS[i % COLORS.length] }
        ;(base as Record<string, unknown>).itemStyle = { color: COLORS[i % COLORS.length] }
      } else if (ct === "area") {
        base.type = "line"
        ;(base as Record<string, unknown>).areaStyle = { opacity: 0.15, color: COLORS[i % COLORS.length] }
        ;(base as Record<string, unknown>).lineStyle = { width: 2, color: COLORS[i % COLORS.length] }
        ;(base as Record<string, unknown>).itemStyle = { color: COLORS[i % COLORS.length] }
        ;(base as Record<string, unknown>).smooth = true
      }
      return base
    })
  }

  // bar, line, area (single series)
  const yKey = config.yKey || ""
  const sType = resolvedType === "area" ? "line" : resolvedType
  const base: SeriesOption = {
    type: sType,
    name: yKey,
    data: chartData.map((d) => Number(d[yKey]) || 0),
    emphasis: { focus: "series" },
  }
  if (sType === "bar") {
    (base as Record<string, unknown>).itemStyle = {
      color: (params: { dataIndex: number }) => COLORS[params.dataIndex % COLORS.length],
      borderRadius: [2, 2, 0, 0],
    }
    ;(base as Record<string, unknown>).barMaxWidth = 40
  } else {
    (base as Record<string, unknown>).smooth = true
    ;(base as Record<string, unknown>).lineStyle = { width: 2, color: COLORS[0] }
    ;(base as Record<string, unknown>).itemStyle = { color: COLORS[0] }
    if (resolvedType === "area") {
      (base as Record<string, unknown>).areaStyle = { opacity: 0.15, color: COLORS[0] }
    }
  }
  return [base]
}

function markMax(
  option: EChartsOption,
  maxItem: Record<string, unknown> | null,
  xKey: string,
  yKey: string,
  resolvedType: string,
) {
  if (resolvedType === "pie" || resolvedType === "radar" || resolvedType === "radialBar" || resolvedType === "treemap") return
  const series = (option.series as SeriesOption[] | undefined)?.[0]
  if (!series) return

  const markPoint: Record<string, unknown> = {
    data: maxItem ? [{ coord: [String(maxItem[xKey] ?? ""), Number(maxItem[yKey]) || 0], symbol: "circle", symbolSize: 10, itemStyle: { color: "#F59E0B", borderColor: "#fff", borderWidth: 2 } }] : [],
  }

  if (Array.isArray(option.series)) {
    const first = option.series[0] as Record<string, unknown>
    first.markPoint = markPoint
  }
}

export function Chart({ data, config, onClick, onBrushSelect }: ChartProps) {
  const { resolved: themeMode } = useTheme()
  const isDark = themeMode === "dark"

  const { chartData, resolvedType, resolvedXKey, barGroups } = useMemo(() => {
    if (!data || data.length === 0) return { chartData: [], resolvedType: "bar", resolvedXKey: config.xKey }

    const yKey = config.yKey || ""
    const rawData = yKey
      ? data.map((row) => ({ ...row, [yKey]: Number(row[yKey]) || 0 }))
      : data

    const type = resolveType(config.type)

    if (type === "composed" && config.series?.length) {
      return { chartData: rawData, resolvedType: type, resolvedXKey: config.xKey }
    }

    if (yKey && type !== "pie" && type !== "radar" && type !== "radialBar" && type !== "treemap") {
      const pivoted = autoPivot(rawData, yKey, config.xKey)
      return { chartData: pivoted.data, resolvedType: type, resolvedXKey: pivoted.xKey, barGroups: pivoted.barGroups }
    }

    return { chartData: rawData, resolvedType: type, resolvedXKey: config.xKey }
  }, [data, config.type, config.xKey, config.yKey, config.series])

  const yKey = config.yKey || config.series?.[0]?.yKey || ""
  const stats = useMemo(() => yKey ? computeStats(chartData, yKey) : { max: 0, maxItem: null }, [chartData, yKey])

  const handleEvents = useCallback((chart: unknown) => {
    const echarts = chart as { on: (event: string, handler: (params: unknown) => void) => void }
    if (!echarts?.on) return

    // Click event
    echarts.on("click", (params: unknown) => {
      if (!onClick) return
      const p = params as { name?: string; value?: number | number[]; data?: Record<string, unknown>; dataIndex?: number; seriesName?: string }
      const key = p.name ?? ""
      const rawVal = Array.isArray(p.value) ? p.value[p.value.length - 1] : p.value
      const value = Number(rawVal) || 0
      const row = p.data ?? (p.dataIndex !== undefined ? chartData[p.dataIndex] ?? {} : {})
      onClick({ key, value, row })
    })

    // Brush select event
    if (onBrushSelect) {
      echarts.on("brushSelected", (params: unknown) => {
        const p = params as { batch?: { selected?: { dataIndex?: number[] }[] }[] }
        const indices = p.batch?.[0]?.selected?.[0]?.dataIndex ?? []
        const selected = indices.map((i: number) => chartData[i]).filter(Boolean)
        if (selected.length > 0) onBrushSelect(selected)
      })
    }
  }, [onClick, onBrushSelect, chartData])

  const option = useMemo((): EChartsOption => {
    if (chartData.length === 0) return {}

    const series = buildSeries(resolvedType, chartData, config, resolvedXKey, barGroups, isDark)
    const hasMultipleSeries = series.length > 1 || !!barGroups?.length || (config.series?.length ?? 0) > 1
    const needsXY = !["pie", "radar", "radialBar", "treemap"].includes(resolvedType)

    const opt: EChartsOption = {
      color: COLORS,
      tooltip: buildTooltip(isDark),
      toolbox: buildToolbox(resolvedType, hasMultipleSeries),
      animation: true,
      animationDuration: 600,
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

      if (["bar", "line", "area", "scatter", "composed"].includes(resolvedType) && isSequentialData(chartData, resolvedXKey)) {
        opt.dataZoom = buildDataZoom()
      }

      if (onBrushSelect) {
        opt.brush = buildBrush(resolvedXKey, chartData, onBrushSelect)
      }
    }

    if (resolvedType === "radar") {
      opt.radar = {
        indicator: chartData.map((d) => ({ name: String(d[resolvedXKey] ?? "").slice(0, 8) })),
        shape: "polygon",
        splitArea: { areaStyle: { color: isDark ? ["#1a1a2e", "#16213e"] : ["#f5f5ff", "#fff"] } },
        axisLine: { lineStyle: { color: isDark ? "#444" : "#ddd" } },
        splitLine: { lineStyle: { color: isDark ? "#333" : "#eee" } },
      }
    }

    if (resolvedType === "radialBar") {
      opt.polar = { radius: ["20%", "80%"] }
      opt.angleAxis = {
        max: Math.max(...chartData.map((d) => Number(d[yKey]) || 0)) * 1.2,
        show: false,
      }
      opt.radiusAxis = {
        type: "category",
        data: chartData.map((d) => String(d[resolvedXKey] ?? "")),
        axisLabel: { fontSize: 9 },
      }
    }

    opt.series = series

    if (needsXY && yKey) {
      markMax(opt, stats.maxItem, resolvedXKey, yKey, resolvedType)
    }

    return opt
  }, [chartData, config, resolvedType, resolvedXKey, barGroups, isDark, stats, yKey, onBrushSelect])

  const height = config.height ?? 280

  if (!data || data.length === 0) return null

  return (
    <div className="w-full rounded border border-border p-3">
      <ReactECharts
        option={option}
        style={{ height, width: "100%" }}
        onChartReady={handleEvents}
        opts={{ renderer: "canvas" }}
        theme={isDark ? "dark" : undefined}
      />
    </div>
  )
}
