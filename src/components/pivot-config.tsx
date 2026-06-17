"use client"

import { useState, useMemo, useCallback, type ReactNode } from "react"
import { useDroppable } from "@dnd-kit/core"
import { usePivotStore, validatePivotExecution } from "@/stores/pivot"
import { usePivotHistoryStore } from "@/stores/pivot-history"
import { useDatasetStore } from "@/stores/dataset"
import { useLang } from "@/components/lang-provider"
import { formatType, isDimensionType } from "@/lib/column-type-classifier"
import { astToSummary } from "@/lib/expression"
import { CalculatedIndicatorDialog } from "./calculated-indicator-dialog"
import { IndicatorFormatDialog } from "./indicator-format-dialog"
import { PivotFilterChip } from "./pivot-filter-chip"
import { HistoryPanel } from "./history-panel"
import { SnakeSpinner } from "@/components/snake-spinner"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toPivotHistoryItem } from "@/lib/history-items"
import { buildPivotIndicatorTitle } from "@/lib/pivot-client-utils"
import { runPivotExecution } from "@/lib/pivot-execution"
import { usePivotOrchestrator } from "@/hooks/use-pivot-orchestrator"
import { useData } from "@/components/data-provider"
import type { ColumnMeta } from "@/lib/types"
import type { PivotIndicator, CalculatedIndicator, FilterRule } from "@/lib/pivot-sql"

interface PivotConfigPanelProps {
  schema: ColumnMeta[]
  tableName: string
  database: string
  onExecute: () => void
  onViewSql: () => void
}

const AGGREGATION_OPTIONS = [
  { value: "SUM", label: "SUM", shortLabel: "SUM" },
  { value: "AVG", label: "AVG", shortLabel: "AVG" },
  { value: "COUNT", label: "COUNT", shortLabel: "CNT" },
  { value: "MIN", label: "MIN", shortLabel: "MIN" },
  { value: "MAX", label: "MAX", shortLabel: "MAX" },
  { value: "DISTINCT_COUNT", label: "COUNT DISTINCT", shortLabel: "DCT" },
] as const

function aggregationShortLabel(value: PivotIndicator["aggregation"]) {
  return AGGREGATION_OPTIONS.find((option) => option.value === value)?.shortLabel ?? value
}

function formatLabel(indicator: { format?: "number" | "percent" | "currency"; decimals?: number }) {
  const format = indicator.format ?? "number"
  const decimals = indicator.decimals ?? 2
  if (format === "percent") return `百分比 · ${decimals}位`
  if (format === "currency") return `货币 · ${decimals}位`
  return `数字 · ${decimals}位`
}

export function PivotConfigPanel({
  schema,
  tableName,
  database,
  onExecute,
  onViewSql,
}: PivotConfigPanelProps) {
  const { _t, lang } = useLang()
  const { queryEngine } = useData()
  const [showCalcDialog, setShowCalcDialog] = useState(false)
  const [editingCalc, setEditingCalc] = useState<CalculatedIndicator | undefined>()
  const [formatIndicatorKey, setFormatIndicatorKey] = useState<string | undefined>()
  const [indicatorSelectValue, setIndicatorSelectValue] = useState("")
  const [indicatorTitleDrafts, setIndicatorTitleDrafts] = useState<Record<string, string>>({})

  const {
    rows,
    columns,
    indicators,
    calculatedIndicators,
    filters,
    isExecuting,
    removeRow,
    removeColumn,
    removeIndicator,
    updateIndicator,
    updateFilter,
    removeFilter,
    removeCalculatedIndicator,
    setExecuting,
    setError,
    setResultData,
    setLastSQL,
    updateCalculatedIndicator,
    addCalculatedIndicator,
    loadConfig,
  } = usePivotStore()

  const { entries: historyEntries, addEntry, clear: clearHistory } = usePivotHistoryStore()
  const selectedDatabase = useDatasetStore((s) => s.selectedDatabase)
  const dbEntries = historyEntries.filter((e) => e.database === selectedDatabase)

  const { pivotConfig, store, getResolvedRole, addFieldAsFilter, addFieldAsIndicator, addRow, addColumn } = usePivotOrchestrator(schema, tableName, database)

  const dimensionCandidates = useMemo(
    () => schema.filter((c) => isDimensionType(c.type)),
    [schema]
  )

  const indicatorCandidates = useMemo(
    () => schema,
    [schema]
  )

  const usedRowFields = new Set(rows)
  const usedColFields = new Set(columns)
  const formatIndicator = indicators.find((indicator) => indicator.key === formatIndicatorKey)

  const commitIndicatorTitle = useCallback(
    (key: string) => {
      const draft = indicatorTitleDrafts[key]
      if (draft === undefined) return
      updateIndicator(key, { title: draft })
      setIndicatorTitleDrafts((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    },
    [indicatorTitleDrafts, updateIndicator]
  )

  const handleExecute = useCallback(async () => {
    const validationError = validatePivotExecution(store, tableName, database)
    if (validationError) {
      setError(validationError)
      return
    }

    for await (const event of runPivotExecution(
      { config: pivotConfig, tableName, database },
      { executeSql: (sql, db) => queryEngine.execute(sql, db) }
    )) {
      switch (event.type) {
        case "started":
          setExecuting(true)
          setError(null)
          break
        case "succeeded":
          setResultData({ columns: event.result.columns, rows: event.result.rows })
          setLastSQL(event.sql)
          setExecuting(false)
          addEntry({
            tableName,
            database,
            config: event.config,
            sql: event.sql,
            rowCount: event.result.rows.length,
          })
          onExecute()
          break
        case "error":
          setError(event.message)
          setLastSQL(event.sql)
          setExecuting(false)
          break
        case "aborted":
          setExecuting(false)
          break
      }
    }
  }, [store, pivotConfig, tableName, database, addEntry, onExecute, queryEngine, setExecuting, setError, setResultData, setLastSQL])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border shrink-0">
        <Button
          size="sm"
          className="h-6 text-xs px-2"
          onClick={handleExecute}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <SnakeSpinner size={14} />
          ) : _t("pivot.execute")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={onViewSql}
        >
          {_t("pivot.view_sql")}
        </Button>
      </div>
      <div className="p-2 space-y-2 flex flex-col min-h-0 flex-1 overflow-auto">
        {/* Filters */}
        <Section title={_t("pivot.filters")} count={filters.length}>
          <DroppableZone id="filters">
            {filters.map((filter) => {
              const meta = schema.find((s) => s.name === filter.field)
              const role = getResolvedRole(filter.field)
              if (!meta || !role) return null
              return (
                <PivotFilterChip
                  key={filter.field}
                  filter={filter}
                  role={role.role}
                  type={meta.type}
                  database={database}
                  tableName={tableName}
                  onChange={(next: FilterRule) => updateFilter(filter.field, next)}
                  onRemove={() => removeFilter(filter.field)}
                />
              )
            })}
            <Select onValueChange={(v: string | null) => v && addFieldAsFilter(v)}>
              <SelectTrigger className="h-6 w-auto justify-center rounded border-none p-0 px-1 text-[10px] text-muted-foreground shadow-none transition-colors hover:bg-muted hover:text-foreground [&_svg]:hidden *:data-[slot=select-value]:flex-none">
                <SelectValue placeholder="+添加筛选字段" />
              </SelectTrigger>
              <SelectContent>
                {schema
                  .filter((d) => !filters.some((f) => f.field === d.name))
                  .filter((d) => getResolvedRole(d.name))
                  .map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      <span className="text-xs">{d.name} <span className="text-muted-foreground">{formatType(d.type)}</span></span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </DroppableZone>
        </Section>

        {/* Row Dimensions */}
        <Section title={_t("pivot.rows")} count={rows.length}>
          <DroppableZone id="rows">
            {rows.map((field) => (
              <Tag key={field} label={field} onRemove={() => removeRow(field)} />
            ))}
            <Select onValueChange={(v: string | null) => v && addRow(v)}>
              <SelectTrigger className="h-6 w-auto justify-center rounded border-none p-0 px-1 text-[10px] text-muted-foreground shadow-none transition-colors hover:bg-muted hover:text-foreground [&_svg]:hidden *:data-[slot=select-value]:flex-none">
                <SelectValue placeholder="+ 添加行维度" />
              </SelectTrigger>
              <SelectContent>
                {dimensionCandidates
                  .filter((d) => !usedRowFields.has(d.name))
                  .map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      <span className="text-xs">{d.name} <span className="text-muted-foreground">{formatType(d.type)}</span></span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </DroppableZone>
        </Section>

        {/* Column Dimensions */}
        <Section title={_t("pivot.columns")} count={columns.length}>
          <DroppableZone id="columns">
            {columns.map((field) => (
              <Tag key={field} label={field} onRemove={() => removeColumn(field)} />
            ))}
            <Select onValueChange={(v: string | null) => v && addColumn(v)}>
              <SelectTrigger className="h-6 w-auto justify-center rounded border-none p-0 px-1 text-[10px] text-muted-foreground shadow-none transition-colors hover:bg-muted hover:text-foreground [&_svg]:hidden *:data-[slot=select-value]:flex-none">
                <SelectValue placeholder="+ 添加列维度" />
              </SelectTrigger>
              <SelectContent>
                {dimensionCandidates
                  .filter((d) => !usedColFields.has(d.name))
                  .map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      <span className="text-xs">{d.name} <span className="text-muted-foreground">{formatType(d.type)}</span></span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </DroppableZone>
        </Section>

        {/* Indicators — P1-11: stronger visual hierarchy */}
        <Section title={_t("pivot.indicators")} count={indicators.length}>
          <div className="flex flex-col gap-1 min-h-[28px] p-1.5 rounded-md border border-solid border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10">
            {indicators.map((ind) => (
              <span
                key={ind.key}
                className="group flex w-full max-w-full items-center gap-1 rounded-md border-l-2 border-emerald-400 bg-muted/45 px-2 py-1.5 text-[10px] text-foreground dark:border-emerald-500 dark:bg-muted/25"
              >
                <input
                  value={indicatorTitleDrafts[ind.key] ?? ind.title}
                  onChange={(e) => setIndicatorTitleDrafts((current) => ({ ...current, [ind.key]: e.target.value }))}
                  onBlur={() => commitIndicatorTitle(ind.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur()
                    }
                  }}
                  className="min-w-0 flex-1 rounded-sm bg-transparent px-1 py-0.5 text-[10px] font-medium outline-none transition-[font-size] focus:bg-background/70 focus:text-xs"
                  title={ind.comment || ind.field}
                />
                <button
                  type="button"
                  onClick={() => setFormatIndicatorKey(ind.key)}
                  className="ml-auto flex min-w-0 max-w-28 shrink-0 flex-col items-start rounded bg-background/70 px-1.5 py-0.5 text-left text-muted-foreground transition-[max-width] hover:bg-background group-focus-within:max-w-36"
                  title="点击设置格式"
                >
                  <span className="max-w-full truncate text-[10px]">{ind.field}</span>
                  <span className="max-w-full truncate text-[9px]">{formatLabel(ind)}</span>
                </button>
                <Select
                  value={ind.aggregation}
                  onValueChange={(v: string | null) => {
                    if (!v) return
                    const newAgg = v as PivotIndicator["aggregation"]
                    const newKey = buildPivotIndicatorTitle(ind.field, newAgg)
                    updateIndicator(ind.key, { aggregation: newAgg, key: newKey, title: newKey })
                  }}
                >
                  <SelectTrigger className="h-6 w-12 shrink-0 border-0 bg-background/70 px-1 text-[9px] text-foreground shadow-none" title={AGGREGATION_OPTIONS.find((option) => option.value === ind.aggregation)?.label}>
                    <span>{aggregationShortLabel(ind.aggregation)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-[10px]">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => removeIndicator(ind.key)}
                  className="h-5 w-5 shrink-0 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  ×
                </button>
              </span>
            ))}
            <Select
              value={indicatorSelectValue}
              onValueChange={(v: string | null) => {
                if (!v) return
                addFieldAsIndicator(v)
                setIndicatorSelectValue("")
              }}
            >
              <SelectTrigger className="h-6 w-auto justify-center rounded border-none p-0 px-1 text-[10px] text-muted-foreground shadow-none transition-colors hover:bg-muted hover:text-foreground [&_svg]:hidden *:data-[slot=select-value]:flex-none">
                <SelectValue placeholder={`+ ${_t("pivot.add_indicator")}`} />
              </SelectTrigger>
              <SelectContent>
                {indicatorCandidates
                  .map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      <span className="text-xs">{c.name} <span className="text-muted-foreground">{formatType(c.type)}</span></span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </Section>

        {/* Calculated Indicators — P1-11: stronger visual hierarchy */}
        <Section title={_t("pivot.calculated")} count={calculatedIndicators.length}>
          <div className="flex flex-col gap-1 min-h-[28px] p-1.5 rounded-md border border-solid border-violet-200 dark:border-violet-800/50 bg-violet-50/30 dark:bg-violet-900/10">
            {calculatedIndicators.map((calc) => (
              <div
                key={calc.key}
                className="flex w-full max-w-full items-center gap-1 rounded-md border-l-2 border-violet-400 bg-muted/45 px-2 py-1.5 text-[10px] text-foreground dark:border-violet-500 dark:bg-muted/25"
              >
                <div className="min-w-0 flex-1 px-1">
                  <div className="truncate text-[10px] font-medium">{calc.title}</div>
                  <div className="truncate text-[9px] text-muted-foreground" title={JSON.stringify(calc.logic)}>
                    {astToSummary(calc.logic)}
                  </div>
                </div>
                <span className="shrink-0 rounded bg-background/70 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                  {formatLabel(calc)}
                </span>
                <button
                  onClick={() => {
                    setEditingCalc(calc)
                    setShowCalcDialog(true)
                  }}
                  className="h-5 w-5 shrink-0 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  ✎
                </button>
                <button
                  onClick={() => removeCalculatedIndicator(calc.key)}
                  className="h-5 w-5 shrink-0 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="h-6 rounded px-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                setEditingCalc(undefined)
                setShowCalcDialog(true)
              }}
            >
              + {_t("pivot.add_calculated")}
            </button>
          </div>
        </Section>

        <div className="flex flex-col flex-1 min-h-0 border-t border-border">
          <div className="flex border-b border-border shrink-0">
            <div className="flex-1 text-[10px] font-medium py-1.5 px-2 text-muted-foreground border-b border-border">
              {_t("panel.history")}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <HistoryPanel
              items={dbEntries.map((e) => toPivotHistoryItem(e, lang))}
              emptyLabel={_t("panel.no_history")}
              onClear={clearHistory}
              onSelect={(item) => {
                const entry = dbEntries.find((history) => history.id === item.id)
                if (!entry) return
                loadConfig(entry.config)
                if (entry.tableName) {
                  useDatasetStore.getState().selectTable(entry.tableName)
                }
              }}
            />
          </div>
        </div>
      </div>

      <CalculatedIndicatorDialog
        key={editingCalc?.key ?? "new-calculated-indicator"}
        open={showCalcDialog}
        onOpenChange={setShowCalcDialog}
        existing={editingCalc}
        availableIndicators={indicators}
        existingCalculated={calculatedIndicators}
        schema={schema}
        tableName={tableName}
        database={database}
        onSave={(calc) => {
          if (editingCalc) {
            updateCalculatedIndicator(editingCalc.key, calc)
          } else {
            addCalculatedIndicator(calc)
          }
        }}
      />

      <IndicatorFormatDialog
        key={formatIndicatorKey ?? "format-dialog"}
        open={!!formatIndicatorKey}
        onOpenChange={(open) => { if (!open) setFormatIndicatorKey(undefined) }}
        indicator={formatIndicator}
        onSave={(format, decimals) => {
          if (formatIndicatorKey) {
            updateIndicator(formatIndicatorKey, { format, decimals })
          }
        }}
      />
    </div>
  )
}

function DroppableZone({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `zone:${id}` })
  return (
    <div
      ref={setNodeRef}
      aria-label={`${id} drop zone`}
      className={`flex flex-wrap gap-1 min-h-[28px] p-1 rounded border border-dashed ${isOver ? "border-primary bg-primary/5" : "border-border"}`}
    >
      {children}
    </div>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        {count > 0 && (
          <span className="text-[10px] text-muted-foreground">({count})</span>
        )}
      </div>
      {children}
    </div>
  )
}

function Tag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
      {label}
      <button onClick={onRemove} className="hover:text-destructive">×</button>
    </span>
  )
}
