import type { ChartConfig } from "@/lib/chart-helpers"

export const NO_AXIS_TYPES = ["pie", "treemap", "radar", "radialBar"]

export function configsEqual(a: ChartConfig, b: ChartConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export interface TabSharedProps {
  local: ChartConfig
  updateField: <K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) => void
  updateAxis: <K extends keyof NonNullable<ChartConfig["axis"]>>(key: K, value: NonNullable<ChartConfig["axis"]>[K]) => void
  updateStyle: <K extends keyof NonNullable<ChartConfig["style"]>>(key: K, value: NonNullable<ChartConfig["style"]>[K]) => void
  updateLabel: <K extends keyof NonNullable<ChartConfig["label"]>>(key: K, value: NonNullable<ChartConfig["label"]>[K]) => void
}
