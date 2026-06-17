export { unwrapNullable, isDimensionType, isIndicatorType, isMetricByName } from "./column-type-classifier"

export { formatType as shortType } from "./column-type-classifier"

const METRIC_KEYWORDS = ["amount", "avg", "balance", "budget", "cost", "count", "fee", "max", "min", "pct", "percent", "price", "profit", "qty", "quantity", "rate", "revenue", "sales", "sold", "sum", "total", "units", "value", "volume"]
const METRIC_PATTERN = new RegExp(`^(${METRIC_KEYWORDS.join("|")})`, "i")

export function isMetricColumn(name?: string): boolean {
  if (!name) return false
  return METRIC_PATTERN.test(name)
}
