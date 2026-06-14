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

const METRIC_KEYWORDS = ["amount", "avg", "balance", "budget", "cost", "count", "fee", "max", "min", "pct", "percent", "price", "profit", "qty", "quantity", "rate", "revenue", "sales", "sold", "sum", "total", "units", "value", "volume"]

const METRIC_PATTERN = new RegExp(`^(${METRIC_KEYWORDS.join("|")})`, "i")

export function isMetricColumn(name?: string): boolean {
  if (!name) return false
  return METRIC_PATTERN.test(name)
}

export function isMetricByName(name: string): boolean {
  const lower = name.toLowerCase()
  return METRIC_KEYWORDS.some((k) => lower.includes(k))
}

export function isDimensionType(type: string): boolean {
  const base = unwrapNullable(type)
  return /^(String|FixedString|LowCardinality|Date|DateTime|Bool|Enum)/.test(base)
}

export function isIndicatorType(type: string): boolean {
  const base = unwrapNullable(type)
  return /^(Int|UInt|Float|Decimal)/.test(base)
}
