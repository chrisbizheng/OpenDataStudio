"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
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
import { useLang } from "@/components/lang-provider"
import { useUiStore } from "@/stores/ui"
import { useDatasetStore } from "@/stores/dataset"
import { useQueryStore, getFilteredRows } from "@/stores/query"
import { useSqlHistoryStore } from "@/stores/sql-history"
import { useSavedQueriesStore } from "@/stores/saved-queries"

export default function Home() {
  const { _t } = useLang()
  const {
    sidebarOpen,
    rightPanelOpen,
    rightPanelWidth,
    activeTab,
    toggleSidebar,
    toggleRightPanel,
    setRightPanelWidth,
    setActiveTab,
  } = useUiStore()
  const { selectedTable, schema, selectedDatabase, tables, databases } = useDatasetStore()

  function formatRowCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }
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
  } = useQueryStore()
  const { addEntry } = useSqlHistoryStore()
  const [sqlText, setSqlText] = useState("")

  useEffect(() => {
    if (selectedTable && selectedDatabase) {
      const q = `${selectedDatabase}.${selectedTable}`
      executeQuery(`SELECT * FROM ${q} LIMIT 1000`, q)
    }
  }, [selectedTable, executeQuery])

  const handleSort = useCallback(
    (column: string) => {
      if (!selectedTable || !selectedDatabase) return
      const q = `${selectedDatabase}.${selectedTable}`
      const newDir =
        sort.column === column
          ? sort.direction === "asc"
            ? "desc"
            : sort.direction === "desc"
              ? null
              : "asc"
          : "asc"
      setSort({ column, direction: newDir })
      if (newDir) {
        executeQuery(
          `SELECT * FROM ${q} ORDER BY ${column} ${newDir.toUpperCase()} LIMIT 1000`,
          q
        )
      } else {
      executeQuery(`SELECT * FROM ${q} LIMIT 1000`, q)
      }
    },
    [selectedTable, selectedDatabase, sort, executeQuery, setSort]
  )

  const filteredRows = useMemo(
    () =>
      data ? getFilteredRows(data.rows, data.columns, searchQuery) : [],
    [data, searchQuery]
  )

  const handleSqlExecute = useCallback(
    async (sql: string) => {
      const start = performance.now()
      await executeQuery(sql, selectedTable ?? "")
      const elapsed = (performance.now() - start) / 1000
      addEntry({
        sql,
        tableName: selectedTable,
        executionTime: elapsed,
        rowCount: data?.rows.length ?? 0,
      })
    },
    [selectedTable, executeQuery, addEntry, data]
  )

  const handleCopyCsv = useCallback(() => {
    if (!data || !selectedTable) return
    const header = data.columns.join(",")
    const rows = data.rows
      .map((r) =>
        r
          .map((c) => {
            const s = String(c ?? "")
            return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(",")
      )
      .join("\n")
    const ts = new Date().toISOString().slice(0, 19).replace(/[:]/g, "-")
    download(`${selectedTable}_${loadedRows}rows_${ts}.csv`, `${header}\n${rows}`, "text/csv")
  }, [data, selectedTable, loadedRows])

  const handleCopyJson = useCallback(() => {
    if (!data || !selectedTable) return
    const json = JSON.stringify(
      data.rows.map((r) =>
        Object.fromEntries(data.columns.map((c, i) => [c, r[i]]))
      ),
      null,
      2
    )
    const ts = new Date().toISOString().slice(0, 19).replace(/[:]/g, "-")
    download(`${selectedTable}_${loadedRows}rows_${ts}.json`, json, "application/json")
  }, [data, selectedTable, loadedRows])

  const handleAgentSqlGenerated = useCallback(
    (sql: string) => {
      setSqlText(sql)
      setActiveTab("sql")
    },
    [setActiveTab]
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

  const rightContent = () => {
    switch (activeTab) {
      case "schema":
        if (selectedTable && schema.length > 0) {
          const tableMeta = tables.find((t) => t.name === selectedTable)
          const dbMeta = databases.find((d) => d.name === selectedDatabase)
          return (
            <div className="p-2 space-y-2">
              {dbMeta?.comment && (
                <div className="px-2 py-1.5 border-b border-border mb-1 text-[10px] text-muted-foreground/90 leading-relaxed">
                  {_t("schema.data_source")}：{dbMeta.comment}
                </div>
              )}
              {tableMeta && (
                <div className="px-2 py-1.5 border-b border-border mb-1">
                  <div className="text-xs font-semibold">{tableMeta.name}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span className="font-mono">{tableMeta.engine}</span>
                    <span>·</span>
                    <span>{formatRowCount(tableMeta.rowCount)} rows</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/90 italic mt-0.5">
                    {tableMeta.comment || "–"}
                  </div>
                </div>
              )}
              <div className="space-y-0.5">
              {schema.map((col) => (
                <div
                  key={col.name}
                  className="flex flex-col text-xs px-2 py-1.5 rounded hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{col.name}</span>
                    <span className="text-muted-foreground font-mono text-[10px] ml-auto">
                      {col.type}
                    </span>
                  </div>
                  {col.comment && (
                    <span className="text-[10px] text-muted-foreground/90 italic leading-tight mt-0.5">
                      {col.comment}
                    </span>
                  )}
                </div>
              ))}
            </div>
            </div>
          )
        }
        return (
          <p className="text-xs text-muted-foreground p-3">
            {_t("schema.select_table")}
          </p>
        )
      case "sql":
        return (
          <div className="flex flex-col h-full">
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
        )
      case "agent":
        return (
          <AgentChat
            tableName={selectedTable}
            schema={schema}
            selectedDatabase={selectedDatabase}
            onSqlGenerated={handleAgentSqlGenerated}
          />
        )
    }
  }

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
          {sidebarOpen && (
            <aside className="w-56 shrink-0 overflow-hidden">
              <Sidebar />
            </aside>
          )}

          <main className="flex-1 flex flex-col overflow-hidden">
            {selectedTable || data ? (
              <ErrorBoundary>
                <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2">
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
              <div className="flex h-full flex-col">
                <div className="flex border-b border-border shrink-0">
                  {(["schema", "sql", "agent"] as const).map((tab) => (
                    <TabButton key={tab} tab={tab} />
                  ))}
                </div>
                <div className="flex-1 overflow-auto">
                  <ErrorBoundary>{rightContent()}</ErrorBoundary>
                </div>
              </div>
            </aside>
            </>
          )}
        </div>

        <StatusBar />
      </div>
    </ErrorBoundary>
  )
}

function TabButton({ tab }: { tab: "agent" | "sql" | "schema" }) {
  const { _t } = useLang()
  const { activeTab, setActiveTab } = useUiStore()
  const labels = { agent: _t("tab.agent"), sql: _t("tab.sql"), schema: _t("tab.schema") }
  const isActive = activeTab === tab

  return (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 text-xs font-medium py-2 px-3 transition-colors ${
        isActive
          ? "text-foreground border-b-2 border-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {labels[tab]}
    </button>
  )
}

function ResizeHandle({ onResize }: { onResize: (w: number) => void }) {
  return (
    <div
      className="w-1 shrink-0 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
      onMouseDown={(e) => {
        e.preventDefault()
        const startX = e.clientX
        const aside = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement | null
        const startW = aside?.offsetWidth ?? 380
        const onMove = (ev: MouseEvent) => onResize(Math.max(200, Math.min(800, startW - (ev.clientX - startX))))
        const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp) }
        document.addEventListener("mousemove", onMove)
        document.addEventListener("mouseup", onUp)
      }}
    />
  )
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}