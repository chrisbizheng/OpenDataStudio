"use client"

import { useState, useCallback, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLang } from "@/components/lang-provider"
import { ExploreLeftPanel } from "@/components/explore/explore-left-panel"
import { Chart } from "@/components/chart"
import { VizBigNumber } from "@/components/viz/viz-big-number"
import { VizTable } from "@/components/viz/viz-table"
import { ChartConfigPanel } from "@/components/chart-config-panel"
import { useDashboardsStore } from "@/stores/dashboards"
import { useDatasetRegistryStore } from "@/stores/dataset-registry"
import { useDatasetStore } from "@/stores/dataset"
import { buildExploreSQL } from "@/lib/explore-sql"
import { executeWidgetQuery } from "@/lib/widget-execution"
import type { ExploreConfig, Metric, Dimension, TimeConfig, AdvancedAnalytics } from "@/lib/metric-types"
import type { ChartConfig } from "@/lib/chart-types"
import type { CachedQueryResult } from "@/lib/widget-cache"
import type { DatasetColumn } from "@/stores/dataset-registry"
import type { ColumnMeta } from "@/lib/types"
import { toast } from "sonner"

function schemaToDatasetColumns(schema: ColumnMeta[]): DatasetColumn[] {
  return schema.map((c) => ({
    name: c.name,
    type: c.type,
    isTime: c.type.includes("Date") || c.type.includes("Time"),
    role: c.type.match(/Int|UInt|Float|Decimal/) ? ("metric" as const) : ("dimension" as const),
  }))
}

function inferVizConfig(columns: string[], rows: unknown[][]): ChartConfig {
  if (columns.length === 1 && rows.length === 1) {
    return { type: "big_number", xKey: "", yKey: columns[0], title: "" }
  }
  const sampleRow = rows[0] || []
  let xKey = columns[0]
  let yKey = ""
  let foundX = false
  for (let i = 0; i < columns.length; i++) {
    const val = sampleRow[i]
    if (typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)) && val !== "")) {
      if (!yKey) yKey = columns[i]
    } else {
      if (!foundX) {
        xKey = columns[i]
        foundX = true
      }
    }
  }
  return { type: "bar", xKey, yKey: yKey || undefined, title: "" }
}

function rowsToObjects(columns: string[], rows: unknown[][]): Record<string, unknown>[] {
  return rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]])))
}

const EXPLORE_VIZ_OPTIONS = [
  { value: "big_number", key: "dashboard.chart_type_big_number" },
  { value: "table", key: "dashboard.chart_type_table" },
]

interface ExploreWidgetEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dashboardId: string
  widgetId: string
}

export function ExploreWidgetEditor({ open, onOpenChange, dashboardId, widgetId }: ExploreWidgetEditorProps) {
  const { _t } = useLang()

  const widget = useDashboardsStore(
    useCallback(
      (s) => {
        const d = s.dashboards.find((db) => db.id === dashboardId)
        return d?.widgets.find((w) => w.id === widgetId) ?? null
      },
      [dashboardId, widgetId]
    )
  )
  const updateWidget = useDashboardsStore((s) => s.updateWidget)

  const datasets = useDatasetRegistryStore((s) => s.datasets)
  const createDataset = useDatasetRegistryStore((s) => s.createDataset)

  const { selectedTable, selectedDatabase } = useDatasetStore(
    useCallback((s) => ({ selectedTable: s.selectedTable, selectedDatabase: s.selectedDatabase }), [])
  )

  // Local editing state — initialize from widget on mount
  const initialWidget = widget && widget.type === "chart" ? (widget as import("@/stores/dashboards").ChartWidget) : null
  const [datasetId, setDatasetId] = useState<string>(() => initialWidget?.datasetId ?? "")
  const [exploreConfig, setExploreConfig] = useState<ExploreConfig | null>(() =>
    initialWidget?.exploreConfig ? structuredClone(initialWidget.exploreConfig) : null
  )
  const [vizConfig, setVizConfig] = useState<ChartConfig>(() =>
    structuredClone(initialWidget?.vizConfig ?? { type: "bar", xKey: "", title: "" })
  )
  const [queryResult, setQueryResult] = useState<CachedQueryResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dataset = useMemo(() => {
    return datasets.find((d) => d.id === datasetId) ?? null
  }, [datasets, datasetId])

  // ── ExploreConfig helpers ──
  const addMetric = useCallback((metric: Metric) => {
    setExploreConfig((prev) => {
      if (!prev) return prev
      return { ...prev, metrics: [...prev.metrics, metric] }
    })
  }, [])

  const removeMetric = useCallback((metricId: string) => {
    setExploreConfig((prev) => {
      if (!prev) return prev
      return { ...prev, metrics: prev.metrics.filter((m) => m.id !== metricId) }
    })
  }, [])

  const addDimension = useCallback((dim: Dimension) => {
    setExploreConfig((prev) => {
      if (!prev) return prev
      const exists = prev.dimensions.some((d) => d.column === dim.column)
      if (exists) return prev
      return { ...prev, dimensions: [...prev.dimensions, dim] }
    })
  }, [])

  const removeDimension = useCallback((column: string) => {
    setExploreConfig((prev) => {
      if (!prev) return prev
      return { ...prev, dimensions: prev.dimensions.filter((d) => d.column !== column) }
    })
  }, [])

  const setTimeConfig = useCallback((tc: TimeConfig | undefined) => {
    setExploreConfig((prev) => {
      if (!prev) return prev
      return { ...prev, timeConfig: tc }
    })
  }, [])

  const setAnalytics = useCallback((analytics: AdvancedAnalytics | undefined) => {
    setExploreConfig((prev) => {
      if (!prev) return prev
      return { ...prev, analytics }
    })
  }, [])

  // ── Dataset change ──
  const handleDatasetChange = useCallback(
    (id: string) => {
      setDatasetId(id)
      const ds = datasets.find((d) => d.id === id)
      const initialMetrics = ds?.metrics ?? []
      setExploreConfig({ datasetId: id, metrics: [...initialMetrics], dimensions: [], rowLimit: 10000 })
      setQueryResult(null)
      setError(null)
    },
    [datasets]
  )

  const handleCreateFromTable = useCallback(() => {
    if (!selectedTable) return
    const id = createDataset({
      name: selectedTable,
      type: "physical",
      database: selectedDatabase,
      table: selectedTable,
      columns: schemaToDatasetColumns([]), // schema will be fetched on demand
    })
    handleDatasetChange(id)
  }, [selectedTable, selectedDatabase, createDataset, handleDatasetChange])

  // ── Run ──
  const canRun = !!exploreConfig && !!dataset && exploreConfig.metrics.length > 0

  const handleRun = useCallback(async () => {
    if (!exploreConfig || !dataset) return
    const sql = buildExploreSQL(exploreConfig, {
      type: dataset.type,
      database: dataset.database,
      table: dataset.table,
      sql: dataset.sql,
    })
    setRunning(true)
    setError(null)
    try {
      const result = await executeWidgetQuery(sql)
      const inferred = inferVizConfig(result.columns, result.rows)
      setVizConfig(inferred)
      setQueryResult(result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      toast.error(`${_t("explore.run_failed")}: ${msg}`)
      setQueryResult(null)
    } finally {
      setRunning(false)
    }
  }, [exploreConfig, dataset, _t])

  // ── Save ──
  const handleSave = useCallback(() => {
    if (!exploreConfig || !dataset) {
      toast.error(_t("explore.no_dataset"))
      return
    }
    const sql = buildExploreSQL(exploreConfig, {
      type: dataset.type,
      database: dataset.database,
      table: dataset.table,
      sql: dataset.sql,
    })
    updateWidget(dashboardId, widgetId, {
      datasetId,
      exploreConfig,
      vizConfig,
      sql,
      baseSql: sql,
      lastRunAt: Date.now(),
    })
    onOpenChange(false)
    toast.success(_t("dashboard.added"))
  }, [exploreConfig, dataset, dashboardId, widgetId, datasetId, vizConfig, updateWidget, onOpenChange, _t])

  // ── Chart data ──
  const chartData = useMemo(() => {
    if (!queryResult) return []
    return rowsToObjects(queryResult.columns, queryResult.rows)
  }, [queryResult])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-[95vw] h-[90vh] flex flex-col p-0 gap-0" showCloseButton={false}>
        {/* Header */}
        <DialogHeader className="shrink-0 px-4 py-3 border-b flex flex-row items-center justify-between">
          <DialogTitle className="text-sm">{_t("dashboard.edit_config")}</DialogTitle>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{_t("explore.dataset")}:</span>
            <Select value={datasetId} onValueChange={(v) => v && handleDatasetChange(v)}>
              <SelectTrigger className="h-7 text-[10px] w-44">
                <SelectValue placeholder={_t("explore.no_dataset")} />
              </SelectTrigger>
              <SelectContent>
                {datasets.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTable && (
              <Button size="xs" variant="outline" onClick={handleCreateFromTable} className="h-7 text-[10px]">
                {_t("explore.create_from_table")}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          {/* Left: Explore config */}
          <ExploreLeftPanel
            dataset={dataset}
            config={exploreConfig}
            onAddMetric={addMetric}
            onRemoveMetric={removeMetric}
            onAddDimension={addDimension}
            onRemoveDimension={removeDimension}
            onSetTimeConfig={setTimeConfig}
            onSetAnalytics={setAnalytics}
          />

          {/* Center: Chart preview */}
          <div className="flex-1 flex flex-col min-h-0 border-x">
            {/* Run bar */}
            <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b">
              <Button size="xs" variant="default" onClick={handleRun} disabled={running || !canRun}>
                {running ? (
                  <span className="inline-block w-3 h-3 border-2 border-border border-t-primary rounded-full animate-spin mr-1" />
                ) : (
                  "▶"
                )}
                {_t("explore.run")}
              </Button>
              {!canRun && exploreConfig && (
                <span className="text-[10px] text-muted-foreground">{_t("explore.no_metric")}</span>
              )}
              {error && <span className="text-[10px] text-destructive truncate">{error}</span>}
            </div>

            {/* Chart area */}
            <div className="flex-1 min-h-0 p-3">
              {queryResult ? (
                vizConfig.type === "big_number" ? (
                  <VizBigNumber
                    columns={queryResult.columns}
                    rows={queryResult.rows}
                    config={{
                      title: vizConfig.title,
                      yKey: vizConfig.yKey,
                      format: "number",
                      decimals: vizConfig.label?.decimalPlaces,
                    }}
                  />
                ) : vizConfig.type === "table" ? (
                  <VizTable columns={queryResult.columns} rows={queryResult.rows} />
                ) : (
                  <Chart data={chartData} config={vizConfig} />
                )
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-md">
                  {dataset ? _t("explore.run") : _t("explore.no_dataset")}
                </div>
              )}
            </div>
          </div>

          {/* Right: Viz + Style config */}
          <div className="w-72 shrink-0 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 p-3">
              <ChartConfigPanel
                config={vizConfig}
                onChange={setVizConfig}
                extraChartTypeOptions={EXPLORE_VIZ_OPTIONS}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 px-4 py-3 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {_t("dashboard.cancel")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!exploreConfig || !dataset}>
            {_t("dashboard.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
