import type { PivotIndicator } from "@/lib/pivot-sql"

export const AGGREGATION_OPTIONS = [
  { value: "SUM", label: "SUM", shortLabel: "SUM" },
  { value: "AVG", label: "AVG", shortLabel: "AVG" },
  { value: "COUNT", label: "COUNT", shortLabel: "CNT" },
  { value: "MIN", label: "MIN", shortLabel: "MIN" },
  { value: "MAX", label: "MAX", shortLabel: "MAX" },
  { value: "DISTINCT_COUNT", label: "COUNT DISTINCT", shortLabel: "DCT" },
] as const

export function aggregationShortLabel(value: PivotIndicator["aggregation"]) {
  return AGGREGATION_OPTIONS.find((option) => option.value === value)?.shortLabel ?? value
}

export function formatLabel(
  indicator: { format?: "number" | "percent" | "currency"; decimals?: number },
  _t: (key: string) => string,
) {
  const format = indicator.format ?? "number"
  const decimals = indicator.decimals ?? 2
  if (format === "percent") return _t("calc_ind.format_label_percent").replace("{n}", String(decimals))
  if (format === "currency") return _t("calc_ind.format_label_currency").replace("{n}", String(decimals))
  return _t("calc_ind.format_label_number").replace("{n}", String(decimals))
}
