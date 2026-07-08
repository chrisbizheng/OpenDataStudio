import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"
import { useShallow } from "zustand/react/shallow"
import { useDatasetStore } from "@/stores/dataset"
import { useSqlHistoryStore } from "@/stores/sql-history"
import { resetAllPivot } from "@/stores/pivot-facade"
import { useData } from "@/components/data-provider"
import { pageData } from "@/lib/catalog"
import type { QueryLifecycleState } from "@/lib/query-lifecycle"
import type { ColumnMeta } from "@/lib/types"
import { escapeField, escapeValue } from "@/lib/sql-utils"

const EMPTY_SCHEMA: ColumnMeta[] = []

const initialState: QueryLifecycleState = {
  status: "idle",
  currentTable: null,
  currentSchema: [],
  data: null,
  error: null,
  sort: { column: null, direction: null },
  searchQuery: "",
  sql: "",
  loadedRows: 0,
  pendingAutoExecute: null,
}

/* ── 1. useSchema ── */

export function useSchema() {
  const { catalog } = useData()
  const { selectedTable, selectedDatabase } = useDatasetStore(useShallow((s) => ({
    selectedTable: s.selectedTable,
    selectedDatabase: s.selectedDatabase,
  })))

  const catalogVersion = useSyncExternalStore(
    (cb) => catalog.subscribe(cb),
    () => catalog.version,
    () => 0
  )

  const schema = useMemo(() => {
    if (!selectedDatabase || !selectedTable) return EMPTY_SCHEMA
    const page = catalog.getSchema(selectedDatabase, selectedTable)
    return pageData(page) ?? EMPTY_SCHEMA
    // catalogVersion is a signal dep: triggers recompute on catalog cache invalidation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatabase, selectedTable, catalog, catalogVersion])

  return schema
}

/* ── 2. useQueryController ── */

export function useQueryController() {
  const { queryLifecycle } = useData()
  const schema = useSchema()
  const { selectedTable, selectedDatabase } = useDatasetStore(useShallow((s) => ({
    selectedTable: s.selectedTable,
    selectedDatabase: s.selectedDatabase,
  })))
  useEffect(() => {
    queryLifecycle.setCurrentSchema(schema)
  }, [schema, queryLifecycle])

  useEffect(() => {
    if (selectedTable && selectedDatabase) {
      queryLifecycle.executeDefaultTable(selectedDatabase, selectedTable, schema)
    }
  }, [selectedTable, selectedDatabase, queryLifecycle, schema])

  useEffect(() => {
    resetAllPivot()
  }, [selectedTable, selectedDatabase])
}

/* ── 3. useQueryState ── */

export function useQueryState() {
  const { queryLifecycle } = useData()

  const state = useSyncExternalStore(
    (cb) => queryLifecycle.subscribe(cb),
    () => queryLifecycle.state,
    () => initialState
  )

  const data = useMemo(() => {
    if (!state.data) return null
    const filtered = queryLifecycle.getFilteredRows()
    return { ...state.data, rows: filtered }
  }, [state.data, state.searchQuery, queryLifecycle])

  return {
    data,
    isExecuting: state.status === "executing",
    error: state.error,
    sort: state.sort,
    searchQuery: state.searchQuery,
    sql: state.sql,
    pendingAutoExecute: state.pendingAutoExecute,
    loadedRows: state.loadedRows,
  }
}

/* ── 4. useQueryActions ── */

export function useQueryActions() {
  const { queryEngine, queryLifecycle } = useData()
  const { selectedTable, selectedDatabase } = useDatasetStore(useShallow((s) => ({
    selectedTable: s.selectedTable,
    selectedDatabase: s.selectedDatabase,
  })))
  const schema = useSchema()
  const addEntry = useSqlHistoryStore((s) => s.addEntry)

  const handleSort = useCallback(
    (column: string) => {
      if (!selectedTable || !selectedDatabase) return
      queryLifecycle.sort(column, selectedDatabase, selectedTable, schema)
    },
    [selectedTable, selectedDatabase, queryLifecycle, schema]
  )

  const handleSqlExecute = useCallback(
    async (sql: string) => {
      const start = performance.now()
      await queryLifecycle.execute(sql, selectedTable ?? "")
      const elapsed = (performance.now() - start) / 1000
      const currentData = queryLifecycle.state.data
      addEntry({
        sql,
        tableName: selectedTable,
        executionTime: elapsed,
        rowCount: currentData?.rows.length ?? 0,
      })
    },
    [selectedTable, queryLifecycle, addEntry]
  )

  const handleDrilldown = useCallback(
    async (params: {
      dimensionValues: Record<string, unknown>
      indicatorKey: string
    }) => {
      if (!selectedTable || !selectedDatabase)
        return { columns: [] as string[], rows: [] as unknown[][], isLoading: false }
      const qualified = `${escapeField(selectedDatabase)}.${escapeField(selectedTable)}`
      const conditions = Object.entries(params.dimensionValues)
        .map(([k, v]) => `${escapeField(k)} = ${escapeValue(v)}`)
        .join(" AND ")
      const sql = `SELECT * FROM ${qualified}${conditions ? ` WHERE ${conditions}` : ""} LIMIT 10000`
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

  const setSearchQuery = useCallback(
    (q: string) => queryLifecycle.setSearchQuery(q),
    [queryLifecycle]
  )

  const loadMore = useCallback(
    () => queryLifecycle.loadMore(),
    [queryLifecycle]
  )

  const cancel = useCallback(
    () => queryLifecycle.cancel(),
    [queryLifecycle]
  )

  return {
    handleSort,
    handleSqlExecute,
    handleDrilldown,
    setSearchQuery,
    loadMore,
    cancel,
    executeQuery: (sql: string, tableName: string) => queryLifecycle.execute(sql, tableName),
    setSort: (sort: { column: string | null; direction: "asc" | "desc" | null }) => queryLifecycle.setSort(sort),
    setSql: (sql: string) => queryLifecycle.setSql(sql),
    setPendingAutoExecute: (sql: string | null) => queryLifecycle.setPendingAutoExecute(sql),
  }
}


