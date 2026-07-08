"use client"

import { useState, useMemo, useCallback } from "react"
import { useShallow } from "zustand/react/shallow"
import { usePivotConfigStore } from "@/stores/pivot-config"
import { loadPivotConfig, addCalculatedIndicatorWithValidation } from "@/stores/pivot-facade"
import { usePivotHistoryStore } from "@/stores/pivot-history"
import { useDatasetStore } from "@/stores/dataset"
import { useLang } from "@/components/lang-provider"
import { isDimensionType } from "@/lib/column-type-classifier"
import { HistoryPanel } from "./history-panel"
import { PivotConfigToolbar } from "./pivot-config-toolbar"
import { PivotConfigDialogs } from "./pivot-config-dialogs"
import { FiltersSection, RowsSection, ColumnsSection, IndicatorsSection, CalculatedSection } from "./pivot-config-sections"
import { toPivotHistoryItem } from "@/lib/history-items"
import { usePivotOrchestrator } from "@/hooks/use-pivot-orchestrator"
import type { TableRef } from "@/lib/types"
import type { CalculatedIndicator } from "@/lib/pivot-sql"

interface PivotConfigPanelProps {
  tableRef: TableRef
  onViewSql: () => void
}

function usePivotConfigDialogs() {
  const [showCalcDialog, setShowCalcDialog] = useState(false)
  const [editingCalc, setEditingCalc] = useState<CalculatedIndicator | undefined>()
  const [formatIndicatorKey, setFormatIndicatorKey] = useState<string | undefined>()

  const indicators = usePivotConfigStore((s) => s.indicators)
  const updateIndicator = usePivotConfigStore((s) => s.updateIndicator)
  const updateCalculatedIndicator = usePivotConfigStore((s) => s.updateCalculatedIndicator)

  const formatIndicator = indicators.find((indicator) => indicator.key === formatIndicatorKey)

  const calcOnSave = useCallback(
    (calc: CalculatedIndicator) => {
      if (editingCalc) {
        updateCalculatedIndicator(editingCalc.key, calc)
      } else {
        addCalculatedIndicatorWithValidation(calc)
      }
    },
    [editingCalc, updateCalculatedIndicator]
  )

  const formatOnSave = useCallback(
    (format: "number" | "percent" | "currency", decimals: number) => {
      if (formatIndicatorKey) {
        updateIndicator(formatIndicatorKey, { format, decimals })
      }
    },
    [formatIndicatorKey, updateIndicator]
  )

  return {
    showCalcDialog,
    setShowCalcDialog,
    editingCalc,
    setEditingCalc,
    formatIndicatorKey,
    setFormatIndicatorKey,
    formatIndicator,
    calcOnSave,
    formatOnSave,
  }
}

export function PivotConfigPanel({
  tableRef,
  onViewSql,
}: PivotConfigPanelProps) {
  const { schema } = tableRef
  const { _t, lang } = useLang()
  const [indicatorSelectValue, setIndicatorSelectValue] = useState("")
  const [indicatorTitleDrafts, setIndicatorTitleDrafts] = useState<Record<string, string>>({})

  const dialogs = usePivotConfigDialogs()
  const {
    showCalcDialog,
    setShowCalcDialog,
    editingCalc,
    setEditingCalc,
    formatIndicatorKey,
    setFormatIndicatorKey,
    formatIndicator,
    calcOnSave,
    formatOnSave,
  } = dialogs

  const { rows, columns, indicators, calculatedIndicators, filters } = usePivotConfigStore(
    useShallow((s) => ({ rows: s.rows, columns: s.columns, indicators: s.indicators, calculatedIndicators: s.calculatedIndicators, filters: s.filters }))
  )
  const removeRow = usePivotConfigStore((s) => s.removeRow)
  const removeColumn = usePivotConfigStore((s) => s.removeColumn)
  const removeIndicator = usePivotConfigStore((s) => s.removeIndicator)
  const updateIndicator = usePivotConfigStore((s) => s.updateIndicator)
  const updateFilter = usePivotConfigStore((s) => s.updateFilter)
  const removeFilter = usePivotConfigStore((s) => s.removeFilter)
  const removeCalculatedIndicator = usePivotConfigStore((s) => s.removeCalculatedIndicator)

  const { entries: historyEntries, clear: clearHistory } = usePivotHistoryStore()
  const selectedDatabase = useDatasetStore((s) => s.selectedDatabase)
  const dbEntries = historyEntries.filter((e) => e.database === selectedDatabase)
  const handleHistorySelect = useCallback(
    (item: { id: string }) => {
      const entry = dbEntries.find((history) => history.id === item.id)
      if (!entry) return
      loadPivotConfig(entry.config)
      if (entry.tableName) {
        useDatasetStore.getState().selectTable(entry.tableName)
      }
    },
    [dbEntries]
  )

  const { getResolvedRole, addFieldAsFilter, addFieldAsIndicator, addRow, addColumn, executePivot, isExecuting, cancel } = usePivotOrchestrator(tableRef)

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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PivotConfigToolbar
        isExecuting={isExecuting}
        onExecute={executePivot}
        onCancel={cancel}
        onViewSql={onViewSql}
      />
      <div className="p-2 space-y-2 flex flex-col min-h-0 flex-1 overflow-auto">
        <FiltersSection
          tableRef={tableRef}
          filters={filters}
          getResolvedRole={getResolvedRole}
          updateFilter={updateFilter}
          removeFilter={removeFilter}
          addFieldAsFilter={addFieldAsFilter}
          sectionTitle={_t("pivot.filters")}
        />

        <RowsSection
          rows={rows}
          dimensionCandidates={dimensionCandidates}
          usedRowFields={usedRowFields}
          removeRow={removeRow}
          addRow={addRow}
          sectionTitle={_t("pivot.rows")}
        />

        <ColumnsSection
          columns={columns}
          dimensionCandidates={dimensionCandidates}
          usedColFields={usedColFields}
          removeColumn={removeColumn}
          addColumn={addColumn}
          sectionTitle={_t("pivot.columns")}
        />

        <IndicatorsSection
          indicators={indicators}
          indicatorCandidates={indicatorCandidates}
          indicatorSelectValue={indicatorSelectValue}
          setIndicatorSelectValue={setIndicatorSelectValue}
          indicatorTitleDrafts={indicatorTitleDrafts}
          setIndicatorTitleDrafts={setIndicatorTitleDrafts}
          commitIndicatorTitle={commitIndicatorTitle}
          setFormatIndicatorKey={setFormatIndicatorKey}
          updateIndicator={updateIndicator}
          removeIndicator={removeIndicator}
          addFieldAsIndicator={addFieldAsIndicator}
          sectionTitle={_t("pivot.indicators")}
          addIndicatorPlaceholder={`+ ${_t("pivot.add_indicator")}`}
        />

        <CalculatedSection
          calculatedIndicators={calculatedIndicators}
          setEditingCalc={setEditingCalc}
          setShowCalcDialog={setShowCalcDialog}
          removeCalculatedIndicator={removeCalculatedIndicator}
          sectionTitle={_t("pivot.calculated")}
          addCalculatedLabel={`+ ${_t("pivot.add_calculated")}`}
        />

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
              onSelect={handleHistorySelect}
            />
          </div>
        </div>
      </div>

      <PivotConfigDialogs
        showCalcDialog={showCalcDialog}
        setShowCalcDialog={setShowCalcDialog}
        editingCalc={editingCalc}
        formatIndicatorKey={formatIndicatorKey}
        setFormatIndicatorKey={setFormatIndicatorKey}
        formatIndicator={formatIndicator}
        calcOnSave={calcOnSave}
        formatOnSave={formatOnSave}
        indicators={indicators}
        calculatedIndicators={calculatedIndicators}
        tableRef={tableRef}
      />
    </div>
  )
}


