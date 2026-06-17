"use client"

import { useState, useEffect, useCallback } from "react"
import { useSyncExternalStore } from "react"
import { useDatasetStore } from "@/stores/dataset"
import { useData } from "@/components/data-provider"
import { pageData, type DatabaseInfo } from "@/lib/catalog"
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

export function useCatalog(): CatalogState {
  const { selectedDatabase, selectedTable, selectDatabase: storeSelectDb, selectTable: storeSelectTable } = useDatasetStore()
  const { catalog } = useData()
  const [refreshKey, setRefreshKey] = useState(0)

  useSyncExternalStore(
    (cb) => catalog.subscribe(cb),
    () => catalog.version,
    () => 0
  )

  useEffect(() => {
    catalog.loadDatabases().catch(() => {})
  }, [refreshKey, catalog])

  useEffect(() => {
    if (!selectedDatabase) return
    catalog.loadTables(selectedDatabase).catch(() => {})
  }, [selectedDatabase, catalog, refreshKey])

  useEffect(() => {
    if (!selectedDatabase || !selectedTable) return
    catalog.loadSchema(selectedDatabase, selectedTable).catch(() => {})
  }, [selectedDatabase, selectedTable, catalog, refreshKey])

  const dbPage = catalog.databases
  const tablesPage = selectedDatabase ? catalog.getTables(selectedDatabase) : { status: "idle" as const }
  const schemaPage = selectedDatabase && selectedTable ? catalog.getSchema(selectedDatabase, selectedTable) : { status: "idle" as const }

  const databases = pageData(dbPage) ?? []
  const tables = selectedDatabase ? (pageData(tablesPage) ?? []) : []
  const schema = selectedDatabase && selectedTable ? (pageData(schemaPage) ?? []) : []

  const isLoading =
    dbPage.status === "loading" ||
    (!!selectedDatabase && tablesPage.status === "loading") ||
    (!!selectedDatabase && !!selectedTable && schemaPage.status === "loading")

  const error =
    dbPage.status === "error" ? dbPage.error.message
    : tablesPage.status === "error" ? tablesPage.error.message
    : schemaPage.status === "error" ? schemaPage.error.message
    : null

  const isConnected = tablesPage.status === "ok"

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
    databases,
    tables,
    schema,
    selectedDatabase,
    selectedTable,
    isConnected,
    isLoading,
    error,
    selectDatabase,
    selectTable,
    refreshDatabases,
  }
}
