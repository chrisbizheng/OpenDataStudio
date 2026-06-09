"use client"

import { useEffect, useRef, useState, useMemo, useDeferredValue } from "react"
import * as VTable from "@visactor/vtable"
import { useTheme } from "@/components/theme-provider"
import { getVTableTheme } from "@/lib/vtable-theme"
import { LARGE_PIVOT_WARNING_THRESHOLD, type PivotConfig } from "@/lib/pivot-sql"
import type { ColumnMeta } from "@/lib/clickhouse"
import { useLang } from "@/components/lang-provider"
import { SearchBar } from "@/components/search-bar"
import { buildPivotRecords, filterAndSortPivotData } from "@/lib/pivot-client-data"

interface PivotGridProps {
  config: PivotConfig
  data: { columns: string[]; rows: unknown[][] }
  schema: ColumnMeta[]
  hasExecuted?: boolean
  onCellClick?: (params: { dimensionValues: Record<string, unknown>; indicatorKey: string }) => void
}

type SortDir = "asc" | "desc" | null

export function PivotGrid({ config, data, schema, hasExecuted, onCellClick }: PivotGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<VTable.PivotTable | null>(null)
  const { resolved: theme } = useTheme()
  const { _t } = useLang()
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  const filteredAndSortedData = useMemo(
    () => filterAndSortPivotData(data, deferredSearchQuery, sortColumn, sortDir),
    [data, deferredSearchQuery, sortColumn, sortDir]
  )

  const schemaTitleByField = useMemo(() => {
    const map = new Map<string, string>()
    schema.forEach((field) => {
      map.set(field.name, field.comment || field.name)
    })
    return map
  }, [schema])

  const records = useMemo(
    () => buildPivotRecords(filteredAndSortedData),
    [filteredAndSortedData]
  )

  const option = useMemo(() => {
    const rows = config.rows.map((field) => ({
      dimensionKey: field,
      title: schemaTitleByField.get(field) || field,
      width: 150,
      minWidth: 100,
    }))

    const columns = config.columns.map((field) => ({
      dimensionKey: field,
      title: schemaTitleByField.get(field) || field,
      width: 120,
      minWidth: 80,
    }))

    const indicators = [
      ...config.indicators.map((ind) => ({
        indicatorKey: ind.key,
        title: ind.title,
        width: 120,
        minWidth: 80,
        showSort: true,
        format: (value: number) => {
          if (typeof value !== "number") return String(value ?? "")
          const decimals = ind.decimals ?? 2
          if (ind.format === "percent") return `${(value * 100).toFixed(decimals)}%`
          return value.toLocaleString(undefined, {
            style: ind.format === "currency" ? "currency" : "decimal",
            currency: ind.format === "currency" ? "USD" : undefined,
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals,
          })
        },
      })),
      ...config.calculatedIndicators.map((calc) => ({
        indicatorKey: calc.key,
        title: calc.title,
        width: 120,
        minWidth: 80,
        showSort: true,
        format:
          calc.format === "percent"
            ? (value: number) =>
                typeof value === "number"
                  ? `${(value * 100).toFixed(calc.decimals ?? 2)}%`
                  : String(value ?? "")
            : (value: number) => {
                if (typeof value !== "number") return String(value ?? "")
                return value.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: calc.decimals ?? 2,
                })
              },
      })),
    ]

    const option: VTable.PivotTableConstructorOptions = {
      rows,
      columns,
      indicators,
      records,
      dataConfig: {
        totals: config.totals
          ? {
              row: config.totals.row
                ? {
                    showGrandTotals: config.totals.row.showGrandTotals,
                    showSubTotals: config.totals.row.showSubTotals,
                    grandTotalLabel: "总计",
                    subTotalLabel: "小计",
                  }
                : undefined,
              column: config.totals.column
                ? {
                    showGrandTotals: config.totals.column.showGrandTotals,
                    showSubTotals: config.totals.column.showSubTotals,
                    grandTotalLabel: "总计",
                    subTotalLabel: "小计",
                  }
                : undefined,
            }
          : undefined,
      },
      widthMode: "autoWidth",
      defaultRowHeight: 22,
      defaultHeaderRowHeight: 24,
      rowHierarchyTextStartAlignment: true,
      autoFillWidth: true,
      frozenColCount: config.rows.length,
      columnResizeMode: "all",
      rowResizeMode: "all",
      tooltip: {
        isShowOverflowTextTooltip: true,
        confine: true,
      },
      theme: getVTableTheme(theme),
    }

    return option
  }, [config, records, schemaTitleByField, theme])

  useEffect(() => {
    if (!containerRef.current) return

    if (tableRef.current) {
      tableRef.current.release()
      tableRef.current = null
    }

    if (filteredAndSortedData.rows.length === 0) return

    const tableInstance = new VTable.PivotTable(containerRef.current, option)
    tableRef.current = tableInstance

    tableInstance.on("sort_click", (args: unknown) => {
      const sortInfo = args as { key?: string; order?: string }
      if (sortInfo.key) {
        if (sortColumn === sortInfo.key && sortDir === "desc") {
          setSortColumn(null)
          setSortDir(null)
        } else if (sortColumn === sortInfo.key) {
          setSortDir("desc")
        } else {
          setSortColumn(sortInfo.key)
          setSortDir("asc")
        }
      }
      return false
    })

    if (onCellClick) {
      tableInstance.on("click_cell", (args) => {
        const cellInfo = args as unknown as {
          cellHeaderPaths?: { dimensionKey?: string; value?: string }[]
          indicatorKey?: string
        }
        if (cellInfo.indicatorKey && cellInfo.cellHeaderPaths) {
          const dimensionValues: Record<string, unknown> = {}
          for (const path of cellInfo.cellHeaderPaths) {
            if (path.dimensionKey && path.value !== undefined) {
              dimensionValues[path.dimensionKey] = path.value
            }
          }
          onCellClick({
            dimensionValues,
            indicatorKey: cellInfo.indicatorKey,
          })
        }
      })
    }

    return () => {
      if (tableRef.current) {
        tableRef.current.release()
        tableRef.current = null
      }
    }
  }, [option, onCellClick, filteredAndSortedData.rows.length, sortColumn, sortDir])

  // ResizeObserver: handle container size changes (e.g. sidebar toggle)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let prevW = el.clientWidth
    let prevH = el.clientHeight
    let rafId: number | null = null
    const observer = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w === prevW && h === prevH) return
      prevW = w
      prevH = h
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        rafId = null
        tableRef.current?.resize()
      })
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  if (data.rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        {hasExecuted ? _t("grid.no_rows") : "配置维度和指标后点击\"执行\""}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center gap-2 shrink-0">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {filteredAndSortedData.rows.length} {_t("pivot.result_rows")}
          {filteredAndSortedData.rows.length < data.rows.length
            ? ` / ${data.rows.length}`
            : ""}
          {config.limit && data.rows.length >= config.limit
            ? ` · ${_t("pivot.limited_prefix")} ${config.limit} ${_t("pivot.result_rows")}`
            : ""}
          {!config.limit && data.rows.length >= LARGE_PIVOT_WARNING_THRESHOLD
            ? ` · ${_t("pivot.large_warning")}`
            : ""}
        </span>
        {sortColumn && (
          <button
            onClick={() => {
              setSortColumn(null)
              setSortDir(null)
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
          >
            清除排序
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        className="flex-1 border border-border rounded-md overflow-hidden"
      />
    </div>
  )
}
