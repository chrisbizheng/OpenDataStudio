"use client"

import { useCallback, useDeferredValue, useState, useMemo, useEffect, startTransition } from "react"
import { DataGrid } from "@/components/data-grid"
import { SqlConsole } from "@/components/sql-console"
import { QueryPanels } from "@/components/query-panels"
import { createGridFilter } from "@/lib/grid-filter"
import { exportData } from "@/lib/export"
import { useSavedQueriesStore } from "@/stores/saved-queries"
import { useQueryStore } from "@/stores/query"
import { useLang } from "@/components/lang-provider"
import type { ColumnMeta } from "@/lib/types"
import type { TableData } from "@/stores/query"

interface GridViewProps {
  data: TableData | null
  isExecuting: boolean
  error: string | null
  schema: ColumnMeta[]
  selectedTable: string | null
  selectedDatabase: string | null
  sort: { column: string | null; direction: "asc" | "desc" | null }
  searchQuery: string
  loadedRows: number
  onSort: (column: string) => void
  onSearchChange: (query: string) => void
  onLoadMore: () => void
  onExecuteSql: (sql: string) => void
  onSqlGenerated: (sql: string) => void
}

export function GridView({
  data,
  isExecuting,
  error,
  schema,
  selectedTable,
  selectedDatabase,
  sort,
  searchQuery,
  loadedRows,
  onSort,
  onSearchChange,
  onLoadMore,
  onExecuteSql,
  onSqlGenerated,
}: GridViewProps) {
  const { _t } = useLang()
  const [sqlText, setSqlText] = useState("")

  const storeSql = useQueryStore((s) => s.sql)
  const pendingAutoExecute = useQueryStore((s) => s.pendingAutoExecute)
  const setPendingAutoExecute = useQueryStore((s) => s.setPendingAutoExecute)
  useEffect(() => {
    if (storeSql) startTransition(() => setSqlText(storeSql))
  }, [storeSql])
  useEffect(() => {
    if (pendingAutoExecute) {
      onExecuteSql(pendingAutoExecute)
      setPendingAutoExecute(null)
    }
  }, [pendingAutoExecute, onExecuteSql, setPendingAutoExecute])

  const deferredSearch = useDeferredValue(searchQuery)
  const gridFilter = useMemo(() => createGridFilter(), [])
  const filteredRows = useMemo(
    () => data ? gridFilter(data.rows, deferredSearch) : [],
    [data, deferredSearch, gridFilter]
  )

  const handleCopyCsv = useCallback(() => {
    if (!data || !selectedTable) return
    exportData(selectedTable, loadedRows, data.columns, data.rows, "csv")
  }, [data, selectedTable, loadedRows])

  const handleCopyJson = useCallback(() => {
    if (!data || !selectedTable) return
    exportData(selectedTable, loadedRows, data.columns, data.rows, "json")
  }, [data, selectedTable, loadedRows])

  const handleSqlGenerated = useCallback(
    (sql: string) => {
      setSqlText(sql)
      onSqlGenerated(sql)
    },
    [onSqlGenerated]
  )

  const addSavedQuery = useSavedQueriesStore((s) => s.add)

  const handleSave = useCallback(
    (sql: string) => {
      const name = prompt(_t("save_query.prompt"))
      if (name && name.trim()) {
        addSavedQuery(name.trim(), sql)
      }
    },
    [addSavedQuery, _t]
  )

  const handleSelectSavedSql = useCallback(
    (sql: string) => {
      setSqlText(sql)
    },
    []
  )

  return (
    <div className="flex-1 flex gap-2 overflow-hidden">
      <div className="w-80 shrink-0 border border-border rounded-md overflow-hidden flex flex-col">
        <SqlConsole
          sql={sqlText}
          onSqlChange={setSqlText}
          onExecute={onExecuteSql}
          onSave={handleSave}
          isExecuting={isExecuting}
          tableName={selectedTable}
          selectedDatabase={selectedDatabase}
        />
        <div className="shrink-0">
          <QueryPanels onSelectSql={handleSelectSavedSql} />
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        ) : data ? (
          <DataGrid
            columns={data.columns}
            rows={filteredRows}
            schema={schema}
            selectedTable={selectedTable ?? ""}
            sortColumn={sort.column}
            sortDirection={sort.direction}
            onSort={onSort}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            loadedRows={loadedRows}
            onLoadMore={onLoadMore}
            isLoading={isExecuting}
            onDownloadCsv={handleCopyCsv}
            onDownloadJson={handleCopyJson}
          />
        ) : isExecuting ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              {_t("main.loading")} {selectedTable}...
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
