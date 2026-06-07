"use client"

import { useState, useMemo, useCallback } from "react"
import { usePivotStore } from "@/stores/pivot"
import { usePivotHistoryStore } from "@/stores/pivot-history"
import { useDatasetStore } from "@/stores/dataset"
import { useLang } from "@/components/lang-provider"
import { CalculatedIndicatorDialog } from "./calculated-indicator-dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ColumnMeta } from "@/lib/clickhouse"
import type { PivotIndicator, CalculatedIndicator } from "@/lib/pivot-sql"

interface PivotConfigPanelProps {
  schema: ColumnMeta[]
  tableName: string
  database: string
  onExecute: () => void
  onViewSql: () => void
}

const AGGREGATION_OPTIONS = [
  { value: "SUM", label: "SUM" },
  { value: "AVG", label: "AVG" },
  { value: "COUNT", label: "COUNT" },
  { value: "MIN", label: "MIN" },
  { value: "MAX", label: "MAX" },
  { value: "DISTINCT_COUNT", label: "COUNT DISTINCT" },
] as const

function isDimensionType(type: string): boolean {
  const base = type.replace(/^Nullable\((.+)\)$/, "$1")
  return /^(String|FixedString|LowCardinality|Date|DateTime|Bool|Enum)/.test(base)
}

function isIndicatorType(type: string): boolean {
  const base = type.replace(/^Nullable\((.+)\)$/, "$1")
  return /^(Int|UInt|Float|Decimal)/.test(base)
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

export function PivotConfigPanel({
  schema,
  tableName,
  database,
  onExecute,
  onViewSql,
}: PivotConfigPanelProps) {
  const { _t } = useLang()
  const [showCalcDialog, setShowCalcDialog] = useState(false)
  const [editingCalc, setEditingCalc] = useState<CalculatedIndicator | undefined>()

  const {
    rows,
    columns,
    indicators,
    calculatedIndicators,
    isExecuting,
    error,
    addRow,
    removeRow,
    addColumn,
    removeColumn,
    addIndicator,
    removeIndicator,
    updateIndicator,
    removeCalculatedIndicator,
    executePivot,
  } = usePivotStore()

  const { entries: historyEntries, addEntry } = usePivotHistoryStore()

  const dimensionCandidates = useMemo(
    () => schema.filter((c) => isDimensionType(c.type)),
    [schema]
  )

  const indicatorCandidates = useMemo(
    () => schema.filter((c) => isIndicatorType(c.type)),
    [schema]
  )

  const usedRowFields = new Set(rows)
  const usedColFields = new Set(columns)
  const usedIndicatorFields = new Set(indicators.map((i) => i.key))

  const handleAddIndicator = useCallback(
    (field: string) => {
      const meta = schema.find((s) => s.name === field)
      const agg = /count/i.test(field) ? "COUNT" : "SUM"
      addIndicator({
        key: `${field}_${agg.toLowerCase()}`,
        field,
        title: meta?.comment || field,
        aggregation: agg,
      })
    },
    [schema, addIndicator]
  )

  const handleExecute = useCallback(() => {
    executePivot(tableName, database)
    const state = usePivotStore.getState()
    if (state.resultData) {
      addEntry({
        tableName,
        database,
        config: {
          rows: state.rows,
          columns: state.columns,
          indicators: state.indicators,
          calculatedIndicators: state.calculatedIndicators,
          filters: state.filters,
          sort: state.sort ?? undefined,
          totals: state.totals,
        },
        rowCount: state.resultData.rows.length,
      })
    }
    onExecute()
  }, [executePivot, tableName, database, addEntry, onExecute])

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-2 space-y-2">
        {/* Row Dimensions */}
        <Section title={_t("pivot.rows")} count={rows.length}>
          <div className="flex flex-wrap gap-1 min-h-[28px] p-1 rounded border border-dashed border-border">
            {rows.map((field) => (
              <Tag key={field} label={field} onRemove={() => removeRow(field)} />
            ))}
            <Select onValueChange={(v: string | null) => v && addRow(v)}>
              <SelectTrigger className="h-6 w-6 border-none p-0 text-muted-foreground hover:text-foreground">
                <span className="text-xs">+</span>
              </SelectTrigger>
              <SelectContent>
                {dimensionCandidates
                  .filter((d) => !usedRowFields.has(d.name))
                  .map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      <span className="text-xs">{d.name} <span className="text-muted-foreground">{shortType(d.type)}</span></span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </Section>

        {/* Column Dimensions */}
        <Section title={_t("pivot.columns")} count={columns.length}>
          <div className="flex flex-wrap gap-1 min-h-[28px] p-1 rounded border border-dashed border-border">
            {columns.map((field) => (
              <Tag key={field} label={field} onRemove={() => removeColumn(field)} />
            ))}
            <Select onValueChange={(v: string | null) => v && addColumn(v)}>
              <SelectTrigger className="h-6 w-6 border-none p-0 text-muted-foreground hover:text-foreground">
                <span className="text-xs">+</span>
              </SelectTrigger>
              <SelectContent>
                {dimensionCandidates
                  .filter((d) => !usedColFields.has(d.name))
                  .map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      <span className="text-xs">{d.name} <span className="text-muted-foreground">{shortType(d.type)}</span></span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </Section>

        {/* Indicators */}
        <Section title={_t("pivot.indicators")} count={indicators.length}>
          <div className="space-y-1">
            {indicators.map((ind) => (
              <div key={ind.key} className="flex items-center gap-1 text-xs">
                <Select
                  value={ind.aggregation}
                  onValueChange={(v: string | null) =>
                    v && updateIndicator(ind.key, { aggregation: v as PivotIndicator["aggregation"] })
                  }
                >
                  <SelectTrigger className="h-6 w-24 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="flex-1 truncate">{ind.field}</span>
                <button
                  onClick={() => removeIndicator(ind.key)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
            <Select onValueChange={(v: string | null) => v && handleAddIndicator(v)}>
              <SelectTrigger className="h-6 text-[10px] text-muted-foreground">
                <SelectValue placeholder={`+ ${_t("pivot.add_indicator")}`} />
              </SelectTrigger>
              <SelectContent>
                {indicatorCandidates
                  .filter((c) => !usedIndicatorFields.has(`${c.name}_sum`))
                  .map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      <span className="text-xs">{c.name} <span className="text-muted-foreground">{shortType(c.type)}</span></span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </Section>

        {/* Calculated Indicators */}
        <Section title={_t("pivot.calculated")} count={calculatedIndicators.length}>
          <div className="space-y-1">
            {calculatedIndicators.map((calc) => (
              <div key={calc.key} className="flex items-center gap-1 text-xs">
                <span className="flex-1 truncate font-medium">{calc.title}</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {calc.expression}
                </span>
                <button
                  onClick={() => {
                    setEditingCalc(calc)
                    setShowCalcDialog(true)
                  }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  ✎
                </button>
                <button
                  onClick={() => removeCalculatedIndicator(calc.key)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] w-full"
              onClick={() => {
                setEditingCalc(undefined)
                setShowCalcDialog(true)
              }}
            >
              + {_t("pivot.add_calculated")}
            </Button>
          </div>
        </Section>

        {/* Error */}
        {error && (
          <div className="text-xs text-destructive p-1.5 rounded bg-destructive/10">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1 pt-1">
          <Button
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleExecute}
            disabled={isExecuting}
          >
            {isExecuting ? "..." : _t("pivot.execute")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onViewSql}
          >
            {_t("pivot.view_sql")}
          </Button>
        </div>

        {/* History */}
        {historyEntries.length > 0 && (
          <Section title={_t("pivot.history")} count={historyEntries.length}>
            <div className="space-y-0.5 max-h-32 overflow-auto">
              {historyEntries.slice(0, 10).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    usePivotStore.getState().loadConfig(entry.config)
                    if (entry.tableName) {
                      useDatasetStore.getState().setSelectedTable(entry.tableName)
                    }
                  }}
                  className="w-full text-left px-1.5 py-1 text-[10px] rounded hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span className="font-medium truncate">{entry.tableName}</span>
                    <span className="text-muted-foreground">
                      {entry.config.rows.join(", ")} × {entry.config.indicators.length + entry.config.calculatedIndicators.length}指标
                    </span>
                    <span className="ml-auto text-muted-foreground shrink-0">
                      {entry.rowCount}行
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>

      <CalculatedIndicatorDialog
        open={showCalcDialog}
        onOpenChange={setShowCalcDialog}
        existing={editingCalc}
        availableIndicators={indicators}
        existingCalculated={calculatedIndicators}
        onSave={(calc) => {
          if (editingCalc) {
            usePivotStore.getState().updateCalculatedIndicator(editingCalc.key, calc)
          } else {
            usePivotStore.getState().addCalculatedIndicator(calc)
          }
        }}
      />
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
  children: React.ReactNode
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
