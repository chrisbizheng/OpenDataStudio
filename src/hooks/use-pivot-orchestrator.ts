import { useMemo, useCallback } from "react"
import { useShallow } from "zustand/react/shallow"
import { usePivotStore } from "@/stores/pivot"
import { buildPivotConfig } from "@/stores/pivot"
import { useFieldRoleStore } from "@/stores/field-role"
import { generatePivotSQL } from "@/lib/pivot-sql"
import { buildNextPivotIndicator } from "@/lib/pivot-client-utils"
import { resolveFieldRole } from "@/lib/column-type-classifier"
import { resolveDrop, type PivotDragItem, type PivotDropZone } from "@/lib/pivot-dnd"
import type { ColumnMeta } from "@/lib/types"

export function usePivotOrchestrator(schema: ColumnMeta[], tableName: string, database: string) {
  const store = usePivotStore(useShallow((s) => ({
    rows: s.rows,
    columns: s.columns,
    indicators: s.indicators,
    calculatedIndicators: s.calculatedIndicators,
    filters: s.filters,
    sort: s.sort,
    totals: s.totals,
  })))

  const addRow = usePivotStore((s) => s.addRow)
  const addColumn = usePivotStore((s) => s.addColumn)
  const addIndicator = usePivotStore((s) => s.addIndicator)
  const addFilter = usePivotStore((s) => s.addFilter)
  const roleOverrides = useFieldRoleStore((s) => s.overrides)

  const pivotConfig = useMemo(() => buildPivotConfig(store), [store])

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
      const isRange = resolved.role === "indicator" || /^Date/.test(meta.type.replace(/^Nullable\((.+)\)$/, "$1"))
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
      const indicators = usePivotStore.getState().indicators
      addIndicator(buildNextPivotIndicator(field, meta?.comment || field, indicators, meta?.type))
    },
    [schema, addIndicator]
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

  return {
    pivotConfig,
    store,
    addRow,
    addColumn,
    addIndicator,
    addFilter,
    generateSQL,
    getResolvedRole,
    addFieldAsFilter,
    addFieldAsIndicator,
    resolveDragDrop,
  }
}
