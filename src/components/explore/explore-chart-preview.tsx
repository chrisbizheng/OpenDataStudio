"use client"

import { useState, useCallback } from "react"
import { useLang } from "@/components/lang-provider"
import { useVizConfig } from "@/hooks/use-viz-config"
import { executeWidgetQuery } from "@/lib/widget-execution"
import { buildExploreSQL } from "@/lib/explore-sql"
import { Chart } from "@/components/chart"
import { VizBigNumber } from "@/components/viz/viz-big-number"
import { VizTable } from "@/components/viz/viz-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"
import type { Dataset } from "@/stores/dataset-registry"
import type { ExploreConfig } from "@/lib/metric-types"
import type { ChartConfig, ConditionalFormattingRule } from "@/lib/chart-types"
import type { CachedQueryResult } from "@/lib/widget-cache"
import { CHART_TYPE_OPTIONS } from "@/lib/chart-helpers"

const EXPLORE_VIZ_OPTIONS = [
  ...CHART_TYPE_OPTIONS,
  { value: "big_number", key: "dashboard.chart_type_big_number" },
  { value: "table", key: "dashboard.chart_type_table" },
] as const

interface ExploreChartPreviewProps {
  dataset: Dataset | null
  config: ExploreConfig | null
  activeDashboardId: string | null
  onAddWidget: (widget: {
    id: string
    sql: string
    vizConfig: ChartConfig
    datasetId: string
    exploreConfig: ExploreConfig
  }) => void
}

function inferVizConfig(columns: string[], rows: unknown[][]): ChartConfig {
  // Single column, single row → big_number
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

export function ExploreChartPreview({
  dataset,
  config,
  activeDashboardId,
  onAddWidget,
}: ExploreChartPreviewProps) {
  const { _t } = useLang()

  const [queryResult, setQueryResult] = useState<CachedQueryResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    config: vizConfig,
    setConfig: setVizConfig,
    updateField: updateVizField,
  } = useVizConfig({ type: "bar", xKey: "", title: "" })

  const columns = queryResult?.columns ?? []

  const canRun = !!config && !!dataset && config.metrics.length > 0

  const handleRun = useCallback(async () => {
    if (!config || !dataset) return

    const sql = buildExploreSQL(config, {
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
  }, [config, dataset, setVizConfig, _t])

  const handleAddToDashboard = useCallback(() => {
    if (!activeDashboardId) {
      toast.error(_t("explore.select_dashboard_first"))
      return
    }
    if (!config || !dataset || !queryResult) return

    const sql = buildExploreSQL(config, {
      type: dataset.type,
      database: dataset.database,
      table: dataset.table,
      sql: dataset.sql,
    })

    onAddWidget({
      id: crypto.randomUUID(),
      sql,
      vizConfig,
      datasetId: dataset.id,
      exploreConfig: config,
    })

    toast.success(_t("explore.added"))
  }, [activeDashboardId, config, dataset, queryResult, vizConfig, onAddWidget, _t])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top bar: Run button + error */}
      <div className="shrink-0 flex items-center gap-2 mb-2">
        <Button
          size="xs"
          variant="default"
          onClick={handleRun}
          disabled={running || !canRun}
        >
          {running ? (
            <span className="inline-block w-3 h-3 border-2 border-border border-t-primary rounded-full animate-spin mr-1" />
          ) : (
            "▶"
          )}
          {_t("explore.run")}
        </Button>
        {!canRun && config && (
          <span className="text-[10px] text-muted-foreground">{_t("explore.no_metric")}</span>
        )}
        {error && (
          <span className="text-[10px] text-destructive truncate">{error}</span>
        )}
      </div>

      {/* Chart area + viz config */}
      <div className="flex-1 min-h-0 flex gap-2">
        {/* Chart */}
        <div className="flex-1 min-w-0">
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
              <Chart data={rowsToObjects(queryResult.columns, queryResult.rows)} config={vizConfig} />
            )
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-md">
              {dataset ? _t("explore.run") : _t("explore.no_dataset")}
            </div>
          )}
        </div>

        {/* Viz Config */}
        {queryResult && (
          <div className="w-48 shrink-0 border rounded-md overflow-y-auto p-3 space-y-2">
            {/* Chart Type */}
            <div>
              <Label className="text-[10px]">{_t("dashboard.chart_type")}</Label>
              <Select
                value={vizConfig.type}
                onValueChange={(value) => value && updateVizField("type", value)}
              >
                <SelectTrigger className="mt-0.5 h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPLORE_VIZ_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {_t(opt.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* X Axis */}
            <div>
              <Label className="text-[10px]">{_t("dashboard.x_axis")}</Label>
              <Select
                value={vizConfig.xKey}
                onValueChange={(value) => value && updateVizField("xKey", value)}
              >
                <SelectTrigger className="mt-0.5 h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col} value={col} className="text-xs">
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Y Axis */}
            <div>
              <Label className="text-[10px]">{_t("dashboard.y_axis")}</Label>
              <Select
                value={vizConfig.yKey ?? ""}
                onValueChange={(value) => updateVizField("yKey", value || undefined)}
              >
                <SelectTrigger className="mt-0.5 h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col} value={col} className="text-xs">
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <Label className="text-[10px]">{_t("dashboard.chart_title_label")}</Label>
              <Input
                value={vizConfig.title ?? ""}
                onChange={(e) => updateVizField("title", e.target.value || undefined)}
                className="mt-0.5 h-7 text-[10px]"
              />
            </div>

            {/* Show Legend */}
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">{_t("dashboard.show_legend")}</Label>
              <Switch
                checked={vizConfig.showLegend !== false}
                onCheckedChange={(checked) => updateVizField("showLegend", checked)}
                size="sm"
              />
            </div>

            {/* Conditional Formatting */}
            <div className="border-t pt-2">
              <Label className="text-[10px] font-semibold">{_t("dashboard.conditional_formatting")}</Label>
              <div className="space-y-1.5 mt-1">
                {(vizConfig.conditionalFormatting ?? []).map((rule, i) => (
                  <div key={rule.id} className="flex items-center gap-1">
                    <Select
                      value={rule.column}
                      onValueChange={(v) => {
                        if (!v) return
                        const rules = [...(vizConfig.conditionalFormatting ?? [])]
                        rules[i] = { ...rules[i], column: v }
                        updateVizField("conditionalFormatting", rules)
                      }}
                    >
                      <SelectTrigger className="h-6 text-[10px] w-14">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={rule.operator}
                      onValueChange={(v) => {
                        const rules = [...(vizConfig.conditionalFormatting ?? [])]
                        rules[i] = { ...rules[i], operator: v as ConditionalFormattingRule["operator"] }
                        updateVizField("conditionalFormatting", rules)
                      }}
                    >
                      <SelectTrigger className="h-6 text-[10px] w-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">" className="text-xs">{_t("dashboard.cf_greater")}</SelectItem>
                        <SelectItem value="<" className="text-xs">{_t("dashboard.cf_less")}</SelectItem>
                        <SelectItem value=">=" className="text-xs">{_t("dashboard.cf_greater_equal")}</SelectItem>
                        <SelectItem value="<=" className="text-xs">{_t("dashboard.cf_less_equal")}</SelectItem>
                        <SelectItem value="=" className="text-xs">{_t("dashboard.cf_equal")}</SelectItem>
                        <SelectItem value="!=" className="text-xs">{_t("dashboard.cf_not_equal")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={rule.value}
                      onChange={(e) => {
                        const rules = [...(vizConfig.conditionalFormatting ?? [])]
                        rules[i] = { ...rules[i], value: Number(e.target.value) }
                        updateVizField("conditionalFormatting", rules)
                      }}
                      className="h-6 text-[10px] w-14"
                    />
                    <input
                      type="color"
                      value={rule.color}
                      onChange={(e) => {
                        const rules = [...(vizConfig.conditionalFormatting ?? [])]
                        rules[i] = { ...rules[i], color: e.target.value }
                        updateVizField("conditionalFormatting", rules)
                      }}
                      className="h-6 w-8 rounded border cursor-pointer"
                    />
                    <button
                      onClick={() => {
                        const rules = (vizConfig.conditionalFormatting ?? []).filter((_, j) => j !== i)
                        updateVizField("conditionalFormatting", rules.length ? rules : undefined)
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="xs"
                  className="h-6 text-[10px] w-full"
                  onClick={() => {
                    const rules = [...(vizConfig.conditionalFormatting ?? [])]
                    rules.push({
                      id: crypto.randomUUID(),
                      column: columns[0] || "",
                      operator: ">",
                      value: 0,
                      color: "#ef4444",
                    })
                    updateVizField("conditionalFormatting", rules)
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {_t("dashboard.cf_add_rule")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add to Dashboard */}
      {queryResult && (
        <div className="shrink-0 mt-2">
          <Button
            size="xs"
            variant="default"
            onClick={handleAddToDashboard}
            className="w-full h-7 text-[10px]"
          >
            {_t("explore.add_to_dashboard")}
          </Button>
        </div>
      )}
    </div>
  )
}
