"use client"

import { useCallback } from "react"
import { useShallow } from "zustand/react/shallow"
import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/sidebar"
import { StatusBar } from "@/components/status-bar"
import { GridView } from "@/components/grid-view"
import { PivotView } from "@/components/pivot-view"
import { DashboardCanvas } from "@/components/dashboard-canvas"
import { ExplorePanel } from "@/components/explore-panel"
import { AgentChat } from "@/components/agent-chat"
import { ThemeToggle } from "@/components/theme-toggle"
import { LangToggle } from "@/components/lang-toggle"
import { SettingsDialog } from "@/components/settings-panel"
import { ErrorBoundary } from "@/components/error-boundary"
import { DataProvider } from "@/components/data-provider"
import { useLang } from "@/components/lang-provider"
import { Database } from "lucide-react"
import { useUiStore } from "@/stores/ui"
import { ResizeHandle } from "@/components/resize-handle"
import { useQueryController, useQueryState, useSchema, useQueryActions } from "@/hooks/use-query-orchestrator"
import { useDatasetStore } from "@/stores/dataset"

export default function Home() {
  return (
    <ErrorBoundary>
      <DataProvider>
        <HomeContent />
      </DataProvider>
    </ErrorBoundary>
  )
}

function HomeContent() {
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

  useQueryController()
  const { data } = useQueryState()
  const schema = useSchema()
  const { handleDrilldown } = useQueryActions()
  const { selectedTable, selectedDatabase } = useDatasetStore(useShallow((s) => ({
    selectedTable: s.selectedTable,
    selectedDatabase: s.selectedDatabase,
  })))

  const handleAgentSqlGenerated = useCallback(
    (sql: string) => {
      setPivotView("grid")
    },
    [setPivotView]
  )

  const hasContent = selectedTable || data

  return (
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
            <ErrorBoundary>
              <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2">
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
                  <button
                    onClick={() => setPivotView("dashboard")}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      pivotView === "dashboard"
                        ? "text-foreground border-b-2 border-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {_t("tab.dashboard")}
                  </button>
                  <button
                    onClick={() => setPivotView("explore")}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      pivotView === "explore"
                        ? "text-foreground border-b-2 border-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {_t("tab.explore")}
                  </button>
                </div>

                {pivotView === "dashboard" ? (
                  <DashboardCanvas />
                ) : pivotView === "explore" ? (
                  <ExplorePanel />
                ) : hasContent ? (
                  pivotView === "grid" ? (
                    <GridView />
                  ) : selectedTable && selectedDatabase ? (
                    <PivotView
                      tableRef={{ schema, tableName: selectedTable, database: selectedDatabase }}
                      onDrilldown={handleDrilldown}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                      {_t("grid.select_table_first")}
                    </div>
                  )
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Database className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                      <h2 className="text-lg font-medium text-muted-foreground mb-1">
                        Open Data Studio
                      </h2>
                      <p className="text-sm text-muted-foreground/60">
                        {_t("main.select_table")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {_t("main.select_hint")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ErrorBoundary>
          </main>

          {rightPanelOpen && <ResizeHandle onResize={(w) => setRightPanelWidth(Math.max(200, Math.min(800, w)))} />}
          <aside
            className="shrink-0 border-l border-border overflow-hidden transition-all duration-300 ease-in-out"
            style={{ width: rightPanelOpen ? rightPanelWidth : 0 }}
          >
            <div className="h-full overflow-auto" style={{ width: rightPanelWidth }}>
              <AgentChat
                tableName={selectedTable}
                schema={schema}
                selectedDatabase={selectedDatabase}
                onSqlGenerated={handleAgentSqlGenerated}
              />
            </div>
          </aside>
        </div>

        <StatusBar />
      </div>
  )
}
