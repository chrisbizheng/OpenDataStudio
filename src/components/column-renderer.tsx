import { unwrapNullable } from "@/lib/column-type-classifier"
import { isMetricColumn } from "@/lib/column-utils"

export function renderValue(value: unknown, type?: string, columnName?: string): React.ReactNode {
  if (value === null || value === undefined) {
    return <NullBadge />
  }

  const baseType = type ? unwrapNullable(type) : ""

  if (baseType.startsWith("Int") || baseType.startsWith("UInt")) {
    return <NumberCell value={value as number} columnName={columnName} />
  }

  if (
    baseType.startsWith("Float") ||
    baseType.startsWith("Decimal")
  ) {
    return <NumberCell value={value as number} columnName={columnName} />
  }

  if (baseType.startsWith("DateTime") || baseType === "Date") {
    return <DateCell value={value as string} />
  }

  if (baseType === "Bool") {
    return value ? "✓" : "✗"
  }

  if (baseType.startsWith("Array(") || Array.isArray(value)) {
    return <ArrayCell value={value as unknown[]} />
  }

  if (typeof value === "object" && value !== null) {
    return <ObjectCell value={value as Record<string, unknown>} />
  }

  return <span className="text-foreground">{String(value)}</span>
}



function NullBadge() {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[10px] text-muted-foreground font-mono">
      ∅
    </span>
  )
}

function NumberCell({ value, columnName }: { value: number; columnName?: string }) {
  const thousands = isMetricColumn(columnName)
  const formatted = typeof value === "number"
    ? Number.isInteger(value)
      ? thousands ? value.toLocaleString() : String(value)
      : formatDecimal(value, thousands)
    : String(value)
  return (
    <span className="font-mono text-right text-blue-600 dark:text-blue-400 tabular-nums block">
      {formatted}
    </span>
  )
}

function formatDecimal(value: number, thousands: boolean): string {
  const fixed = value.toFixed(4)
  if (!thousands) return fixed
  const dot = fixed.indexOf(".")
  if (dot === -1) return fixed
  const int = fixed.slice(0, dot)
  const dec = fixed.slice(dot + 1)
  return `${parseInt(int).toLocaleString()}.${dec}`
}

function DateCell({ value }: { value: string }) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return <span>{value}</span>
  return (
    <span className="text-muted-foreground">
      {d.toLocaleString()}
    </span>
  )
}

function ArrayCell({ value }: { value: unknown[] }) {
  const preview = value.slice(0, 3)
  const remaining = value.length - 3
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {preview.map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-mono"
        >
          {String(item)}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-[10px] text-muted-foreground">
          +{remaining}
        </span>
      )}
    </span>
  )
}

function ObjectCell({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value).slice(0, 3)
  const remaining = Object.keys(value).length - 3
  return (
    <span className="inline-flex items-center gap-1 flex-wrap text-[10px]">
      {entries.map(([k, v]) => (
        <span key={k} className="text-muted-foreground">
          {k}: {String(v)}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-muted-foreground">
          … +{remaining} keys
        </span>
      )}
    </span>
  )
}

