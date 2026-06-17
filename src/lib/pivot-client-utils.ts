import type { AggregationType, PivotIndicator } from "./pivot-sql"
import { isIndicatorType } from "./column-type-classifier"

export function toggleFilterValue(values: unknown[], value: unknown): unknown[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

export const NUMERIC_AGGREGATION_ORDER: AggregationType[] = [
  "SUM",
  "AVG",
  "COUNT",
  "MIN",
  "MAX",
  "DISTINCT_COUNT",
]

export const NON_NUMERIC_AGGREGATION_ORDER: AggregationType[] = [
  "COUNT",
  "DISTINCT_COUNT",
]

export function buildPivotIndicatorTitle(field: string, aggregation: AggregationType): string {
  return `${field}-${aggregation}`
}

export function buildNextPivotIndicator(
  field: string,
  comment: string,
  existing: PivotIndicator[],
  fieldType?: string
): PivotIndicator {
  const isNumeric = fieldType == null || isIndicatorType(fieldType)
  const aggregationOrder = isNumeric ? NUMERIC_AGGREGATION_ORDER : NON_NUMERIC_AGGREGATION_ORDER
  const used = new Set(existing.filter((indicator) => indicator.field === field).map((indicator) => indicator.aggregation))
  const aggregation = aggregationOrder.find((agg) => !used.has(agg)) ?? "COUNT"
  const title = buildPivotIndicatorTitle(field, aggregation)
  return {
    key: title,
    field,
    title,
    aggregation,
    comment: comment !== field ? comment : undefined,
  }
}

function matchRow(row: unknown[], query: string): boolean {
  const q = query.toLowerCase()
  return row.some((cell) => String(cell ?? "").toLowerCase().includes(q))
}

export interface PivotClientData {
  columns: string[]
  rows: unknown[][]
}

export type PivotSortDir = "asc" | "desc" | null

export function filterAndSortPivotData(
  data: PivotClientData,
  searchQuery: string,
  sortColumn: string | null,
  sortDir: PivotSortDir
): PivotClientData {
  if (data.rows.length === 0) return data

  let rows = data.rows
  const cols = data.columns

  if (searchQuery.trim()) {
    rows = rows.filter((row) => matchRow(row, searchQuery))
  }

  if (sortColumn && sortDir) {
    const colIdx = cols.indexOf(sortColumn)
    if (colIdx >= 0) {
      rows = [...rows].sort((a, b) => {
        const va = a[colIdx]
        const vb = b[colIdx]
        if (va == null && vb == null) return 0
        if (va == null) return 1
        if (vb == null) return -1
        const na = typeof va === "number" ? va : Number(va)
        const nb = typeof vb === "number" ? vb : Number(vb)
        if (!isNaN(na) && !isNaN(nb)) {
          return sortDir === "asc" ? na - nb : nb - na
        }
        const sa = String(va)
        const sb = String(vb)
        return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa)
      })
    }
  }

  return rows === data.rows ? data : { columns: cols, rows }
}

export function buildPivotRecords(data: PivotClientData): Record<string, unknown>[] {
  return data.rows.map((row) => {
    const record: Record<string, unknown> = {}
    data.columns.forEach((col, i) => {
      record[col] = row[i]
    })
    return record
  })
}
