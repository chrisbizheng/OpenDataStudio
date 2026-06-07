"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { renderValue } from "./column-renderer"
import { useLang } from "@/components/lang-provider"
import type { ColumnMeta } from "@/lib/clickhouse"

interface DataGridProps {
  columns: string[]
  rows: unknown[][]
  schema: ColumnMeta[]
  selectedTable: string
  sortColumn?: string | null
  sortDirection?: "asc" | "desc" | null
  onSort?: (column: string) => void
  searchQuery?: string
  onSearchChange?: (q: string) => void
  loadedRows?: number
  onLoadMore?: () => void
  isLoading?: boolean
  onDownloadCsv?: () => void
  onDownloadJson?: () => void
}

const ROW_HEIGHT = 32

export function DataGrid({
  columns,
  rows,
  schema,
  sortColumn,
  sortDirection,
  onSort,
  searchQuery,
  onSearchChange,
  loadedRows,
  onLoadMore,
  isLoading,
  onDownloadCsv,
  onDownloadJson,
}: DataGridProps) {
  const { _t } = useLang()
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [hoveredCol, setHoveredCol] = useState<string | null>(null)

  const colWidths = useMemo(() => {
    const widths: number[] = [28]
    const sample = rows.slice(0, 100)
    for (let i = 0; i < columns.length; i++) {
      const colMeta = schema.find((s) => s.name === columns[i])
      let maxDataLen = 0
      for (const row of sample) {
        const str = row[i] != null ? String(row[i]) : ""
        maxDataLen = Math.max(maxDataLen, str.length)
      }
      const nameW = textWidth(columns[i])
      const typeW = colMeta ? textWidth(shortType(colMeta.type)) : 0
      const commentW = colMeta?.comment ? textWidth(colMeta.comment) : 0
      const headerW = Math.max(nameW, typeW, commentW)
      const dataW = maxDataLen * 7.5 + 16
      const width = Math.min(300, Math.max(64, Math.max(headerW, dataW)))
      widths.push(Math.ceil(width))
    }
    return widths
  }, [columns, rows, schema])

  const colStyle = useCallback(
    (idx: number): React.CSSProperties => {
      if (idx === 0) return { width: 28, minWidth: 28, maxWidth: 28, overflow: "hidden" }
      if (!colWidths[idx]) return {}
      return { width: colWidths[idx], minWidth: colWidths[idx], maxWidth: colWidths[idx], overflow: "hidden" }
    },
    [colWidths]
  )

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  if (rows.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <SearchBar value={searchQuery} onChange={onSearchChange} />
          <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">
            {_t("grid.no_rows")}
          </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center gap-2 shrink-0">
        <SearchBar value={searchQuery} onChange={onSearchChange} />
        {loadedRows !== undefined && (
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {rows.length} {_t("grid.rows")}
            {loadedRows !== undefined && loadedRows > 1000
              ? ` (${_t("grid.loaded")} ${loadedRows})`
              : ""}
          </span>
        )}
        {isLoading && (
          <span className="inline-block w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin shrink-0" />
        )}
        <div className="flex-1" />
        {onDownloadCsv && (
          <button onClick={onDownloadCsv} className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground rounded hover:bg-muted">CSV</button>
        )}
        {onDownloadJson && (
          <button onClick={onDownloadJson} className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground rounded hover:bg-muted">JSON</button>
        )}
      </div>
      <div
        className="overflow-auto border border-border rounded-md flex-1"
        ref={tableContainerRef}
      >
        <div style={{ minWidth: colWidths.reduce((a, b) => a + b, 0), minHeight: "100%" }}>
          <table className="border-collapse text-xs" style={{ width: colWidths.reduce((a, b) => a + b, 0), tableLayout: "fixed" }}>
            <thead className="sticky top-0 z-10">
              <tr style={{ height: 52 }}>
                <th
                  className="bg-muted/50 px-2 text-left font-medium text-muted-foreground border-r border-border sticky left-0 z-20 text-center text-[10px]"
                  style={colStyle(0)}
                >
                  #
                </th>
                {columns.map((col, i) => {
                  const colMeta = schema.find((s) => s.name === col)
                  const isSorted = sortColumn === col
                  return (
                    <th
                      key={col}
                      className={`bg-muted/50 px-2 text-left font-medium cursor-pointer select-none transition-colors align-top ${
                        isSorted || hoveredCol === col
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                      style={colStyle(i + 1)}
                      onClick={() => onSort?.(col)}
                      onMouseEnter={() => setHoveredCol(col)}
                      onMouseLeave={() => setHoveredCol(null)}
                      title={
                        colMeta?.comment
                          ? `${col}\n${colMeta.type}\n${colMeta.comment}`
                          : `${col}: ${colMeta?.type ?? ""}`
                      }
                    >
                      <div className="flex flex-col leading-tight py-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold truncate">{col}</span>
                          {isSorted && sortDirection && (
                            <span className="text-[10px] shrink-0">
                              {sortDirection === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                        </div>
                        {colMeta && (
                          <span className="text-[10px] text-muted-foreground/90 font-mono truncate">
                            {shortType(colMeta.type)}
                          </span>
                        )}
                        {colMeta?.comment && (
                          <span className="text-[10px] text-muted-foreground/90 italic truncate leading-tight">
                            {colMeta.comment}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody style={{ position: "relative" }}>
              <tr style={{ height: rowVirtualizer.getTotalSize() }}>
                <td />
              </tr>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index]
                return (
                  <tr
                    key={virtualRow.key}
                    style={{
                      height: ROW_HEIGHT,
                      top: 0,
                      left: 0,
                      transform: `translateY(${virtualRow.start}px)`,
                      position: "absolute",
                      width: "100%",
                    }}
                    className={
                      "border-t border-border hover:bg-muted/20 transition-colors" +
                      (virtualRow.index % 2 === 0
                        ? " bg-background"
                        : " bg-muted/10")
                    }
                  >
                    <td
                      className="px-2 text-muted-foreground text-[10px] border-r border-border sticky left-0 z-10 bg-inherit text-right tabular-nums"
                      style={colStyle(0)}
                    >
                      {virtualRow.index + 1}
                    </td>
                    {row.map((cell, colIdx) => {
                      const colMeta = schema.find(
                        (s) => s.name === columns[colIdx]
                      )
                      return (
                        <td
                          key={colIdx}
                          className="px-2 truncate"
                          style={colStyle(colIdx + 1)}
                          title={cell != null ? String(cell) : "NULL"}
                        >
                          {renderValue(cell, colMeta?.type, columns[colIdx])}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {onLoadMore && loadedRows !== undefined && (
        <div className="flex justify-center shrink-0 pb-1">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1 rounded hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isLoading ? _t("grid.loading") : `${_t("grid.load_more")} (${loadedRows} ${_t("grid.loaded")})`}
          </button>
        </div>
      )}
    </div>
  )
}

function SearchBar({
  value,
  onChange,
}: {
  value?: string
  onChange?: (q: string) => void
}) {
  const { _t } = useLang()
  if (!onChange) return null
  return (
    <div className="relative flex-1 max-w-sm">
      <svg
        className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      <input
        type="text"
        placeholder={_t("search.placeholder")}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={_t("search.placeholder")}
        className="w-full pl-7 pr-2 py-1 text-xs rounded border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring"
      />
    </div>
  )
}

function shortType(type: string): string {
  return type
    .replace(/^Nullable\((.+)\)$/, "$1?")
    .replace(/^Decimal\(\d+,\s*\d+\)$/, "Decimal")
    .replace(/^DateTime(64)?(\(.*\))?$/, "DateTime")
    .replace(/^Array\((.+)\)$/, "[$1]")
    .replace(/^FixedString\(\d+\)$/, "String")
    .replace(/^LowCardinality\((.+)\)$/, "$1")
}

function textWidth(s: string): number {
  let w = 0
  for (const ch of s) {
    w += ch.charCodeAt(0) > 127 ? 12 : 8.5
  }
  return w + 24
}
