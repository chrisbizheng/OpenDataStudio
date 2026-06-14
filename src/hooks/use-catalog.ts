"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useDatasetStore } from "@/stores/dataset"
import { useData } from "@/components/data-provider"
import type { DatabaseInfo } from "@/lib/catalog"
import type { TableMeta, ColumnMeta } from "@/lib/types"

export interface CatalogState {
  databases: DatabaseInfo[]
  tables: TableMeta[]
  schema: ColumnMeta[]
  selectedDatabase: string
  selectedTable: string | null
  isConnected: boolean
  isLoading: boolean
  error: string | null

  selectDatabase: (db: string) => void
  selectTable: (name: string | null) => void
  refreshDatabases: () => void
}

interface FetchState {
  databases: DatabaseInfo[]
  tables: TableMeta[]
  schema: ColumnMeta[]
  isConnected: boolean
  isLoading: boolean
  error: string | null
}

const emptyFetch: FetchState = { databases: [], tables: [], schema: [], isConnected: false, isLoading: false, error: null }

export function useCatalog(): CatalogState {
  const { selectedDatabase, selectedTable, selectDatabase: storeSelectDb, selectTable: storeSelectTable } = useDatasetStore()
  const { catalog } = useData()

  const [fetchState, setFetchState] = useState<FetchState>(emptyFetch)
  const [refreshKey, setRefreshKey] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    catalog.loadDatabases()
      .then((data) => {
        if (mountedRef.current) setFetchState((s) => ({ ...s, databases: data }))
      })
      .catch(() => {
        const page = catalog.databases
        if (mountedRef.current) setFetchState((s) => ({ ...s, databases: page.status === "ok" ? page.data : [] }))
      })
  }, [refreshKey, catalog])

  useEffect(() => {
    if (!selectedDatabase) return

    catalog.loadTables(selectedDatabase)
      .then((data) => {
        if (mountedRef.current) setFetchState((s) => ({ ...s, tables: data, isConnected: true, isLoading: false, error: null }))
      })
      .catch((err) => {
        const page = catalog.getTables(selectedDatabase)
        const stale = page.status === "loading" ? page.stale : page.status === "ok" ? page.data : []
        if (mountedRef.current) setFetchState((s) => ({
          ...s,
          tables: stale ?? [],
          isConnected: false,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to connect to ClickHouse",
        }))
      })
  }, [selectedDatabase, catalog, refreshKey])

  useEffect(() => {
    if (!selectedDatabase || !selectedTable) return

    catalog.loadSchema(selectedDatabase, selectedTable)
      .then((data) => {
        if (mountedRef.current) setFetchState((s) => ({ ...s, schema: data }))
      })
      .catch(() => {
        const page = catalog.getSchema(selectedDatabase, selectedTable)
        const stale = page.status === "loading" ? page.stale : page.status === "ok" ? page.data : []
        if (mountedRef.current) setFetchState((s) => ({ ...s, schema: stale ?? [] }))
      })
  }, [selectedDatabase, selectedTable, catalog, refreshKey])

  const derived: FetchState = useMemo(() => {
    if (!selectedDatabase) {
      return { ...fetchState, tables: [], isConnected: false, isLoading: false, error: null }
    }
    if (!selectedDatabase || !selectedTable) {
      return { ...fetchState, schema: [] }
    }
    return fetchState
  }, [fetchState, selectedDatabase, selectedTable])

  const selectDatabase = useCallback((db: string) => {
    storeSelectDb(db)
    catalog.loadTables(db).catch(() => {})
  }, [storeSelectDb, catalog])

  const selectTable = useCallback((name: string | null) => {
    storeSelectTable(name)
    if (name && selectedDatabase) {
      catalog.loadSchema(selectedDatabase, name).catch(() => {})
    }
  }, [storeSelectTable, catalog, selectedDatabase])

  const refreshDatabases = useCallback(() => {
    catalog.invalidate({ kind: "all" })
    setRefreshKey((k) => k + 1)
  }, [catalog])

  return {
    ...derived,
    selectedDatabase,
    selectedTable,
    selectDatabase,
    selectTable,
    refreshDatabases,
  }
}

export function pageData<T>(page: { status: string; data?: T; stale?: T }): T | undefined {
  if (page.status === "ok") return page.data
  if (page.status === "loading" || page.status === "error") return page.stale
  return undefined
}
