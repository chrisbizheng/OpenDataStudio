import { escapeField, validateDirection, escapeValue } from "./sql-utils"

export function buildSelectSql(
  database: string,
  table: string,
  options?: { orderBy?: string; direction?: "ASC" | "DESC"; limit?: number }
): string {
  const qualified = `${escapeField(database)}.${escapeField(table)}`
  const limit = options?.limit ?? 1000
  if (options?.orderBy && options?.direction) {
    const dir = validateDirection(options.direction)
    return `SELECT * FROM ${qualified} ORDER BY ${escapeField(options.orderBy)} ${dir} LIMIT ${limit}`
  }
  return `SELECT * FROM ${qualified} LIMIT ${limit}`
}

export function buildDrilldownSql(
  database: string,
  table: string,
  dimensionValues: Record<string, unknown>,
  limit = 10000
): string {
  const qualified = `${escapeField(database)}.${escapeField(table)}`
  const conditions = Object.entries(dimensionValues)
    .map(([k, v]) => `${escapeField(k)} = ${escapeValue(v)}`)
    .join(" AND ")
  return `SELECT * FROM ${qualified}${conditions ? ` WHERE ${conditions}` : ""} LIMIT ${limit}`
}

export function buildSortDirection(
  currentColumn: string | null,
  currentDirection: "asc" | "desc" | null,
  clickedColumn: string
): "asc" | "desc" | null {
  if (currentColumn !== clickedColumn) return "asc"
  if (currentDirection === "asc") return "desc"
  if (currentDirection === "desc") return null
  return "asc"
}
