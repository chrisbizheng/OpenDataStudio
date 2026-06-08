export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function toCsv(columns: string[], rows: unknown[][]): string {
  const header = columns.join(",")
  const body = rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? "")
          return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(",")
    )
    .join("\n")
  return `${header}\n${body}`
}

export function toJson(columns: string[], rows: unknown[][]): string {
  return JSON.stringify(
    rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]]))),
    null,
    2
  )
}

export function exportData(
  tableName: string,
  rowCount: number,
  columns: string[],
  rows: unknown[][],
  format: "csv" | "json"
) {
  const ts = new Date().toISOString().slice(0, 19).replace(/[:]/g, "-")
  if (format === "csv") {
    downloadFile(`${tableName}_${rowCount}rows_${ts}.csv`, toCsv(columns, rows), "text/csv")
  } else {
    downloadFile(`${tableName}_${rowCount}rows_${ts}.json`, toJson(columns, rows), "application/json")
  }
}
