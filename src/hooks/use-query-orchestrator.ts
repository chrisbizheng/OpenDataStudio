import { useCallback, useEffect } from "react"
import { useShallow } from "zustand/react/shallow"
import { useQueryStore } from "@/stores/query"
import { useDatasetStore } from "@/stores/dataset"
import { useSqlHistoryStore } from "@/stores/sql-history"
import { usePivotStore } from "@/stores/pivot"
import { inferStableOrder } from "@/lib/stable-result-order"
import { buildSelectSql, buildDrilldownSql, buildSortDirection } from "@/lib/query-builder"
import { useData } from "@/components/data-provider"
import { pageData } from "@/hooks/use-catalog"
import type { ColumnMeta } from "@/lib/types"

export function useQueryOrchestrator() {
  const { catalog, queryEngine } = useData()

  const { selectedTable, selectedDatabase } = useDatasetStore(useShallow((s) => ({
    selectedTable: s.selectedTable,
    selectedDatabase: s.selectedDatabase,
  })))

  const schema: ColumnMeta[] = (() => {
    if (!selectedDatabase || !selectedTable) return []
    const page = catalog.getSchema(selectedDatabase, selectedTable)
    return pageData(page) ?? []
  })()

  const {
    data,
    isExecuting,
    error,
    sort,
    searchQuery,
    loadedRows,
    setCurrentTable,
    setCurrentSchema,
    setData,
    setExecuting,
    setError,
    setSort,
    setSearchQuery,
    setLoadedRows,
  } = useQueryStore(useShallow((s) => ({
    data: s.data,
    isExecuting: s.isExecuting,
    error: s.error,
    sort: s.sort,
    searchQuery: s.searchQuery,
    loadedRows: s.loadedRows,
    setCurrentTable: s.setCurrentTable,
    setCurrentSchema: s.setCurrentSchema,
    setData: s.setData,
    setExecuting: s.setExecuting,
    setError: s.setError,
    setSort: s.setSort,
    setSearchQuery: s.setSearchQuery,
    setLoadedRows: s.setLoadedRows,
  })))

  const addEntry = useSqlHistoryStore((s) => s.addEntry)
  const resetPivot = usePivotStore((s) => s.reset)

  const executeQuery = useCallback(async (
    sql: string,
    tableName: string,
    append = false
  ) => {
    if (!append) {
      setExecuting(true)
      setError(null)
      setCurrentTable(tableName)
    } else {
      setExecuting(true)
      setError(null)
    }

    try {
      const json = await queryEngine.execute(sql, undefined)
      if (!json) return

      if (append && useQueryStore.getState().data) {
        const state = useQueryStore.getState()
        const merged = [...(state.data?.rows ?? []), ...json.rows]
        setData({ ...state.data!, rows: merged })
        setLoadedRows(merged.length)
        setExecuting(false)
      } else {
        setData(json)
        setLoadedRows(json.rows.length)
        setExecuting(false)
        setError(null)
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      setError(e instanceof Error ? e.message : "Network error")
      setExecuting(false)
    }
  }, [queryEngine, setCurrentTable, setExecuting, setError, setData, setLoadedRows])

  const loadMore = useCallback(async () => {
    const { currentTable, currentSchema } = useQueryStore.getState()
    if (!currentTable) return
    const db = currentTable.split(".")[0] || ""
    const table = currentTable.split(".")[1] || currentTable
    inferStableOrder(currentSchema)
    const sql = buildSelectSql(db, table, undefined)
    await executeQuery(sql, currentTable, true)
  }, [executeQuery])

  const buildDefaultTableSql = useCallback(() => {
    if (!selectedDatabase || !selectedTable) return ""
    const stableOrder = inferStableOrder(schema)
    return buildSelectSql(
      selectedDatabase,
      selectedTable,
      stableOrder
        ? { orderBy: stableOrder.field, direction: stableOrder.direction }
        : undefined
    )
  }, [schema, selectedDatabase, selectedTable])

  useEffect(() => {
    setCurrentSchema(schema)
  }, [schema, setCurrentSchema])

  useEffect(() => {
    if (selectedTable && selectedDatabase) {
      executeQuery(buildDefaultTableSql(), `${selectedDatabase}.${selectedTable}`)
    }
    resetPivot()
  }, [selectedTable, selectedDatabase, executeQuery, resetPivot, buildDefaultTableSql])

  const handleSort = useCallback(
    (column: string) => {
      if (!selectedTable || !selectedDatabase) return
      const newDir = buildSortDirection(sort.column, sort.direction, column)
      setSort({ column, direction: newDir })
      if (newDir) {
        executeQuery(
          buildSelectSql(selectedDatabase, selectedTable, {
            orderBy: column,
            direction: newDir.toUpperCase() as "ASC" | "DESC",
          }),
          `${selectedDatabase}.${selectedTable}`
        )
      } else {
        executeQuery(
          buildDefaultTableSql(),
          `${selectedDatabase}.${selectedTable}`
        )
      }
    },
    [selectedTable, selectedDatabase, sort, executeQuery, setSort, buildDefaultTableSql]
  )

  const handleSqlExecute = useCallback(
    async (sql: string) => {
      const start = performance.now()
      await executeQuery(sql, selectedTable ?? "")
      const elapsed = (performance.now() - start) / 1000
      const currentData = useQueryStore.getState().data
      addEntry({
        sql,
        tableName: selectedTable,
        executionTime: elapsed,
        rowCount: currentData?.rows.length ?? 0,
      })
    },
    [selectedTable, executeQuery, addEntry]
  )

  const handleDrilldown = useCallback(
    async (params: {
      dimensionValues: Record<string, unknown>
      indicatorKey: string
    }) => {
      if (!selectedTable || !selectedDatabase)
        return { columns: [] as string[], rows: [] as unknown[][], isLoading: false }
      const sql = buildDrilldownSql(
        selectedDatabase,
        selectedTable,
        params.dimensionValues
      )
      try {
        const json = await queryEngine.execute(sql, selectedDatabase)
        if (!json) return { columns: [] as string[], rows: [] as unknown[][], isLoading: false }
        return { columns: json.columns, rows: json.rows, isLoading: false }
      } catch {
        return { columns: [] as string[], rows: [] as unknown[][], isLoading: false }
      }
    },
    [selectedTable, selectedDatabase, queryEngine]
  )

  return {
    selectedTable,
    schema,
    selectedDatabase,
    data,
    isExecuting,
    error,
    sort,
    searchQuery,
    loadedRows,
    executeQuery,
    setSort,
    setSearchQuery,
    loadMore,
    handleSort,
    handleSqlExecute,
    handleDrilldown,
  }
}
