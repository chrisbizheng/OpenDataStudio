"use client"

import { useCallback, useState } from "react"
import type { ChartConfig, SeriesConfig } from "@/lib/chart-types"

/**
 * Shared ChartConfig editing state — eliminates the setState-wrapper
 * duplication between `widget-config-editor.tsx` and
 * `create-widget-sql-dialog.tsx` (updateField / addSeries / removeSeries /
 * updateSeriesField / updateAxis / updateStyle / updateLabel were copied
 * verbatim across both).
 *
 * Returns the current config plus immutable updaters. Callers that only
 * need a subset of the updaters simply ignore the rest.
 */
export function useVizConfig(initial: ChartConfig) {
  const [config, setConfig] = useState<ChartConfig>(initial)

  const updateField = useCallback(
    <K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const updateAxis = useCallback(
    <K extends keyof NonNullable<ChartConfig["axis"]>>(
      key: K,
      value: NonNullable<ChartConfig["axis"]>[K],
    ) => {
      setConfig((prev) => ({ ...prev, axis: { ...prev.axis, [key]: value } }))
    },
    [],
  )

  const updateStyle = useCallback(
    <K extends keyof NonNullable<ChartConfig["style"]>>(
      key: K,
      value: NonNullable<ChartConfig["style"]>[K],
    ) => {
      setConfig((prev) => ({ ...prev, style: { ...prev.style, [key]: value } }))
    },
    [],
  )

  const updateLabel = useCallback(
    <K extends keyof NonNullable<ChartConfig["label"]>>(
      key: K,
      value: NonNullable<ChartConfig["label"]>[K],
    ) => {
      setConfig((prev) => ({ ...prev, label: { ...prev.label, [key]: value } }))
    },
    [],
  )

  const addSeries = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      series: [...(prev.series ?? []), { yKey: "" }],
    }))
  }, [])

  const removeSeries = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      series: prev.series?.filter((_, i) => i !== index),
    }))
  }, [])

  const updateSeriesField = useCallback(
    (index: number, field: keyof SeriesConfig, value: string) => {
      setConfig((prev) => {
        const series = [...(prev.series ?? [])]
        if (series[index]) {
          series[index] = { ...series[index], [field]: value }
        }
        return { ...prev, series }
      })
    },
    [],
  )

  return {
    config,
    setConfig,
    updateField,
    updateAxis,
    updateStyle,
    updateLabel,
    addSeries,
    removeSeries,
    updateSeriesField,
  }
}
