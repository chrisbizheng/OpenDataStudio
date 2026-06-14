"use client"

import { useMemo, useCallback } from "react"
import ReactECharts from "echarts-for-react"
import { useTheme } from "@/components/theme-provider"
import {
  resolveType,
  autoPivot,
  computeStats,
} from "@/lib/chart-data"
import {
  buildEChartsOption,
  type ChartConfig,
} from "@/lib/chart-helpers"

interface ChartProps {
  data: Record<string, unknown>[]
  config: ChartConfig
  onClick?: (item: { key: string; value: number; row: Record<string, unknown>; seriesName?: string }) => void
  onBrushSelect?: (items: Record<string, unknown>[]) => void
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

    echarts.on("click", (params: unknown) => {
      if (!onClick) return
      const p = params as { name?: string; value?: number | number[]; data?: Record<string, unknown>; dataIndex?: number; seriesName?: string }
      const key = p.name ?? ""
      const rawVal = Array.isArray(p.value) ? p.value[p.value.length - 1] : p.value
      const value = Number(rawVal) || 0
      const row = p.data && typeof p.data === "object" && !Array.isArray(p.data)
        ? p.data
        : (p.dataIndex !== undefined ? chartData[p.dataIndex] ?? {} : {})
      onClick({ key, value, row, seriesName: p.seriesName })
    })

    if (onBrushSelect) {
      echarts.on("brushSelected", (params: unknown) => {
        const p = params as { batch?: { selected?: { dataIndex?: number[] }[] }[] }
        const indices = p.batch?.[0]?.selected?.[0]?.dataIndex ?? []
        const selected = indices.map((i: number) => chartData[i]).filter(Boolean)
        if (selected.length > 0) onBrushSelect(selected)
      })
    }
  }, [onClick, onBrushSelect, chartData])

  const option = useMemo(() =>
    buildEChartsOption({
      chartData, config, resolvedType, resolvedXKey, barGroups,
      isDark, stats, yKey, onBrushSelect,
    }),
    [chartData, config, resolvedType, resolvedXKey, barGroups, isDark, stats, yKey, onBrushSelect]
  )

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
