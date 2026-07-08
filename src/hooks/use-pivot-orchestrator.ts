import { useMemo, useCallback } from "react"
import { useShallow } from "zustand/react/shallow"
import { usePivotConfigStore, validatePivotExecution } from "@/stores/pivot-config"
import { usePivotHistoryStore } from "@/stores/pivot-history"
import { buildPivotConfig } from "@/stores/pivot-config"
import { usePivotExecutionStore } from "@/stores/pivot-execution"
import { useFieldRoleStore } from "@/stores/field-role"
import { generatePivotSQL } from "@/lib/pivot-sql"
import { buildNextPivotIndicator } from "@/lib/pivot-client-utils"
import { resolveFieldRole, classifyColumnType } from "@/lib/column-type-classifier"
import { resolveDrop, type PivotDragItem, type PivotDropZone } from "@/lib/pivot-dnd"
import { runPivotExecution } from "@/lib/pivot-execution"
import { useData } from "@/components/data-provider"
import type { TableRef } from "@/lib/types"

export function usePivotOrchestrator(tableRef: TableRef) {
  const { schema, tableName, database } = tableRef
  const configState = usePivotConfigStore(useShallow((s) => ({
    rows: s.rows,
    columns: s.columns,
    indicators: s.indicators,
    calculatedIndicators: s.calculatedIndicators,
    filters: s.filters,
    sort: s.sort,
    totals: s.totals,
  })))
  const isExecuting = usePivotExecutionStore((s) => s.isExecuting)

  const addRow = usePivotConfigStore((s) => s.addRow)
  const addColumn = usePivotConfigStore((s) => s.addColumn)
  const addIndicator = usePivotConfigStore((s) => s.addIndicator)
  const addFilter = usePivotConfigStore((s) => s.addFilter)
  const setExecuting = usePivotExecutionStore((s) => s.setExecuting)
  const setError = usePivotExecutionStore((s) => s.setError)
  const setResultData = usePivotExecutionStore((s) => s.setResultData)
  const setLastSQL = usePivotExecutionStore((s) => s.setLastSQL)
  const roleOverrides = useFieldRoleStore((s) => s.overrides)
  const { queryEngine } = useData()
  const { addEntry } = usePivotHistoryStore()

  const pivotConfig = useMemo(() => buildPivotConfig(configState), [configState])

  const generateSQL = useCallback(() => {
    return generatePivotSQL(pivotConfig, tableName, database)
  }, [pivotConfig, tableName, database])

  const getResolvedRole = useCallback(
    (field: string) => resolveFieldRole(field, schema, roleOverrides, database, tableName),
    [schema, database, tableName, roleOverrides]
  )

  const addFieldAsFilter = useCallback(
    (field: string) => {
      const resolved = getResolvedRole(field)
      const meta = schema.find((s) => s.name === field)
      if (!resolved || !meta) return
      const isRange = resolved.role === "indicator" || classifyColumnType(meta.type) === "date"
      addFilter({
        field,
        op: isRange ? "BETWEEN" : "IN",
        value: isRange ? ["", ""] : [],
      })
    },
    [addFilter, getResolvedRole, schema]
  )

  const addFieldAsIndicator = useCallback(
    (field: string) => {
      const meta = schema.find((s) => s.name === field)
      addIndicator(buildNextPivotIndicator(field, meta?.comment || field, configState.indicators, meta?.type))
    },
    [schema, addIndicator, configState.indicators]
  )

  const resolveDragDrop = useCallback(
    (item: PivotDragItem, zone: PivotDropZone | null) => {
      const action = resolveDrop(item, zone)
      if (!action) return
      if (action.type === "add-row") addRow(action.field)
      if (action.type === "add-column") addColumn(action.field)
      if (action.type === "add-indicator") addFieldAsIndicator(action.field)
      if (action.type === "add-filter") addFieldAsFilter(action.field)
    },
    [addRow, addColumn, addFieldAsIndicator, addFieldAsFilter]
  )

  const executePivot = useCallback(async () => {
    const validationError = validatePivotExecution(configState, tableName, database)
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
  }, [configState, pivotConfig, tableName, database, queryEngine, setExecuting, setError, setResultData, setLastSQL, addEntry])

  const cancel = useCallback(() => {
    queryEngine.cancel()
  }, [queryEngine])

  return {
    pivotConfig,
    store: configState,
    addRow,
    addColumn,
    addIndicator,
    addFilter,
    generateSQL,
    getResolvedRole,
    addFieldAsFilter,
    addFieldAsIndicator,
    resolveDragDrop,
    executePivot,
    isExecuting,
    cancel,
  }
}
