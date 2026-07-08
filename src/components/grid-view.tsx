"use client"

import { useCallback, useState, useEffect, startTransition } from "react"
import { useShallow } from "zustand/react/shallow"
import { DataGrid } from "@/components/data-grid"
import { SqlConsole } from "@/components/sql-console"
import { QueryPanels } from "@/components/query-panels"
import { exportData } from "@/lib/export"
import { useSavedQueriesStore } from "@/stores/saved-queries"
import { useLang } from "@/components/lang-provider"
import { useDatasetStore } from "@/stores/dataset"
import { useQueryState, useQueryActions, useSchema } from "@/hooks/use-query-orchestrator"

export function GridView() {
  const { _t } = useLang()

  const { data, isExecuting, error, sort, searchQuery, sql, pendingAutoExecute, loadedRows } = useQueryState()
  const { handleSort, setSearchQuery, loadMore, handleSqlExecute, cancel, setPendingAutoExecute } = useQueryActions()
  const schema = useSchema()
  const { selectedTable, selectedDatabase } = useDatasetStore(useShallow((s) => ({
    selectedTable: s.selectedTable,
    selectedDatabase: s.selectedDatabase,
  })))

  const [sqlText, setSqlText] = useState("")

  useEffect(() => {
    if (sql) startTransition(() => setSqlText(sql))
  }, [sql])
  useEffect(() => {
    if (pendingAutoExecute) {
      handleSqlExecute(pendingAutoExecute)
      setPendingAutoExecute(null)
    }
  }, [pendingAutoExecute, handleSqlExecute, setPendingAutoExecute])

  const handleCopyCsv = useCallback(() => {
    if (!data || !selectedTable) return
    exportData(selectedTable, loadedRows, data.columns, data.rows, "csv")
  }, [data, selectedTable, loadedRows])

  const handleCopyJson = useCallback(() => {
    if (!data || !selectedTable) return
    exportData(selectedTable, loadedRows, data.columns, data.rows, "json")
  }, [data, selectedTable, loadedRows])

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
          onExecute={handleSqlExecute}
          onCancel={cancel}
          onSave={handleSave}
          isExecuting={isExecuting}
          tableName={selectedTable}
          selectedDatabase={selectedDatabase}
          schema={schema}
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
            rows={data.rows}
            schema={schema}
            sortColumn={sort.column}
            sortDirection={sort.direction}
            onSort={handleSort}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loadedRows={loadedRows}
            onLoadMore={loadMore}
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
