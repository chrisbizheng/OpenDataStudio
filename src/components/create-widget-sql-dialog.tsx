"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { sql } from "@codemirror/lang-sql"
import { useLang } from "@/components/lang-provider"
import { useIsDark } from "@/hooks/use-is-dark"
import { useVizConfig } from "@/hooks/use-viz-config"
import { createWidget } from "@/lib/widget-creation-lifecycle"
import { executeWidgetQuery } from "@/lib/widget-execution"
import { type CachedQueryResult } from "@/lib/widget-cache"
import { vscodeDark, vscodeLight } from "@/lib/vscode-theme-override"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { ChartConfig } from "@/lib/chart-types"
import type { SeriesConfig } from "@/lib/chart-types"
import { CHART_TYPE_OPTIONS } from "@/lib/chart-helpers"

interface CreateWidgetSqlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dashboardId: string
}

function inferVizConfig(columns: string[], rows: unknown[][]): ChartConfig {
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

export function CreateWidgetSqlDialog({
  open,
  onOpenChange,
  dashboardId,
}: CreateWidgetSqlDialogProps) {
  const { _t } = useLang()

  const [sqlText, setSqlText] = useState("")
  const [running, setRunning] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queryResult, setQueryResult] = useState<CachedQueryResult | null>(null)

  const {
    config: vizConfig,
    setConfig: setVizConfig,
    updateField: updateVizField,
    addSeries,
    removeSeries,
    updateSeriesField,
  } = useVizConfig({ type: "bar", xKey: "", title: "" })

  const isDark = useIsDark()

  const activeTheme = isDark ? vscodeDark : vscodeLight

  const extensions = useMemo(() => [sql()], [])

  const columns = queryResult?.columns ?? []

  const handleRunSql = useCallback(async () => {
    if (!sqlText.trim()) return
    setRunning(true)
    setError(null)

    try {
      const result = await executeWidgetQuery(sqlText)
      const inferred = inferVizConfig(result.columns, result.rows)
      setVizConfig(inferred)
      setQueryResult(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setQueryResult(null)
    } finally {
      setRunning(false)
    }
  }, [sqlText, setVizConfig])

  const handleAddWidget = useCallback(async () => {
    if (!queryResult) return

    setAdding(true)
    try {
      await createWidget({
        source: "sql-dialog",
        sql: sqlText,
        vizConfig,
        dashboardId,
        queryResult,
      })

      setSqlText("")
      setQueryResult(null)
      setError(null)
      onOpenChange(false)
      toast.success(_t("dashboard.added_to"))
    } catch (e) {
      toast.error(`${_t("dashboard.add_failed")}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAdding(false)
    }
  }, [queryResult, sqlText, vizConfig, dashboardId, onOpenChange, _t])

  const handleClose = useCallback(() => {
    setSqlText("")
    setQueryResult(null)
    setError(null)
    setVizConfig({ type: "bar", xKey: "", title: "" })
    onOpenChange(false)
  }, [onOpenChange, setVizConfig])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">{_t("dashboard.create_with_sql")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-2">
          {/* SQL Editor */}
          <div className="shrink-0 border rounded-md overflow-hidden" style={{ height: "200px" }}>
            <div className="flex items-center gap-1 px-2 py-1 border-b border-border shrink-0 bg-muted/30">
              <Button
                size="xs"
                variant="default"
                onClick={handleRunSql}
                disabled={running || !sqlText.trim()}
              >
                {running ? (
                  <span className="inline-block w-3 h-3 border-2 border-border border-t-primary rounded-full animate-spin mr-1" />
                ) : (
                  "▶"
                )}
                {_t("dashboard.run_sql")}
              </Button>
            </div>
            <CodeMirror
              value={sqlText}
              onChange={setSqlText}
              extensions={extensions}
              theme={activeTheme}
              height="100%"
              basicSetup={{ lineNumbers: false, foldGutter: false, indentOnInput: true }}
              placeholder={_t("dashboard.enter_sql")}
              className="text-xs [&_.cm-editor]:h-full [&_.cm-content]:font-mono [&_.cm-scroller]:overflow-auto"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="shrink-0 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Results + Viz Config */}
          <div className="flex-1 min-h-0 flex gap-2">
            {/* Query Result Table */}
            <div className="flex-1 min-w-0 border rounded-md overflow-auto">
              {queryResult ? (
                <div className="min-w-full">
                  <div className="text-xs font-medium px-3 py-1.5 bg-muted/30 border-b border-border sticky top-0">
                    {_t("dashboard.query_result")} ({queryResult.rows.length} {_t("grid.rows")})
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {queryResult.columns.map((col) => (
                          <th
                            key={col}
                            className="text-left px-3 py-1 font-medium text-muted-foreground whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.slice(0, 50).map((row, ri) => (
                        <tr key={ri} className="border-b border-border/50 hover:bg-muted/30">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-0.5 whitespace-nowrap">
                              {cell == null ? (
                                <span className="text-muted-foreground italic">null</span>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {queryResult.rows.length > 50 && (
                    <div className="text-xs text-muted-foreground px-3 py-1">
                      {_t("dashboard.showing_first_of")} {queryResult.rows.length} {_t("grid.rows")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  {_t("dashboard.no_result")}
                </div>
              )}
            </div>

            {/* Viz Config */}
            {queryResult && (
              <div className="w-56 shrink-0 border rounded-md overflow-y-auto">
                <div className="text-xs font-medium px-3 py-1.5 bg-muted/30 border-b border-border sticky top-0">
                  {_t("dashboard.viz_config")}
                </div>
                <div className="p-3 space-y-2">
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
                        {CHART_TYPE_OPTIONS.map((opt) => (
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

                  {/* Series */}
                  <div>
                    <Label className="text-[10px] mb-0.5 block">{_t("dashboard.series_config")}</Label>
                    <div className="space-y-1 rounded-md border p-1.5">
                      {(vizConfig.series ?? []).length === 0 && (
                        <div className="text-[10px] text-muted-foreground py-0.5">
                          {vizConfig.type === "composed"
                            ? _t("dashboard.add_series")
                            : _t("dashboard.y_axis")}
                        </div>
                      )}
                      {(vizConfig.series ?? []).map((s, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <Input
                            placeholder={_t("dashboard.series_ykey")}
                            value={s.yKey}
                            onChange={(e) => updateSeriesField(i, "yKey", e.target.value)}
                            className="h-6 text-[10px] flex-1"
                          />
                          {vizConfig.type === "composed" && (
                            <Select
                              value={s.chartType ?? ""}
                              onValueChange={(value) =>
                                updateSeriesField(i, "chartType", value || "")
                              }
                            >
                              <SelectTrigger className="h-6 text-[10px] w-16">
                                <SelectValue placeholder={_t("dashboard.series_type")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bar" className="text-xs">
                                  {_t("dashboard.chart_type_bar")}
                                </SelectItem>
                                <SelectItem value="line" className="text-xs">
                                  {_t("dashboard.chart_type_line")}
                                </SelectItem>
                                <SelectItem value="area" className="text-xs">
                                  {_t("dashboard.chart_type_area")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => removeSeries(i)}
                            className="h-6 px-1 text-destructive hover:text-destructive"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={addSeries}
                        className="w-full text-[10px] h-6"
                      >
                        + {_t("dashboard.add_series")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>
            {_t("dashboard.cancel")}
          </Button>
          <Button size="sm" onClick={handleAddWidget} disabled={!queryResult || adding}>
            {_t("dashboard.add_to_dashboard")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
