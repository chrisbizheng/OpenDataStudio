export function unwrapNullable(type: string): string {
  return type.replace(/^Nullable\((.+)\)$/, "$1")
}

export function shortType(type: string): string {
  return type
    .replace(/^Nullable\((.+)\)$/, "$1?")
    .replace(/^Decimal\(\d+,\s*\d+\)$/, "Decimal")
    .replace(/^DateTime(64)?(\(.*\))?$/, "DateTime")
    .replace(/^Array\((.+)\)$/, "[$1]")
    .replace(/^FixedString\(\d+\)$/, "String")
    .replace(/^LowCardinality\((.+)\)$/, "$1")
}

const METRIC_PATTERN = /amount|total|price|quantity|revenue|cost|sales|value|count|volume|budget|profit|sum|balance|fee|rate/i

export function isMetricColumn(name?: string): boolean {
  if (!name) return false
  return METRIC_PATTERN.test(name)
}

export const NUM_KEYWORDS = ["amount", "total", "price", "quantity", "revenue", "cost", "sales", "value", "count", "volume", "budget", "profit", "sum", "balance", "fee", "rate"]

export function isDimensionType(type: string): boolean {
  const base = unwrapNullable(type)
  return /^(String|FixedString|LowCardinality|Date|DateTime|Bool|Enum)/.test(base)
}

export function isIndicatorType(type: string): boolean {
  const base = unwrapNullable(type)
  return /^(Int|UInt|Float|Decimal)/.test(base)
}
