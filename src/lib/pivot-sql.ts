import { toSQL, getIndicatorSQLMap, topoSortCalculated } from "./calculated-indicator-expression"
import type { ExpressionNode, AggregationType } from "./calculated-indicator-expression"
import { escapeField, escapeValue } from "./sql-utils"

export { aggToSQL, getIndicatorSQLMap, topoSortCalculated, type AggregationType } from "./calculated-indicator-expression"

export type IndicatorFormat = "number" | "percent" | "currency"

export interface PivotIndicator {
  key: string
  field: string
  title: string
  aggregation: AggregationType
  format?: IndicatorFormat
  decimals?: number
  comment?: string
}

export interface CalculatedIndicator {
  key: string
  title: string
  logic: ExpressionNode
  format?: IndicatorFormat
  decimals?: number
}

export interface FilterRule {
  field: string
  op: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN" | "BETWEEN"
  value: unknown
}

export interface SortRule {
  field: string
  direction: "asc" | "desc"
}

export interface TotalsConfig {
  row?: { showGrandTotals: boolean; showSubTotals: boolean }
  column?: { showGrandTotals: boolean; showSubTotals: boolean }
}

export const LARGE_PIVOT_WARNING_THRESHOLD = 5000

export interface PivotConfig {
  rows: string[]
  columns: string[]
  indicators: PivotIndicator[]
  calculatedIndicators: CalculatedIndicator[]
  filters?: FilterRule[]
  sort?: SortRule
  totals?: TotalsConfig
  limit?: number
}

function buildWhereClause(filters?: FilterRule[]): string {
  if (!filters || filters.length === 0) return ""
  const clauses = filters.map((f) => {
    const field = escapeField(f.field)
    if (f.op === "IN") {
      const vals = Array.isArray(f.value) ? f.value : [f.value]
      const inList = vals.map((v) => escapeValue(v)).join(", ")
      return `${field} IN (${inList})`
    }
    if (f.op === "LIKE") {
      return `${field} LIKE ${escapeValue(f.value)}`
    }
    if (f.op === "BETWEEN") {
      const [from, to] = Array.isArray(f.value) ? f.value : [f.value, f.value]
      return `${field} BETWEEN ${escapeValue(from)} AND ${escapeValue(to)}`
    }
    return `${field} ${f.op} ${escapeValue(f.value)}`
  })
  return `WHERE ${clauses.join(" AND ")}`
}

export function generatePivotSQL(
  config: PivotConfig,
  tableName: string,
  database: string
): string {
  const allDimensions = [...config.rows, ...config.columns]
  const indicatorSQLMap = getIndicatorSQLMap(config.indicators)
  const sortedCalculated = topoSortCalculated(config.calculatedIndicators)

  const selectParts: string[] = []

  for (const dim of allDimensions) {
    selectParts.push(escapeField(dim))
  }

  for (const ind of config.indicators) {
    selectParts.push(`${indicatorSQLMap[ind.key]} AS ${escapeField(ind.key)}`)
  }

  for (const calc of sortedCalculated) {
    const sqlExpr = toSQL(calc.logic, indicatorSQLMap, { useAnyValue: true })
    selectParts.push(`${sqlExpr} AS ${escapeField(calc.key)}`)
  }

  const select = selectParts.join(",\n  ")
  const from = `FROM ${escapeField(database)}.${escapeField(tableName)}`
  const where = buildWhereClause(config.filters)
  const groupBy =
    allDimensions.length > 0
      ? `GROUP BY ${allDimensions.map(escapeField).join(", ")}`
      : ""
  const orderBy = config.sort
    ? `ORDER BY ${escapeField(config.sort.field)} ${config.sort.direction.toUpperCase()}`
    : allDimensions.length > 0
      ? `ORDER BY ${allDimensions.map(escapeField).join(", ")}`
      : ""
  const limit = config.limit ? `LIMIT ${config.limit}` : ""

  return [`SELECT\n  ${select}`, from, where, groupBy, orderBy, limit].filter(Boolean).join("\n")
}
