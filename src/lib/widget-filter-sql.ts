import { escapeSqlString } from "@/lib/sql-utils"
import type { DashboardFilter } from "@/stores/dashboards"

/** Characters that are safe in ClickHouse column identifiers */
const SAFE_COLUMN_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/** Wrap SQL with dashboard filter WHERE clauses */
export function buildFilteredSql(baseSql: string, filters: DashboardFilter[]): string {
  if (filters.length === 0) return baseSql
  const whereClauses = filters
    .filter((f) => f.column && f.value)
    .map((f) => {
      // Validate column name against injection: only allow alphanumeric + underscore
      if (!SAFE_COLUMN_RE.test(f.column)) {
        console.warn(`[buildFilteredSql] Invalid column name rejected: "${f.column}"`)
        return null
      }
      const escapedValue = escapeSqlString(String(f.value))
      return `\`${f.column}\` = '${escapedValue}'`
    })
    .filter(Boolean)
    .join(" AND ")

  if (!whereClauses) return baseSql

  const upperSql = baseSql.toUpperCase().trim()

  if (upperSql.includes("WHERE")) {
    const whereIdx = upperSql.indexOf("WHERE")
    return baseSql.slice(0, whereIdx + 5) + " (" + whereClauses + ") AND" + baseSql.slice(whereIdx + 5)
  }

  const insertBefore = /\b(GROUP\s+BY|ORDER\s+BY|LIMIT|HAVING)\b/i.exec(baseSql)
  if (insertBefore) {
    return baseSql.slice(0, insertBefore.index) + "WHERE " + whereClauses + " " + baseSql.slice(insertBefore.index)
  }

  return baseSql + " WHERE " + whereClauses
}
