"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLang } from "@/components/lang-provider"
import { Chart } from "@/components/chart"
import { widgetCache, type CachedQueryResult } from "@/lib/widget-cache"
import { refreshWidget } from "@/lib/widget-creation-lifecycle"
import { buildFilteredSql } from "@/lib/widget-filter-sql"
import { useDashboardsStore, type ChartWidget, type DashboardFilter } from "@/stores/dashboards"
import { AlertTriangle, RefreshCw, Settings2, FileCode, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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
  const [cachedResult, setCachedResult] = useState<CachedQueryResult | null>(null)
  const [hovered, setHovered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { _t } = useLang()

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
      const result = await refreshWidget({
        dashboardId,
        widgetId: widget.id,
        sql,
      })
      setCachedResult(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRefreshing(false)
    }
  }, [widget.id, widget.sql, widget.baseSql, dashboardId, dashboardFilters])

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
