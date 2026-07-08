import { formatType } from "@/lib/column-type-classifier"

interface GridColumn {
  name: string
  type?: string
  comment?: string
}

export function textWidth(s: string): number {
  let w = 0
  for (const ch of s) {
    w += ch.charCodeAt(0) > 127 ? 12 : 8.5
  }
  return w + 24
}

export function computeColumnWidths(
  columns: string[],
  rows: unknown[][],
  gridColumns: GridColumn[]
): number[] {
  const widths: number[] = [28]
  const sample = rows.slice(0, 100)
  for (let i = 0; i < columns.length; i++) {
    const colMeta = gridColumns[i]
    let maxDataLen = 0
    for (const row of sample) {
      const str = row[i] != null ? String(row[i]) : ""
      maxDataLen = Math.max(maxDataLen, str.length)
    }
    const nameW = textWidth(columns[i])
    const typeW = colMeta.type ? textWidth(formatType(colMeta.type)) : 0
    const commentW = colMeta?.comment ? textWidth(colMeta.comment) : 0
    const headerW = Math.max(nameW, typeW, commentW)
    const dataW = maxDataLen * 7.5 + 16
    const width = Math.min(300, Math.max(64, Math.max(headerW, dataW)))
    widths.push(Math.ceil(width))
  }
  return widths
}
