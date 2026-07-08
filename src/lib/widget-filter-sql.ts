import { escapeSqlString } from "@/lib/sql-utils"
import type { DashboardFilter } from "@/stores/dashboards"

/** Characters that are safe in ClickHouse column identifiers */
const SAFE_COLUMN_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Build a single WHERE clause fragment from a DashboardFilter.
 * Returns null if the filter should be skipped (empty value, bad column, etc).
 */
export function buildFilterClause(filter: DashboardFilter): string | null {
  // Validate column name against injection: only allow alphanumeric + underscore
  if (!SAFE_COLUMN_RE.test(filter.column)) {
    console.warn(`[buildFilteredSql] Invalid column name rejected: "${filter.column}"`)
    return null
  }

  const op = filter.operator ?? "="

  switch (op) {
    case "=":
    case "!=":
    case ">":
    case "<":
    case ">=":
    case "<=": {
      if (!filter.value) return null
      return `\`${filter.column}\` ${op} '${escapeSqlString(filter.value)}'`
    }

    case "IN":
    case "NOT IN": {
      if (!filter.values || filter.values.length === 0) return null
      const inValues = filter.values.map((v) => `'${escapeSqlString(v)}'`).join(", ")
      return `\`${filter.column}\` ${op} (${inValues})`
    }

    case "LIKE": {
      if (!filter.value) return null
      const likeVal = escapeSqlString(filter.value)
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_")
      return `\`${filter.column}\` LIKE '%${likeVal}%'`
    }

    case "BETWEEN": {
      if (!filter.values || filter.values.length < 2) return null
      return `\`${filter.column}\` BETWEEN '${escapeSqlString(filter.values[0])}' AND '${escapeSqlString(filter.values[1])}'`
    }

    default:
      console.warn(`[buildFilteredSql] Unknown operator: "${op}"`)
      return null
  }
}

/** Wrap SQL with dashboard filter WHERE clauses */
export function buildFilteredSql(baseSql: string, filters: DashboardFilter[]): string {
  if (filters.length === 0) return baseSql
  const whereClauses = filters
    .map(buildFilterClause)
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
