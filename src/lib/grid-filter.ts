export function createGridFilter() {
  let lastRowsRef: unknown[][] | null = null
  let lastQuery = ""
  let lastResult: unknown[][] | null = null

  return function filterRows(rows: unknown[][], searchQuery: string): unknown[][] {
    if (!searchQuery.trim()) return rows
    if (rows === lastRowsRef && searchQuery === lastQuery && lastResult) {
      return lastResult
    }
    const q = searchQuery.toLowerCase()
    const result = rows.filter((row) =>
      row.some((cell) => String(cell ?? "").toLowerCase().includes(q))
    )
    lastRowsRef = rows
    lastQuery = searchQuery
    lastResult = result
    return result
  }
}
