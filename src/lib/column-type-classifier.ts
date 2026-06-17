import type { ColumnMeta } from "./types"

export type ColumnKind = "dimension" | "indicator" | "date" | "array" | "boolean" | "other"
export type FieldRole = "dimension" | "indicator"

export interface ResolvedFieldRole {
  role: FieldRole
  defaultRole: FieldRole
  isOverridden: boolean
}

const METRIC_KEYWORDS = ["amount", "avg", "balance", "budget", "cost", "count", "fee", "max", "min", "pct", "percent", "price", "profit", "qty", "quantity", "rate", "revenue", "sales", "sold", "sum", "total", "units", "value", "volume"]

const METRIC_PREFIX_PATTERN = new RegExp(`^(${METRIC_KEYWORDS.join("|")})`, "i")

/**
 * Prefix-anchored metric detection. `sum_sales` → true; `user_count` → false.
 * Use when filtering metric columns from query results (avoids false positives on dimension names that contain metric words).
 */
export function isMetricColumn(name?: string): boolean {
  if (!name) return false
  return METRIC_PREFIX_PATTERN.test(name)
}

const KEY_SEPARATOR = "\u0000"

export function createFieldRoleKey(database: string, table: string, column: string): string {
  return [database, table, column].map(encodeURIComponent).join(KEY_SEPARATOR)
}

export function parseFieldRoleKey(key: string): { database: string; table: string; column: string } {
  const [database, table, column] = key.split(KEY_SEPARATOR).map(decodeURIComponent)
  return { database, table, column }
}

export function unwrapNullable(type: string): string {
  return type.replace(/^Nullable\((.+)\)$/, "$1")
}

export function formatType(type: string): string {
  return type
    .replace(/^Nullable\((.+)\)$/, "$1?")
    .replace(/^Decimal\(\d+,\s*\d+\)$/, "Decimal")
    .replace(/^DateTime(64)?(\(.*\))?$/, "DateTime")
    .replace(/^Array\((.+)\)$/, "[$1]")
    .replace(/^FixedString\(\d+\)$/, "String")
    .replace(/^LowCardinality\((.+)\)$/, "$1")
}

export function isDimensionType(type: string): boolean {
  const base = unwrapNullable(type)
  return /^(String|FixedString|LowCardinality|Date|DateTime|Bool|Enum)/.test(base)
}

export function isIndicatorType(type: string): boolean {
  const base = unwrapNullable(type)
  return /^(Int|UInt|Float|Decimal)/.test(base)
}

export function isMetricByName(name: string): boolean {
  const lower = name.toLowerCase()
  return METRIC_KEYWORDS.some((k) => lower.includes(k))
}

export function classifyColumnType(type: string): ColumnKind {
  const base = unwrapNullable(type)
  if (/^(Int|UInt|Float|Decimal)/.test(base)) return "indicator"
  if (/^(Date|DateTime)/.test(base)) return "date"
  if (base === "Bool") return "boolean"
  if (/^Array\(/.test(base)) return "array"
  if (/^(String|FixedString|LowCardinality|Enum)/.test(base)) return "dimension"
  return "other"
}

export function inferDefaultFieldRole(type: string): FieldRole | null {
  if (isDimensionType(type)) return "dimension"
  if (isIndicatorType(type)) return "indicator"
  return null
}

export function getNextFieldRole(role: FieldRole): FieldRole {
  return role === "dimension" ? "indicator" : "dimension"
}

export function getFieldRole(type: string, override?: FieldRole): ResolvedFieldRole | null {
  const defaultRole = inferDefaultFieldRole(type)
  if (!defaultRole) return null
  return {
    role: override ?? defaultRole,
    defaultRole,
    isOverridden: Boolean(override),
  }
}

export function resolveFieldRole(
  field: string,
  schema: ColumnMeta[],
  overrides: Record<string, FieldRole>,
  database: string,
  table: string
): ResolvedFieldRole | null {
  const meta = schema.find((s) => s.name === field)
  if (!meta) return null
  const key = createFieldRoleKey(database, table, field)
  const override = overrides[key]
  return getFieldRole(meta.type, override)
}


