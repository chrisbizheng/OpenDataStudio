"use client"

import { useCallback, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { LayoutDashboard, PlusCircle } from "lucide-react"
import { useDashboardsStore } from "@/stores/dashboards"
import { useDatasetStore } from "@/stores/dataset"
import { WidgetConfigEditor } from "@/components/widget-config-editor"
import { ExploreWidgetEditor } from "@/components/explore-widget-editor"
import { useLang } from "@/components/lang-provider"
import { useQueryActions } from "@/hooks/use-query-orchestrator"
import { useUiStore } from "@/stores/ui"
import { Button } from "@/components/ui/button"
import type { ChartWidget, WidgetLayout } from "@/stores/dashboards"
import { CreateWidgetSqlDialog } from "@/components/create-widget-sql-dialog"
import { CreateWidgetAiDialog } from "@/components/create-widget-ai-dialog"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardList } from "@/components/dashboard-list"

export function DashboardCanvas() {
  const { _t } = useLang()

  // Narrow selectors: re-render only when active dashboard or hasDashboards flag changes
  const activeDashboard = useDashboardsStore(
    useShallow((s) => s.dashboards.find((d) => d.id === s.activeDashboardId) ?? null)
  )
  const activeDashboardId = activeDashboard?.id ?? null
  const hasDashboards = useDashboardsStore((s) => s.dashboards.length > 0)

  const { updateLayout, saveDashboard, publishDashboard, unpublishDashboard, updateWidget, addFilter, removeFilter, clearFilters, createDashboard, setActiveDashboard } =
    useDashboardsStore(
      useShallow((s) => ({
        updateLayout: s.updateLayout,
        saveDashboard: s.saveDashboard,
        publishDashboard: s.publishDashboard,
        unpublishDashboard: s.unpublishDashboard,
        updateWidget: s.updateWidget,
        addFilter: s.addFilter,
        removeFilter: s.removeFilter,
        clearFilters: s.clearFilters,
        createDashboard: s.createDashboard,
        setActiveDashboard: s.setActiveDashboard,
      }))
    )

  const handleCreateDashboard = useCallback(() => {
    const id = createDashboard(_t("dashboard.list.defaultName"))
    setActiveDashboard(id)
  }, [createDashboard, setActiveDashboard, _t])

  // Derived: no store subscription needed, computed from activeDashboard fields
  const isDirty = activeDashboard
    ? activeDashboard.updatedAt > (activeDashboard.lastSavedAt ?? 0)
    : false

  const handleSave = useCallback(() => {
    if (!activeDashboard) return
    saveDashboard(activeDashboard.id)
  }, [activeDashboard, saveDashboard])

  const handlePublish = useCallback(() => {
    if (!activeDashboard) return
    if (activeDashboard.status === "draft") {
      const ok = typeof window !== "undefined"
        ? window.confirm(`${_t("dashboard.publish")}?`)
        : true
      if (!ok) return
    }
    publishDashboard(activeDashboard.id)
  }, [activeDashboard, publishDashboard, _t])

  const handleEditDraft = useCallback(() => {
    if (!activeDashboard) return
    unpublishDashboard(activeDashboard.id)
  }, [activeDashboard, unpublishDashboard])

  const [editingWidget, setEditingWidget] = useState<ChartWidget | null>(null)
  const [showSqlDialog, setShowSqlDialog] = useState(false)
  const [showAiDialog, setShowAiDialog] = useState(false)
  const [exploreEditorOpen, setExploreEditorOpen] = useState(false)
  const [exploreEditorWidgetId, setExploreEditorWidgetId] = useState<string | null>(null)

  const selectedTable = useDatasetStore((s) => s.selectedTable)
  const selectedDatabase = useDatasetStore((s) => s.selectedDatabase)
  const { setSql, setPendingAutoExecute } = useQueryActions()

  const handleEditSql = useCallback((widget: ChartWidget) => {
    setSql(widget.sql)
    setPendingAutoExecute(widget.sql)
    useUiStore.getState().setPivotView("grid")
  }, [setSql, setPendingAutoExecute])

  const handleLayoutChange = useCallback(
    (dashboardId: string, layout: WidgetLayout[]) => {
      updateLayout(dashboardId, layout)
    },
    [updateLayout]
  )

  const addWidget = useDashboardsStore((s) => s.addWidget)

  const handleNewExplore = useCallback(() => {
    if (!activeDashboardId) return
    const widgetId = crypto.randomUUID()
    addWidget(activeDashboardId, {
      id: widgetId,
      type: "chart",
      sql: "",
      vizConfig: { type: "bar", xKey: "", title: "" },
      source: "agent-chat",
      lastRunAt: null,
      datasetId: "",
      exploreConfig: { datasetId: "", metrics: [], dimensions: [], rowLimit: 10000 },
    })
    setExploreEditorWidgetId(widgetId)
    setExploreEditorOpen(true)
  }, [activeDashboardId, addWidget])

  const handleEditExplore = useCallback((widgetId: string) => {
    setExploreEditorWidgetId(widgetId)
    setExploreEditorOpen(true)
  }, [])

  if (!activeDashboard) {
    return (
      <div className="flex-1 flex min-h-0">
        {hasDashboards ? (
          <div className="w-48 shrink-0 border-r border-border overflow-auto">
            <DashboardList />
          </div>
        ) : null}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
          <LayoutDashboard className="w-12 h-12 opacity-40" />
          <span className="text-sm font-medium">{_t("dashboard.empty_title")}</span>
          <span className="text-xs">{_t("dashboard.empty_hint")}</span>
          <Button variant="default" size="lg" className="mt-2" onClick={handleCreateDashboard}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {_t("dashboard.empty_cta")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <DashboardLayout
        mode="edit"
        dashboard={activeDashboard}
        isDirty={isDirty}
        onAddFilter={addFilter}
        onRemoveFilter={removeFilter}
        onClearFilters={clearFilters}
        onSave={handleSave}
        onPublish={handlePublish}
        onUnpublish={handleEditDraft}
        onNewSql={() => setShowSqlDialog(true)}
        onNewAi={() => setShowAiDialog(true)}
        onNewExplore={handleNewExplore}
        onEditWidget={setEditingWidget}
        onEditSql={handleEditSql}
        onEditExplore={handleEditExplore}
        onLayoutChange={handleLayoutChange}
      />
      {editingWidget && (
        <WidgetConfigEditor
          open={!!editingWidget}
          onOpenChange={(open) => { if (!open) setEditingWidget(null) }}
          config={editingWidget.vizConfig}
          onSave={(newConfig) => {
            if (!activeDashboardId || !editingWidget) return
            updateWidget(activeDashboardId, editingWidget.id, { vizConfig: newConfig })
            setEditingWidget(null)
          }}
        />
      )}
      {activeDashboardId && exploreEditorWidgetId && (
        <ExploreWidgetEditor
          open={exploreEditorOpen}
          onOpenChange={setExploreEditorOpen}
          dashboardId={activeDashboardId}
          widgetId={exploreEditorWidgetId}
        />
      )}
      {activeDashboardId && (
        <CreateWidgetSqlDialog
          open={showSqlDialog}
          onOpenChange={setShowSqlDialog}
          dashboardId={activeDashboardId}
        />
      )}
      {activeDashboardId && (
        <CreateWidgetAiDialog
          open={showAiDialog}
          onOpenChange={setShowAiDialog}
          dashboardId={activeDashboardId}
          tableName={selectedTable}
          selectedDatabase={selectedDatabase}
        />
      )}
    </>
  )
}
