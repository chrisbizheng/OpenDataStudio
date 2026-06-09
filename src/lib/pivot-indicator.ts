import type { AggregationType, PivotIndicator } from "@/lib/pivot-sql"

const DEFAULT_AGGREGATION_ORDER: AggregationType[] = [
  "SUM",
  "AVG",
  "COUNT",
  "MIN",
  "MAX",
  "DISTINCT_COUNT",
]

export function buildPivotIndicatorTitle(field: string, aggregation: AggregationType): string {
  return `${field}.[${aggregation}]`
}

export function buildNextPivotIndicator(
  field: string,
  title: string,
  existing: PivotIndicator[]
): PivotIndicator {
  const used = new Set(existing.filter((indicator) => indicator.field === field).map((indicator) => indicator.aggregation))
  const aggregation = DEFAULT_AGGREGATION_ORDER.find((agg) => !used.has(agg)) ?? "SUM"
  return {
    key: `${field}_${aggregation.toLowerCase()}`,
    field,
    title: buildPivotIndicatorTitle(field, aggregation),
    aggregation,
  }
}
