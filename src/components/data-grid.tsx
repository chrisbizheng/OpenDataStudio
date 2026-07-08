"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { renderValue } from "./column-renderer"
import { useLang } from "@/components/lang-provider"
import { formatType } from "@/lib/column-type-classifier"
import { computeColumnWidths } from "@/lib/data-grid-utils"
import { SearchBar } from "@/components/search-bar"
import type { ColumnMeta } from "@/lib/types"

interface DataGridProps {
  columns: string[]
  rows: unknown[][]
  schema: ColumnMeta[]
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

function DataGridToolbar({
  searchQuery,
  onSearchChange,
  _t,
}: {
  searchQuery?: string
  onSearchChange?: (q: string) => void
  _t: (key: string) => string
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <SearchBar value={searchQuery} onChange={onSearchChange} />
      {onSearchChange && (
        <span className="text-[10px] text-muted-foreground shrink-0" title={_t("grid.window_search")}>{_t("grid.window_search")}</span>
      )}
    </div>
  )
}

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

  const gridColumns = useMemo(() => {
    const metaByName = new Map(schema.map((f) => [f.name, f]))
    return columns.map((name) => {
      const meta = metaByName.get(name)
      return { name, type: meta?.type, comment: meta?.comment }
    })
  }, [columns, schema])

  const colWidths = useMemo(() => computeColumnWidths(columns, rows, gridColumns), [columns, rows, gridColumns])

  const colStyle = useCallback(
    (idx: number): React.CSSProperties => {
      if (idx === 0) return { width: 28, minWidth: 28, maxWidth: 28, overflow: "hidden" }
      if (!colWidths[idx]) return {}
      return { width: colWidths[idx], minWidth: colWidths[idx], maxWidth: colWidths[idx], overflow: "hidden" }
    },
    [colWidths]
  )

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!onLoadMore || isLoading) return
    const el = event.currentTarget
    const { scrollTop, clientHeight, scrollHeight } = el
    if (scrollHeight - scrollTop - clientHeight <= 160) {
      onLoadMore()
    }
  }, [isLoading, onLoadMore])

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  if (rows.length === 0) {
    const hasSearch = !!searchQuery && searchQuery.trim().length > 0
    return (
      <div className="flex flex-col h-full">
        <DataGridToolbar searchQuery={searchQuery} onSearchChange={onSearchChange} _t={_t} />
          <div className="flex flex-col items-center justify-center flex-1 text-sm text-muted-foreground gap-2">
            <span>{hasSearch ? _t("grid.no_search_results") : _t("grid.no_rows")}</span>
            {hasSearch && onSearchChange && (
              <button
                onClick={() => onSearchChange("")}
                className="text-xs text-primary hover:underline"
              >
                {_t("grid.clear_search")}
              </button>
            )}
          </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center gap-2 shrink-0">
        <DataGridToolbar searchQuery={searchQuery} onSearchChange={onSearchChange} _t={_t} />
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
        onScroll={handleScroll}
      >
        <div style={{ minWidth: colWidths.reduce((a, b) => a + b, 0), minHeight: "100%" }}>
          <table className="border-collapse text-xs" style={{ width: colWidths.reduce((a, b) => a + b, 0), tableLayout: "fixed" }}>
            <thead className="sticky top-0 z-10">
              <tr style={{ height: 52 }}>
                <th
                  className="bg-muted px-2 text-left font-medium text-muted-foreground border-r border-border sticky left-0 z-20 text-center text-[10px]"
                  style={colStyle(0)}
                >
                  #
                </th>
                {columns.map((col, i) => {
                  const colMeta = gridColumns[i]
                  const isSorted = sortColumn === col
                  return (
                    <th
                      key={col}
                      className={`bg-muted px-2 text-left font-medium cursor-pointer select-none transition-colors align-top ${
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
                      <div className="flex flex-col gap-0.5 leading-tight py-0.5">
                        <div className="flex items-center gap-1 leading-4">
                          <span className="text-xs font-semibold truncate">{col}</span>
                          {isSorted && sortDirection && (
                            <span className="text-[10px] shrink-0">
                              {sortDirection === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                        </div>
                        {colMeta.type && (
                          <span className="text-[10px] text-muted-foreground/90 font-mono truncate leading-3">
                            {formatType(colMeta.type)}
                          </span>
                        )}
                        {colMeta?.comment && (
                          <span className="text-[10px] text-muted-foreground/90 italic truncate leading-3">
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
                        : " bg-muted/20")
                    }
                  >
                    <td
                      className="px-2 text-muted-foreground text-[10px] border-r border-border sticky left-0 z-10 bg-inherit text-right tabular-nums"
                      style={colStyle(0)}
                    >
                      {virtualRow.index + 1}
                    </td>
                    {row.map((cell, colIdx) => {
                      const colMeta = gridColumns[colIdx]
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


