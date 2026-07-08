"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { sql } from "@codemirror/lang-sql"
import { useLang } from "@/components/lang-provider"
import { useIsDark } from "@/hooks/use-is-dark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useDatasetRegistryStore } from "@/stores/dataset-registry"
import type { Dataset, DatasetColumn } from "@/stores/dataset-registry"
import type { ExploreConfig, Metric, Dimension, TimeConfig, AggregationType, TimeGranularity, MetricFormat, AdvancedAnalytics, WindowFunction } from "@/lib/metric-types"
import { executeWidgetQuery } from "@/lib/widget-execution"
import { Plus, X, Save, Code } from "lucide-react"
import { vscodeDark, vscodeLight } from "@/lib/vscode-theme-override"

interface ExploreLeftPanelProps {
  dataset: Dataset | null
  config: ExploreConfig | null
  onAddMetric: (m: Metric) => void
  onRemoveMetric: (id: string) => void
  onAddDimension: (d: Dimension) => void
  onRemoveDimension: (col: string) => void
  onSetTimeConfig: (tc: TimeConfig | undefined) => void
  onSetAnalytics: (analytics: AdvancedAnalytics | undefined) => void
}

const AGGREGATIONS: AggregationType[] = ["SUM", "AVG", "COUNT", "MIN", "MAX", "COUNT_DISTINCT"]

const GRANULARITIES: TimeGranularity[] = ["second", "minute", "hour", "day", "week", "month", "quarter", "year"]

const TIME_RANGES = ["No filter", "Last 7 days", "Last 30 days", "Last quarter", "Last year", "Custom"] as const

type MetricMode = "simple" | "custom_sql"

const FORMAT_OPTIONS: { value: MetricFormat; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "percent", label: "Percent" },
  { value: "currency", label: "Currency" },
]

export function ExploreLeftPanel({
  dataset,
  config,
  onAddMetric,
  onRemoveMetric,
  onAddDimension,
  onRemoveDimension,
  onSetTimeConfig,
  onSetAnalytics,
}: ExploreLeftPanelProps) {
  const { _t } = useLang()
  const isDark = useIsDark()
  const addMetricToDataset = useDatasetRegistryStore((s) => s.addMetricToDataset)
  const updateDataset = useDatasetRegistryStore((s) => s.updateDataset)

  // Auto-fetch schema for datasets with empty columns
  const [fetchingSchema, setFetchingSchema] = useState(false)
  const [schemaError, setSchemaError] = useState<string | null>(null)

  const fetchSchema = useCallback(async () => {
    if (!dataset || dataset.columns.length > 0) return
    const sql =
      dataset.type === "virtual" && dataset.sql
        ? `SELECT * FROM (${dataset.sql}) AS __v LIMIT 1`
        : dataset.type === "physical" && dataset.database && dataset.table
        ? `SELECT * FROM ${dataset.database}.${dataset.table} LIMIT 1`
        : null
    if (!sql) return
    setFetchingSchema(true)
    setSchemaError(null)
    try {
      const result = await executeWidgetQuery(sql)
      const cols: DatasetColumn[] = result.columns.map((name) => ({
        name,
        type: "",
        isTime: /date|time/i.test(name),
        role: /amount|count|sum|total|price|revenue|cost|profit|qty|quantity|avg|rate/i.test(name)
          ? "metric"
          : "dimension",
      }))
      updateDataset(dataset.id, { columns: cols })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setSchemaError(msg)
    } finally {
      setFetchingSchema(false)
    }
  }, [dataset, updateDataset])

  useEffect(() => {
    if (dataset && dataset.columns.length === 0) {
      const canFetch =
        (dataset.type === "virtual" && dataset.sql) ||
        (dataset.type === "physical" && dataset.database && dataset.table)
      if (canFetch) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchSchema()
      }
    }
  }, [dataset?.id, dataset?.type, dataset?.sql, dataset?.database, dataset?.table, dataset?.columns?.length, fetchSchema])

  // Metric add form state
  const [showMetricForm, setShowMetricForm] = useState(false)
  const [metricMode, setMetricMode] = useState<MetricMode>("simple")
  const [metricColumn, setMetricColumn] = useState("")
  const [metricAgg, setMetricAgg] = useState<AggregationType>("SUM")
  const [metricLabel, setMetricLabel] = useState("")
  // Custom SQL fields
  const [customSqlLabel, setCustomSqlLabel] = useState("")
  const [customSqlExpression, setCustomSqlExpression] = useState("")
  const [customSqlFormat, setCustomSqlFormat] = useState<MetricFormat>("number")

  // Dimension add form state
  const [showDimForm, setShowDimForm] = useState(false)
  const [dimColumn, setDimColumn] = useState("")
  const [dimGranularity, setDimGranularity] = useState<TimeGranularity>("day")

  const columns = dataset?.columns ?? []
  const datasetId = dataset?.id ?? null

  const activeTheme = isDark ? vscodeDark : vscodeLight
  const sqlExtensions = useMemo(() => [sql()], [])

  const savedMetricIds = useMemo(() => {
    const set = new Set<string>()
    for (const m of dataset?.metrics ?? []) {
      set.add(m.id)
    }
    return set
  }, [dataset?.metrics])

  const handleAddMetric = () => {
    if (metricMode === "simple") {
      if (!metricColumn) return
      onAddMetric({
        id: crypto.randomUUID(),
        type: "simple",
        column: metricColumn,
        aggregation: metricAgg,
        label: metricLabel || metricColumn,
      })
      setMetricColumn("")
      setMetricAgg("SUM")
      setMetricLabel("")
    } else {
      if (!customSqlLabel.trim() || !customSqlExpression.trim()) return
      onAddMetric({
        id: crypto.randomUUID(),
        type: "custom_sql",
        label: customSqlLabel,
        sqlExpression: customSqlExpression,
        format: customSqlFormat,
      })
      setCustomSqlLabel("")
      setCustomSqlExpression("")
      setCustomSqlFormat("number")
    }
    setShowMetricForm(false)
  }

  const handleAddDimension = () => {
    if (!dimColumn) return
    const col = columns.find((c) => c.name === dimColumn)
    const isTemporal = col?.type.match(/Date|Time/i)
    onAddDimension({
      column: dimColumn,
      type: isTemporal ? "temporal" : col?.type.match(/Int|UInt|Float|Decimal/i) ? "numeric" : "categorical",
      ...(isTemporal ? { timeGranularity: dimGranularity } : {}),
    })
    setDimColumn("")
    setDimGranularity("day")
    setShowDimForm(false)
  }

  const handleQuickMetric = (colName: string) => {
    onAddMetric({
      id: crypto.randomUUID(),
      type: "simple",
      column: colName,
      aggregation: "SUM",
      label: colName,
    })
  }

  const handleQuickDimension = (colName: string) => {
    const col = columns.find((c) => c.name === colName)
    const isTemporal = col?.type.match(/Date|Time/i)
    onAddDimension({
      column: colName,
      type: isTemporal ? "temporal" : col?.type.match(/Int|UInt|Float|Decimal/i) ? "numeric" : "categorical",
      ...(isTemporal ? { timeGranularity: "day" } : {}),
    })
  }

  const handleSaveToDataset = (metric: Metric) => {
    if (!datasetId) return
    addMetricToDataset(datasetId, metric)
  }

  const timeConfig = config?.timeConfig
  const timeEnabled = !!timeConfig
  const timeColumns = columns.filter((c) => c.isTime)

  // Analytics state
  const analytics = config?.analytics
  const rw = analytics?.rollingWindow
  const rwEnabled = !!rw?.enabled

  const handleSetRollingWindow = (updates: Partial<{
    enabled: boolean
    windowSize: number
    function: WindowFunction
    metricIds: string[]
  }>) => {
    const current = rw ?? { enabled: false, windowSize: 7, function: "AVG" as WindowFunction, metricIds: [] }
    const next: AdvancedAnalytics = {
      rollingWindow: { ...current, ...updates },
    }
    onSetAnalytics(next)
  }

  const handleToggleRollingWindow = (checked: boolean) => {
    if (checked) {
      const firstMetricId = config?.metrics[0]?.id
      handleSetRollingWindow({
        enabled: true,
        metricIds: firstMetricId ? [firstMetricId] : [],
      })
    } else {
      onSetAnalytics(undefined)
    }
  }

  const handleToggleMetricId = (metricId: string) => {
    const currentIds = rw?.metricIds ?? []
    const nextIds = currentIds.includes(metricId)
      ? currentIds.filter((id) => id !== metricId)
      : [...currentIds, metricId]
    handleSetRollingWindow({ metricIds: nextIds })
  }

  return (
    <div className="w-56 shrink-0 border-r border-border overflow-y-auto p-3 space-y-4">
      {/* 1. Columns */}
      <div>
        <Label className="text-[10px] font-medium">{_t("explore.columns")}</Label>
        <div className="mt-1 space-y-0.5">
          {columns.map((col) => (
            <div key={col.name} className="flex items-center justify-between gap-1 py-0.5">
              <span className="text-xs truncate flex-1" title={`${col.name} (${col.type})`}>
                {col.name}
              </span>
              <span className="text-[9px] text-muted-foreground shrink-0 max-w-[60px] truncate">{col.type}</span>
              <div className="flex gap-0.5 shrink-0">
                <button
                  onClick={() => handleQuickMetric(col.name)}
                  className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                  title={_t("explore.add_metric")}
                >
                  M
                </button>
                <button
                  onClick={() => handleQuickDimension(col.name)}
                  className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/80 font-medium"
                  title={_t("explore.add_dimension")}
                >
                  D
                </button>
              </div>
            </div>
          ))}
          {columns.length === 0 && fetchingSchema && (
            <div className="text-[10px] text-muted-foreground">{_t("explore.fetching_schema")}</div>
          )}
          {columns.length === 0 && schemaError && (
            <div className="space-y-1">
              <div className="text-[10px] text-destructive">{schemaError}</div>
              <Button size="xs" variant="outline" className="h-5 text-[9px]" onClick={fetchSchema}>
                {_t("error.retry")}
              </Button>
            </div>
          )}
          {columns.length === 0 && !fetchingSchema && !schemaError && (
            <div className="text-[10px] text-muted-foreground">{_t("explore.no_dataset")}</div>
          )}
        </div>
      </div>

      {/* 2. Metrics */}
      <div>
        <Label className="text-[10px] font-medium">{_t("explore.metrics")}</Label>
        <div className="mt-1 space-y-0.5">
          {(config?.metrics ?? []).map((m) => {
            const isSaved = savedMetricIds.has(m.id)
            return (
              <div key={m.id} className="flex items-center justify-between gap-1 py-0.5 group">
                <span className="text-xs truncate flex-1">
                  {m.type === "simple"
                    ? `${m.label} (${m.aggregation}(${m.column}))`
                    : <span>{m.label} <Code className="w-2.5 h-2.5 inline" /></span>}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  {!isSaved && datasetId && (
                    <button
                      onClick={() => handleSaveToDataset(m)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                      title={_t("explore.save_to_dataset")}
                    >
                      <Save className="w-3 h-3" />
                    </button>
                  )}
                  {isSaved && (
                    <span className="text-[9px] text-green-600" title={_t("explore.saved")}>✓</span>
                  )}
                  <button
                    onClick={() => onRemoveMetric(m.id)}
                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
          {showMetricForm ? (
            <div className="space-y-1.5 mt-1 p-1.5 rounded border border-border">
              {/* Mode toggle */}
              <div className="flex gap-1">
                <button
                  onClick={() => setMetricMode("simple")}
                  className={`text-[9px] px-2 py-0.5 rounded font-medium flex-1 ${
                    metricMode === "simple"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {_t("explore.metric_simple")}
                </button>
                <button
                  onClick={() => setMetricMode("custom_sql")}
                  className={`text-[9px] px-2 py-0.5 rounded font-medium flex-1 ${
                    metricMode === "custom_sql"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {_t("explore.metric_custom_sql")}
                </button>
              </div>

              {metricMode === "simple" ? (
                <>
                  <div>
                    <Label className="text-[9px]">{_t("explore.column")}</Label>
                    <Select value={metricColumn} onValueChange={(v) => v && setMetricColumn(v)}>
                      <SelectTrigger className="mt-0.5 h-7 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((c) => (
                          <SelectItem key={c.name} value={c.name} className="text-xs">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px]">{_t("explore.aggregation")}</Label>
                    <Select value={metricAgg} onValueChange={(v) => setMetricAgg(v as AggregationType)}>
                      <SelectTrigger className="mt-0.5 h-7 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AGGREGATIONS.map((a) => (
                          <SelectItem key={a} value={a} className="text-xs">
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px]">{_t("explore.label")}</Label>
                    <Input
                      value={metricLabel}
                      onChange={(e) => setMetricLabel(e.target.value)}
                      className="mt-0.5 h-7 text-[10px]"
                      placeholder={metricColumn || ""}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-[9px]">{_t("explore.label")}</Label>
                    <Input
                      value={customSqlLabel}
                      onChange={(e) => setCustomSqlLabel(e.target.value)}
                      className="mt-0.5 h-7 text-[10px]"
                      placeholder={_t("explore.label")}
                    />
                  </div>
                  <div>
                    <Label className="text-[9px]">{_t("explore.sql_expression")}</Label>
                    <div className="mt-0.5 border rounded overflow-hidden" style={{ height: "80px" }}>
                      <CodeMirror
                        value={customSqlExpression}
                        onChange={setCustomSqlExpression}
                        extensions={sqlExtensions}
                        theme={activeTheme}
                        height="80px"
                        basicSetup={{ lineNumbers: false, foldGutter: false, indentOnInput: true }}
                        placeholder={_t("explore.sql_expression_placeholder")}
                        className="text-xs [&_.cm-editor]:h-full [&_.cm-content]:font-mono [&_.cm-scroller]:overflow-auto"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[9px]">Format</Label>
                    <Select value={customSqlFormat} onValueChange={(v) => setCustomSqlFormat(v as MetricFormat)}>
                      <SelectTrigger className="mt-0.5 h-7 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAT_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value} className="text-xs">
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="flex gap-1">
                <Button size="xs" className="h-6 text-[10px] flex-1" onClick={handleAddMetric}>
                  {_t("explore.add_metric")}
                </Button>
                <Button size="xs" variant="outline" className="h-6 text-[10px]" onClick={() => setShowMetricForm(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="xs"
              variant="outline"
              className="w-full h-6 text-[10px]"
              onClick={() => setShowMetricForm(true)}
            >
              <Plus className="w-3 h-3 mr-0.5" />
              {_t("explore.add_metric")}
            </Button>
          )}
        </div>
      </div>

      {/* 3. Dimensions */}
      <div>
        <Label className="text-[10px] font-medium">{_t("explore.dimensions")}</Label>
        <div className="mt-1 space-y-0.5">
          {(config?.dimensions ?? []).map((d) => (
            <div key={d.column} className="flex items-center justify-between gap-1 py-0.5 group">
              <span className="text-xs truncate flex-1">
                {d.column}
                {d.type === "temporal" && d.timeGranularity ? ` (${_t(`explore.${d.timeGranularity}`)})` : ""}
              </span>
              <button
                onClick={() => onRemoveDimension(d.column)}
                className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {showDimForm ? (
            <div className="space-y-1.5 mt-1 p-1.5 rounded border border-border">
              <div>
                <Label className="text-[9px]">{_t("explore.column")}</Label>
                <Select value={dimColumn} onValueChange={(v) => v && setDimColumn(v)}>
                  <SelectTrigger className="mt-0.5 h-7 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c.name} value={c.name} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {dimColumn && (() => {
                const col = columns.find((c) => c.name === dimColumn)
                const isTemporal = col?.type.match(/Date|Time/i)
                return isTemporal ? (
                  <div>
                    <Label className="text-[9px]">{_t("explore.granularity")}</Label>
                    <Select value={dimGranularity} onValueChange={(v) => setDimGranularity(v as TimeGranularity)}>
                      <SelectTrigger className="mt-0.5 h-7 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GRANULARITIES.map((g) => (
                          <SelectItem key={g} value={g} className="text-xs">
                            {_t(`explore.${g}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null
              })()}
              <div className="flex gap-1">
                <Button size="xs" className="h-6 text-[10px] flex-1" onClick={handleAddDimension}>
                  {_t("explore.add_dimension")}
                </Button>
                <Button size="xs" variant="outline" className="h-6 text-[10px]" onClick={() => setShowDimForm(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="xs"
              variant="outline"
              className="w-full h-6 text-[10px]"
              onClick={() => setShowDimForm(true)}
            >
              <Plus className="w-3 h-3 mr-0.5" />
              {_t("explore.add_dimension")}
            </Button>
          )}
        </div>
      </div>

      {/* 4. Time Config */}
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-medium">{_t("explore.time_config")}</Label>
          <Switch
            checked={timeEnabled}
            onCheckedChange={(checked) => {
              if (checked) {
                const firstTimeCol = timeColumns[0]
                if (firstTimeCol) {
                  onSetTimeConfig({
                    timeColumn: firstTimeCol.name,
                    granularity: "day",
                    timeRange: "No filter",
                  })
                }
              } else {
                onSetTimeConfig(undefined)
              }
            }}
            size="sm"
          />
        </div>
        {timeEnabled && timeConfig && (
          <div className="mt-1.5 space-y-1.5">
            <div>
              <Label className="text-[9px]">{_t("explore.time_column")}</Label>
              <Select
                value={timeConfig.timeColumn}
                onValueChange={(v) => v && onSetTimeConfig({ ...timeConfig, timeColumn: v })}
              >
                <SelectTrigger className="mt-0.5 h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeColumns.map((c) => (
                    <SelectItem key={c.name} value={c.name} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[9px]">{_t("explore.granularity")}</Label>
              <Select
                value={timeConfig.granularity}
                onValueChange={(v) => onSetTimeConfig({ ...timeConfig, granularity: v as TimeGranularity })}
              >
                <SelectTrigger className="mt-0.5 h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRANULARITIES.map((g) => (
                    <SelectItem key={g} value={g} className="text-xs">
                      {_t(`explore.${g}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[9px]">{_t("explore.time_range")}</Label>
              <Select
                value={timeConfig.timeRange}
                onValueChange={(v) => onSetTimeConfig({ ...timeConfig, timeRange: v as TimeConfig["timeRange"] })}
              >
                <SelectTrigger className="mt-0.5 h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {_t(`explore.${r === "No filter" ? "no_filter" : r === "Last 7 days" ? "last_7_days" : r === "Last 30 days" ? "last_30_days" : r === "Last quarter" ? "last_quarter" : r === "Last year" ? "last_year" : "custom"}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {timeConfig.timeRange === "Custom" && (
              <div className="flex gap-1">
                <div className="flex-1">
                  <Label className="text-[9px]">{_t("explore.from")}</Label>
                  <Input
                    type="date"
                    value={timeConfig.customRange?.from ?? ""}
                    onChange={(e) =>
                      onSetTimeConfig({
                        ...timeConfig,
                        customRange: { from: e.target.value, to: timeConfig.customRange?.to ?? "" },
                      })
                    }
                    className="mt-0.5 h-7 text-[10px]"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-[9px]">{_t("explore.to")}</Label>
                  <Input
                    type="date"
                    value={timeConfig.customRange?.to ?? ""}
                    onChange={(e) =>
                      onSetTimeConfig({
                        ...timeConfig,
                        customRange: { from: timeConfig.customRange?.from ?? "", to: e.target.value },
                      })
                    }
                    className="mt-0.5 h-7 text-[10px]"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Analytics */}
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-medium">{_t("explore.analytics")}</Label>
          <Switch
            checked={rwEnabled}
            onCheckedChange={handleToggleRollingWindow}
            size="sm"
          />
        </div>
        {rwEnabled && rw && (
          <div className="mt-1.5 space-y-1.5">
            <div>
              <Label className="text-[9px]">{_t("explore.window_size")}</Label>
              <Input
                type="number"
                min={2}
                value={rw.windowSize}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (v >= 2) handleSetRollingWindow({ windowSize: v })
                }}
                className="mt-0.5 h-7 text-[10px]"
              />
            </div>
            <div>
              <Label className="text-[9px]">{_t("explore.window_function")}</Label>
              <Select
                value={rw.function}
                onValueChange={(v) => v && handleSetRollingWindow({ function: v as WindowFunction })}
              >
                <SelectTrigger className="mt-0.5 h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["AVG", "SUM", "MIN", "MAX"] as WindowFunction[]).map((f) => (
                    <SelectItem key={f} value={f} className="text-xs">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[9px]">{_t("explore.apply_to_metrics")}</Label>
              <div className="mt-0.5 space-y-0.5 max-h-24 overflow-y-auto">
                {(config?.metrics ?? []).map((m) => {
                  const checked = rw.metricIds.includes(m.id)
                  return (
                    <label key={m.id} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleMetricId(m.id)}
                        className="w-3 h-3 accent-primary"
                      />
                      <span className="text-[10px] truncate">{m.label}</span>
                    </label>
                  )
                })}
                {(config?.metrics ?? []).length === 0 && (
                  <span className="text-[9px] text-muted-foreground">{_t("explore.no_metric")}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
