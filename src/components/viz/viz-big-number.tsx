"use client"

interface VizBigNumberProps {
  columns: string[]
  rows: unknown[][]
  config: {
    title?: string
    yKey?: string
    format?: "number" | "percent" | "currency"
    decimals?: number
  }
}

function findNumericColumn(columns: string[], rows: unknown[][]): string | null {
  if (rows.length === 0) return null
  const sample = rows[0]
  for (let i = 0; i < columns.length; i++) {
    const val = sample[i]
    if (typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)) && val !== "")) {
      return columns[i]
    }
  }
  return null
}

function getValue(columns: string[], rows: unknown[][], yKey: string): number | null {
  if (rows.length === 0) return null
  const idx = columns.indexOf(yKey)
  if (idx === -1) return null
  const raw = rows[0][idx]
  if (raw == null) return null
  const n = Number(raw)
  return isNaN(n) ? null : n
}

function formatValue(value: number, format: string, decimals?: number): string {
  switch (format) {
    case "percent":
      return `${value.toFixed(decimals ?? 1)}%`
    case "currency":
      return `¥${(decimals !== undefined ? value.toFixed(decimals) : value.toLocaleString())}`
    case "number":
    default:
      if (decimals !== undefined) {
        return value.toFixed(decimals)
      }
      return value.toLocaleString()
  }
}

function computeTrend(columns: string[], rows: unknown[][], yKey: string): number | null {
  if (rows.length < 2) return null
  const idx = columns.indexOf(yKey)
  if (idx === -1) return null
  const first = Number(rows[0][idx])
  const last = Number(rows[rows.length - 1][idx])
  if (isNaN(first) || isNaN(last) || first === 0) return null
  return ((last - first) / first) * 100
}

export function VizBigNumber({ columns, rows, config }: VizBigNumberProps) {
  const yKey = config.yKey || findNumericColumn(columns, rows) || columns[0] || ""
  const value = getValue(columns, rows, yKey)
  const trend = computeTrend(columns, rows, yKey)

  if (value === null) {
    return (
      <div className="rounded border border-border p-4 flex flex-col items-center justify-center h-full min-h-[200px]">
        <span className="text-4xl text-muted-foreground">&mdash;</span>
      </div>
    )
  }

  return (
    <div className="rounded border border-border p-4 flex flex-col items-center justify-center h-full min-h-[200px]">
      {config.title && (
        <div className="text-xs text-muted-foreground mb-2">{config.title}</div>
      )}
      <div className="text-4xl font-bold tabular-nums">
        {formatValue(value, config.format ?? "number", config.decimals)}
      </div>
      {trend !== null && (
        <div
          className={`text-sm mt-2 font-medium ${
            trend >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  )
}
