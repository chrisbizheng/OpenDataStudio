import { matchRow } from "./grid-filter"

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
