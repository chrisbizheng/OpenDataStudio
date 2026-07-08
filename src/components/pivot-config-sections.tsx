"use client"

import { type ReactNode } from "react"
import { useDroppable } from "@dnd-kit/core"
import { useLang } from "@/components/lang-provider"
import { PivotFilterChip } from "./pivot-filter-chip"
import { PivotFieldSelect } from "./pivot-field-select"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { AGGREGATION_OPTIONS, aggregationShortLabel, formatLabel } from "@/lib/pivot-config-constants"
import { astToSummary } from "@/lib/calculated-indicator-expression"
import { buildPivotIndicatorTitle } from "@/lib/pivot-client-utils"
import type { PivotIndicator, CalculatedIndicator, FilterRule } from "@/lib/pivot-sql"
import type { ColumnMeta, TableRef } from "@/lib/types"

/* ── Helpers ── */

function DroppableZone({ id, children }: { id: string; children: ReactNode }) {
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

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
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

/* ── FiltersSection ── */

interface FiltersSectionProps {
  tableRef: TableRef
  filters: FilterRule[]
  getResolvedRole: (field: string) => { role: "dimension" | "indicator" } | null
  updateFilter: (field: string, updates: Partial<FilterRule>) => void
  removeFilter: (field: string) => void
  addFieldAsFilter: (field: string) => void
  sectionTitle: string
}

export function FiltersSection({
  tableRef,
  filters,
  getResolvedRole,
  updateFilter,
  removeFilter,
  addFieldAsFilter,
  sectionTitle,
}: FiltersSectionProps) {
  const { schema, database, tableName } = tableRef
  const { _t } = useLang()
  return (
    <Section title={sectionTitle} count={filters.length}>
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
        <PivotFieldSelect
          options={schema.filter((d) => !filters.some((f) => f.field === d.name)).filter((d) => getResolvedRole(d.name))}
          onValueChange={addFieldAsFilter}
          placeholder={_t("pivot.add_filter_placeholder")}
        />
      </DroppableZone>
    </Section>
  )
}

/* ── RowsSection ── */

interface RowsSectionProps {
  rows: string[]
  dimensionCandidates: ColumnMeta[]
  usedRowFields: Set<string>
  removeRow: (field: string) => void
  addRow: (field: string) => void
  sectionTitle: string
}

export function RowsSection({
  rows,
  dimensionCandidates,
  usedRowFields,
  removeRow,
  addRow,
  sectionTitle,
}: RowsSectionProps) {
  const { _t } = useLang()
  return (
    <Section title={sectionTitle} count={rows.length}>
      <DroppableZone id="rows">
        {rows.map((field) => (
          <Tag key={field} label={field} onRemove={() => removeRow(field)} />
        ))}
        <PivotFieldSelect
          options={dimensionCandidates.filter((d) => !usedRowFields.has(d.name))}
          onValueChange={addRow}
          placeholder={_t("pivot.add_row_dim_placeholder")}
        />
      </DroppableZone>
    </Section>
  )
}

/* ── ColumnsSection ── */

interface ColumnsSectionProps {
  columns: string[]
  dimensionCandidates: ColumnMeta[]
  usedColFields: Set<string>
  removeColumn: (field: string) => void
  addColumn: (field: string) => void
  sectionTitle: string
}

export function ColumnsSection({
  columns,
  dimensionCandidates,
  usedColFields,
  removeColumn,
  addColumn,
  sectionTitle,
}: ColumnsSectionProps) {
  const { _t } = useLang()
  return (
    <Section title={sectionTitle} count={columns.length}>
      <DroppableZone id="columns">
        {columns.map((field) => (
          <Tag key={field} label={field} onRemove={() => removeColumn(field)} />
        ))}
        <PivotFieldSelect
          options={dimensionCandidates.filter((d) => !usedColFields.has(d.name))}
          onValueChange={addColumn}
          placeholder={_t("pivot.add_col_dim_placeholder")}
        />
      </DroppableZone>
    </Section>
  )
}

/* ── IndicatorsSection ── */

interface IndicatorsSectionProps {
  indicators: PivotIndicator[]
  indicatorCandidates: ColumnMeta[]
  indicatorSelectValue: string
  setIndicatorSelectValue: (v: string) => void
  indicatorTitleDrafts: Record<string, string>
  setIndicatorTitleDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>
  commitIndicatorTitle: (key: string) => void
  setFormatIndicatorKey: (key: string | undefined) => void
  updateIndicator: (key: string, updates: Partial<PivotIndicator>) => void
  removeIndicator: (key: string) => void
  addFieldAsIndicator: (field: string) => void
  sectionTitle: string
  addIndicatorPlaceholder: string
}

export function IndicatorsSection({
  indicators,
  indicatorCandidates,
  indicatorSelectValue,
  setIndicatorSelectValue,
  indicatorTitleDrafts,
  setIndicatorTitleDrafts,
  commitIndicatorTitle,
  setFormatIndicatorKey,
  updateIndicator,
  removeIndicator,
  addFieldAsIndicator,
  sectionTitle,
  addIndicatorPlaceholder,
}: IndicatorsSectionProps) {
  const { _t } = useLang()
  return (
    <Section title={sectionTitle} count={indicators.length}>
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
              title={_t("pivot.click_to_format")}
            >
              <span className="max-w-full truncate text-[10px]">{ind.field}</span>
              <span className="max-w-full truncate text-[9px]">{formatLabel(ind, _t)}</span>
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
        <PivotFieldSelect
          options={indicatorCandidates}
          value={indicatorSelectValue}
          onValueChange={(v) => {
            addFieldAsIndicator(v)
            setIndicatorSelectValue("")
          }}
          placeholder={addIndicatorPlaceholder}
        />
      </div>
    </Section>
  )
}

/* ── CalculatedSection ── */

interface CalculatedSectionProps {
  calculatedIndicators: CalculatedIndicator[]
  setEditingCalc: (calc: CalculatedIndicator | undefined) => void
  setShowCalcDialog: (open: boolean) => void
  removeCalculatedIndicator: (key: string) => void
  sectionTitle: string
  addCalculatedLabel: string
}

export function CalculatedSection({
  calculatedIndicators,
  setEditingCalc,
  setShowCalcDialog,
  removeCalculatedIndicator,
  sectionTitle,
  addCalculatedLabel,
}: CalculatedSectionProps) {
  const { _t } = useLang()
  return (
    <Section title={sectionTitle} count={calculatedIndicators.length}>
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
              {formatLabel(calc, _t)}
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
          {addCalculatedLabel}
        </button>
      </div>
    </Section>
  )
}
