"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/sidebar"
import { StatusBar } from "@/components/status-bar"
import { DataGrid } from "@/components/data-grid"
import { SqlConsole } from "@/components/sql-console"
import { QueryPanels } from "@/components/query-panels"
import { AgentChat } from "@/components/agent-chat"
import { ThemeToggle } from "@/components/theme-toggle"
import { LangToggle } from "@/components/lang-toggle"
import { SettingsDialog } from "@/components/settings-panel"
import { ErrorBoundary } from "@/components/error-boundary"
import { PivotConfigPanel } from "@/components/pivot-config"
import { PivotGrid } from "@/components/pivot-grid"
import { useLang } from "@/components/lang-provider"
import { useUiStore } from "@/stores/ui"
import { useDatasetStore } from "@/stores/dataset"
import { useQueryStore, getFilteredRows } from "@/stores/query"
import { useSqlHistoryStore } from "@/stores/sql-history"
import { useSavedQueriesStore } from "@/stores/saved-queries"
import { usePivotStore } from "@/stores/pivot"
import { generatePivotSQL } from "@/lib/pivot-sql"
import type { PivotConfig } from "@/lib/pivot-sql"
import { executeQuery as apiQuery } from "@/lib/api-client"
import { exportData } from "@/lib/export"
import { buildSelectSql, buildDrilldownSql, buildSortDirection } from "@/lib/query-builder"
import { ResizeHandle } from "@/components/resize-handle"

export default function Home() {
  const { _t } = useLang()
  const {
    sidebarOpen,
    rightPanelOpen,
    rightPanelWidth,
    pivotView,
    toggleSidebar,
    toggleRightPanel,
    setRightPanelWidth,
    setPivotView,
  } = useUiStore(useShallow((s) => ({
    sidebarOpen: s.sidebarOpen,
    rightPanelOpen: s.rightPanelOpen,
    rightPanelWidth: s.rightPanelWidth,
    pivotView: s.pivotView,
    toggleSidebar: s.toggleSidebar,
    toggleRightPanel: s.toggleRightPanel,
    setRightPanelWidth: s.setRightPanelWidth,
    setPivotView: s.setPivotView,
  })))
  const { selectedTable, schema, selectedDatabase } = useDatasetStore(useShallow((s) => ({
    selectedTable: s.selectedTable,
    schema: s.schema,
    selectedDatabase: s.selectedDatabase,
  })))

  const {
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
  } = useQueryStore(useShallow((s) => ({
    data: s.data,
    isExecuting: s.isExecuting,
    error: s.error,
    sort: s.sort,
    searchQuery: s.searchQuery,
    loadedRows: s.loadedRows,
    executeQuery: s.executeQuery,
    setSort: s.setSort,
    setSearchQuery: s.setSearchQuery,
    loadMore: s.loadMore,
  })))
  const addEntry = useSqlHistoryStore((s) => s.addEntry)
  const { resolved } = useTheme()
  const [sqlText, setSqlText] = useState("")
  const [showSqlPreview, setShowSqlPreview] = useState(false)
  const [previewSql, setPreviewSql] = useState("")
  const [drilldownData, setDrilldownData] = useState<{
    columns: string[]
    rows: unknown[][]
    isLoading: boolean
  } | null>(null)

  const pivotStore = usePivotStore(useShallow((s) => ({
    rows: s.rows,
    columns: s.columns,
    indicators: s.indicators,
    calculatedIndicators: s.calculatedIndicators,
    filters: s.filters,
    sort: s.sort,
    totals: s.totals,
    resultData: s.resultData,
    error: s.error,
    reset: s.reset,
  })))

  const pivotConfigKey = JSON.stringify({
    r: pivotStore.rows,
    c: pivotStore.columns,
    i: pivotStore.indicators,
    ci: pivotStore.calculatedIndicators,
    f: pivotStore.filters,
    s: pivotStore.sort,
    t: pivotStore.totals,
  })

  const pivotConfig = useMemo(() => ({
    rows: pivotStore.rows,
    columns: pivotStore.columns,
    indicators: pivotStore.indicators,
    calculatedIndicators: pivotStore.calculatedIndicators,
    filters: pivotStore.filters,
    sort: pivotStore.sort ?? undefined,
    totals: pivotStore.totals,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pivotConfigKey])

  useEffect(() => {
    if (selectedTable && selectedDatabase) {
      executeQuery(buildSelectSql(selectedDatabase, selectedTable), `${selectedDatabase}.${selectedTable}`)
    }
    pivotStore.reset()
    setDrilldownData(null)
  }, [selectedTable, selectedDatabase, executeQuery])

  const handleSort = useCallback(
    (column: string) => {
      if (!selectedTable || !selectedDatabase) return
      const newDir = buildSortDirection(sort.column, sort.direction, column)
      setSort({ column, direction: newDir })
      if (newDir) {
        executeQuery(
          buildSelectSql(selectedDatabase, selectedTable, { orderBy: column, direction: newDir.toUpperCase() as "ASC" | "DESC" }),
          `${selectedDatabase}.${selectedTable}`
        )
      } else {
        executeQuery(
          buildSelectSql(selectedDatabase, selectedTable),
          `${selectedDatabase}.${selectedTable}`
        )
      }
    },
    [selectedTable, selectedDatabase, sort, executeQuery, setSort]
  )

  const filteredRows = useMemo(
    () =>
      data ? getFilteredRows(data.rows, searchQuery) : [],
    [data, searchQuery]
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

  const handleCopyCsv = useCallback(() => {
    if (!data || !selectedTable) return
    exportData(selectedTable, loadedRows, data.columns, data.rows, "csv")
  }, [data, selectedTable, loadedRows])

  const handleCopyJson = useCallback(() => {
    if (!data || !selectedTable) return
    exportData(selectedTable, loadedRows, data.columns, data.rows, "json")
  }, [data, selectedTable, loadedRows])

  const handleAgentSqlGenerated = useCallback(
    (sql: string) => {
      setSqlText(sql)
      setPivotView("grid")
    },
    [setPivotView]
  )

  const addSavedQuery = useSavedQueriesStore((s) => s.add)

  const handleSave = useCallback(
    (sql: string) => {
      const name = prompt(_t("save_query.prompt"))
      if (name && name.trim()) {
        addSavedQuery(name.trim(), sql)
      }
    },
    [addSavedQuery]
  )

  const handleSelectSavedSql = useCallback(
    (sql: string) => {
      setSqlText(sql)
    },
    []
  )

  const handlePivotExecute = useCallback(() => {
    // Pivot store handles the execution internally
  }, [])

  const handleViewSql = useCallback(() => {
    const state = usePivotStore.getState()
    if (!selectedTable || !selectedDatabase) return
    const config: PivotConfig = {
      rows: state.rows,
      columns: state.columns,
      indicators: state.indicators,
      calculatedIndicators: state.calculatedIndicators,
      filters: state.filters,
      sort: state.sort ?? undefined,
      totals: state.totals,
    }
    const sql = generatePivotSQL(config, selectedTable, selectedDatabase)
    setPreviewSql(sql)
    setShowSqlPreview(true)
  }, [selectedTable, selectedDatabase])

  const handleDrilldown = useCallback(
    async (params: { dimensionValues: Record<string, unknown>; indicatorKey: string }) => {
      if (!selectedTable || !selectedDatabase) return
      setDrilldownData({ columns: [], rows: [], isLoading: true })
      const sql = buildDrilldownSql(selectedDatabase, selectedTable, params.dimensionValues)
      try {
        const json = await apiQuery(sql, selectedDatabase)
        setDrilldownData({ columns: json.columns, rows: json.rows, isLoading: false })
      } catch {
        setDrilldownData({ columns: [], rows: [], isLoading: false })
      }
    },
    [selectedTable, selectedDatabase]
  )

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col bg-background">
        <header className="flex items-center justify-between px-3 h-10 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <span className="text-sm font-semibold">Open Data Studio</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LangToggle />
            <SettingsDialog />
            <button
              onClick={toggleRightPanel}
              className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside
            className={cn(
              "shrink-0 overflow-hidden",
              sidebarOpen ? "w-56" : "w-0"
            )}
          >
            <Sidebar />
          </aside>

          <main className="flex-1 flex flex-col overflow-hidden">
            {selectedTable || data ? (
              <ErrorBoundary>
                <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2">
                  {/* Grid / Pivot tab bar */}
                  <div className="flex items-center gap-1 shrink-0 border-b border-border">
                    <button
                      onClick={() => setPivotView("grid")}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        pivotView === "grid"
                          ? "text-foreground border-b-2 border-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {_t("tab.grid")}
                    </button>
                    <button
                      onClick={() => setPivotView("pivot")}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        pivotView === "pivot"
                          ? "text-foreground border-b-2 border-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {_t("tab.pivot")}
                    </button>
                  </div>

                  {pivotView === "grid" ? (
                    /* Grid View — SQL panel (left) + DataGrid (right) */
                    <div className="flex-1 flex gap-2 overflow-hidden">
                      <div className="w-80 shrink-0 border border-border rounded-md overflow-hidden flex flex-col">
                        <SqlConsole
                          sql={sqlText}
                          onSqlChange={setSqlText}
                          onExecute={handleSqlExecute}
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
                  ) : (
                    /* Pivot View */
                    <div className="flex-1 flex gap-2 overflow-hidden">
                      {/* Pivot Config */}
                      <div className="w-64 shrink-0 border border-border rounded-md overflow-hidden">
                        <PivotConfigPanel
                          schema={schema}
                          tableName={selectedTable ?? ""}
                          database={selectedDatabase ?? ""}
                          onExecute={handlePivotExecute}
                          onViewSql={handleViewSql}
                        />
                      </div>
                      {/* Pivot Grid */}
                      <div className="flex-1 flex flex-col overflow-hidden">
                        {pivotStore.error && (
                          <div className="text-xs text-destructive p-1.5 bg-destructive/10 rounded mb-1 shrink-0">
                            {pivotStore.error}
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                          {selectedTable && selectedDatabase ? (
                            <PivotGrid
                              key={resolved}
                              config={pivotConfig}
                              data={pivotStore.resultData ?? { columns: [], rows: [] }}
                              schema={schema}
                              onCellClick={handleDrilldown}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                              请先选择表
                            </div>
                          )}
                        </div>
                        {/* Drill-down drawer */}
                        {drilldownData && (
                          <div className="shrink-0 max-h-[40%] border-t border-border mt-1 pt-1 overflow-hidden flex flex-col">
                            <div className="flex items-center gap-2 mb-1 shrink-0">
                              <span className="text-xs font-semibold">{_t("pivot.drilldown")}</span>
                              {!drilldownData.isLoading && (
                                <span className="text-[10px] text-muted-foreground">
                                  {drilldownData.rows.length} 行
                                </span>
                              )}
                              <div className="flex-1" />
                              <button
                                onClick={() => setDrilldownData(null)}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                ×
                              </button>
                            </div>
                            {drilldownData.isLoading ? (
                              <div className="flex items-center justify-center py-4">
                                <span className="inline-block w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                              </div>
                            ) : (
                              <div className="flex-1 overflow-auto">
                                <DataGrid
                                  columns={drilldownData.columns}
                                  rows={drilldownData.rows}
                                  schema={schema}
                                  selectedTable={selectedTable ?? ""}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ErrorBoundary>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-lg font-medium text-muted-foreground mb-1">
                    Open Data Studio
                  </h2>
                  <p className="text-sm text-muted-foreground/60">
                    {_t("main.select_table")}
                  </p>
                </div>
              </div>
            )}
          </main>

          {rightPanelOpen && (
            <>
            <ResizeHandle onResize={(w) => setRightPanelWidth(Math.max(200, Math.min(800, w)))} />
            <aside
              className="shrink-0 border-l border-border overflow-hidden"
              style={{ width: rightPanelWidth }}
            >
              <div className="h-full overflow-auto">
                <AgentChat
                  tableName={selectedTable}
                  schema={schema}
                  selectedDatabase={selectedDatabase}
                  onSqlGenerated={handleAgentSqlGenerated}
                />
              </div>
            </aside>
            </>
          )}
        </div>

        <StatusBar />
      </div>

      {/* SQL Preview Dialog */}
      {showSqlPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-lg w-[600px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <span className="text-sm font-semibold">{_t("pivot.view_sql")}</span>
              <button
                onClick={() => setShowSqlPreview(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap text-foreground bg-muted/50 p-3 rounded">
                {previewSql}
              </pre>
            </div>
            <div className="flex justify-end gap-2 px-4 py-2 border-t border-border">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewSql)
                }}
                className="px-3 py-1 text-xs bg-muted rounded hover:bg-muted/80"
              >
                {_t("pivot.copy_sql")}
              </button>
              <button
                onClick={() => setShowSqlPreview(false)}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                {_t("pivot.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  )
}