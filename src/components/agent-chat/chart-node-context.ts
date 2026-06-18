import type { DeepDiveItem } from "@/lib/deep-dive-directions"
import type { VisualizationConfig } from "@/lib/chart-types"

export interface ChartNodeContextInput {
  item: DeepDiveItem
  visualization: VisualizationConfig
  lang: string
}

export interface ChartNodeContext {
  dimensions: [string, unknown][]
  metricLabel: string
  metricValue: string
}

function metricKeys(visualization: VisualizationConfig): string[] {
  const keys = new Set<string>()
  if (visualization.config.yKey) keys.add(visualization.config.yKey)
  for (const s of visualization.config.series ?? []) keys.add(s.yKey)
  return [...keys]
}

export function getChartNodeContext(input: ChartNodeContextInput): ChartNodeContext {
  const metrics = new Set(metricKeys(input.visualization))
  const dimensions = Object.entries(input.item.row).filter(([key]) => !metrics.has(key))
  const fallbackDimensions: [string, unknown][] = input.visualization.config.xKey
    ? [[input.visualization.config.xKey, input.item.key]]
    : [[input.lang === "zh" ? "维度" : "Dimension", input.item.key]]
  const series = input.visualization.config.series?.find((s) => s.label === input.item.seriesName || s.yKey === input.item.seriesName)

  return {
    dimensions: dimensions.length > 0 ? dimensions : fallbackDimensions,
    metricLabel: input.item.seriesName || series?.label || input.visualization.config.yKey || (input.lang === "zh" ? "指标" : "Metric"),
    metricValue: input.item.value.toLocaleString(),
  }
}
