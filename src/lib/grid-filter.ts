export function matchRow(row: unknown[], query: string): boolean {
  const q = query.toLowerCase()
  return row.some((cell) => String(cell ?? "").toLowerCase().includes(q))
}

export function createGridFilter() {
  let lastRowsRef: unknown[][] | null = null
  let lastQuery = ""
  let lastResult: unknown[][] | null = null

  return function filterRows(rows: unknown[][], searchQuery: string): unknown[][] {
    if (!searchQuery.trim()) return rows
    if (rows === lastRowsRef && searchQuery === lastQuery && lastResult) {
      return lastResult
    }
    const result = rows.filter((row) => matchRow(row, searchQuery))
    lastRowsRef = rows
    lastQuery = searchQuery
    lastResult = result
    return result
  }
}
