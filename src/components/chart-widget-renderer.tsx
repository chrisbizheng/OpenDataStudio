"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useLang } from "@/components/lang-provider"
import { Chart } from "@/components/chart"
import { widgetCache, type QueryResult } from "@/lib/widget-cache"
import { useDashboardsStore, type ChartWidget, type DashboardFilter } from "@/stores/dashboards"
import { AlertTriangle, RefreshCw, Settings2, FileCode, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// ── Shared utilities ──────────────────────────────────────────

/** Characters that are safe in ClickHouse column identifiers */
const SAFE_COLUMN_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/** Escape a value for safe interpolation into a ClickHouse SQL string */
function escapeSqlValue(val: string): string {
  return val.replace(/\\/g, "\\\\").replace(/'/g, "''")
}

/** Wrap SQL with dashboard filter WHERE clauses */
export function buildFilteredSql(baseSql: string, filters: DashboardFilter[]): string {
  if (filters.length === 0) return baseSql
  const whereClauses = filters
    .filter((f) => f.column && f.value)
    .map((f) => {
      // Validate column name against injection: only allow alphanumeric + underscore
      if (!SAFE_COLUMN_RE.test(f.column)) {
        console.warn(`[buildFilteredSql] Invalid column name rejected: "${f.column}"`)
        return null
      }
      const escapedValue = escapeSqlValue(String(f.value))
      return `\`${f.column}\` = '${escapedValue}'`
    })
    .filter(Boolean)
    .join(" AND ")

  if (!whereClauses) return baseSql

  const upperSql = baseSql.toUpperCase().trim()

  if (upperSql.includes("WHERE")) {
    const whereIdx = upperSql.indexOf("WHERE")
    return baseSql.slice(0, whereIdx + 5) + " (" + whereClauses + ") AND" + baseSql.slice(whereIdx + 5)
  }

  const insertBefore = /\b(GROUP\s+BY|ORDER\s+BY|LIMIT|HAVING)\b/i.exec(baseSql)
  if (insertBefore) {
    return baseSql.slice(0, insertBefore.index) + "WHERE " + whereClauses + " " + baseSql.slice(insertBefore.index)
  }

  return baseSql + " WHERE " + whereClauses
}

export function formatTimeAgo(ts: number, _t: (key: string) => string): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return _t("dashboard.just_now")
  if (diff < 3_600_000) return _t("dashboard.minutes_ago").replace("{n}", String(Math.floor(diff / 60_000)))
  if (diff < 86_400_000) return _t("dashboard.hours_ago").replace("{n}", String(Math.floor(diff / 3_600_000)))
  return _t("dashboard.days_ago").replace("{n}", String(Math.floor(diff / 86_400_000)))
}

// ── Chart Widget Renderer (extracted for reuse) ───────────────

export interface ChartWidgetRendererProps {
  widget: ChartWidget
  isDark: boolean
  isPublished: boolean
  /** In view mode, hide edit/config/delete actions */
  viewOnly?: boolean
  onEditConfig?: (widget: ChartWidget) => void
  onEditSql?: (widget: ChartWidget) => void
  dashboardFilters: DashboardFilter[]
  onAddFilter: (dashboardId: string, filter: DashboardFilter) => void
  onRemoveFilter: (dashboardId: string, filterId: string) => void
  dashboardId: string
}

export function ChartWidgetRenderer({
  widget,
  isDark: _isDark,
  isPublished,
  viewOnly = false,
  onEditConfig,
  onEditSql,
  dashboardFilters,
  onAddFilter,
  onRemoveFilter,
  dashboardId,
}: ChartWidgetRendererProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cachedResult, setCachedResult] = useState<QueryResult | null>(null)
  const [hovered, setHovered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { _t } = useLang()

  const { updateWidgetLastRunAt } =
    useDashboardsStore(
      useShallow((s) => ({
        updateWidgetLastRunAt: s.updateWidgetLastRunAt,
      }))
    )

  useEffect(() => {
    widgetCache.get(widget.id).then((result) => {
      setCachedResult(result)
      setLoading(false)
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e))
      setLoading(false)
    })
  }, [widget.id])

  const chartData = useMemo(() => {
    if (!cachedResult) return []
    return cachedResult.rows.map((row) =>
      Object.fromEntries(cachedResult.columns.map((col, i) => [col, row[i]]))
    )
  }, [cachedResult])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const baseSql = widget.baseSql || widget.sql
      const sql = buildFilteredSql(baseSql, dashboardFilters)
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || _t("dashboard.refresh_failed"))

      const result: QueryResult = {
        columns: json.columns,
        rows: json.rows,
        fetchedAt: Date.now(),
      }
      await widgetCache.set(widget.id, result)
      setCachedResult(result)
      updateWidgetLastRunAt(dashboardId, widget.id, Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRefreshing(false)
    }
  }, [widget.id, widget.sql, widget.baseSql, dashboardId, dashboardFilters, updateWidgetLastRunAt, _t])

  const prevFilterCountRef = useRef(dashboardFilters.length)
  useEffect(() => {
    if (prevFilterCountRef.current !== dashboardFilters.length && !loading) {
      handleRefresh()
    }
    prevFilterCountRef.current = dashboardFilters.length
  }, [dashboardFilters.length, handleRefresh, loading])

  const config = widget.vizConfig

  const handleChartClick = useCallback(
    (item: { key: string; value: number; row: Record<string, unknown>; seriesName?: string }) => {
      const xKey = config.xKey
      if (!xKey || !item.key) return

      const newFilter: DashboardFilter = {
        id: crypto.randomUUID(),
        column: xKey,
        value: String(item.key),
      }

      const existingFilter = dashboardFilters.find((f) => f.column === xKey)
      if (existingFilter) {
        onRemoveFilter(dashboardId, existingFilter.id)
      }
      onAddFilter(dashboardId, newFilter)
    },
    [dashboardId, config.xKey, dashboardFilters, onAddFilter, onRemoveFilter],
  )

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
        {_t("dashboard.loading")}
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
        <AlertTriangle className="w-6 h-6 text-destructive" />
        <span className="text-xs text-destructive text-center">{error}</span>
        <button
          onClick={handleRefresh}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          {_t("dashboard.retry")}
        </button>
      </div>
    )
  }

  return (
    <div
      className="w-full h-full flex flex-col relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium text-foreground truncate">
            {config.title || _t("dashboard.chart_title")}
          </span>
          {dashboardFilters.length > 0 && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {_t("dashboard.filtered")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {widget.lastRunAt && (
            <span className="text-[10px] text-muted-foreground">
              {formatTimeAgo(widget.lastRunAt, _t)}
            </span>
          )}
        </div>
      </div>

      {/* Actions overlay — view-only shows just refresh; edit mode shows full toolbar */}
      {hovered && (
        <div className="absolute top-1 right-1 flex items-center gap-1 z-10 bg-background/80 backdrop-blur-sm rounded px-1">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={_t("dashboard.refresh")}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          {!viewOnly && onEditConfig && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditConfig(widget) }}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title={_t("dashboard.edit_config")}
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          )}
          {!viewOnly && onEditSql && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditSql(widget) }}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title={_t("dashboard.edit_sql")}
            >
              <FileCode className="w-3.5 h-3.5" />
            </button>
          )}
          {!viewOnly && (
            <button
              onClick={() => {
                widgetCache.delete(widget.id)
                useDashboardsStore.getState().removeWidget(dashboardId, widget.id)
              }}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
              title={_t("dashboard.delete")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Chart area — in view mode, always allow click-to-filter */}
      <div className="flex-1 min-h-0">
        {chartData.length > 0 ? (
          <Chart
            data={chartData}
            config={config}
            onClick={isPublished && !viewOnly ? undefined : handleChartClick}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            {_t("dashboard.no_data_hint")}
          </div>
        )}
      </div>
    </div>
  )
}
