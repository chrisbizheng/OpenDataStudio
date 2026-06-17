"use client"

import { useCallback, useMemo, useState } from "react"
import { GridLayout, useContainerWidth, type Layout } from "react-grid-layout"
import { useShallow } from "zustand/react/shallow"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { useDashboardsStore } from "@/stores/dashboards"
import { useDatasetStore } from "@/stores/dataset"
import { DashboardFilterBar } from "@/components/dashboard-filter-bar"
import { LayoutDashboard, BarChart3, Plus, PlusCircle } from "lucide-react"
import { WidgetConfigEditor } from "@/components/widget-config-editor"
import { useData } from "@/components/data-provider"
import { DashboardList } from "@/components/dashboard-list"
import { useLang } from "@/components/lang-provider"
import { useUiStore } from "@/stores/ui"
import { Button } from "@/components/ui/button"
import type { ChartWidget } from "@/stores/dashboards"
import { CreateWidgetSqlDialog } from "@/components/create-widget-sql-dialog"
import { CreateWidgetAiDialog } from "@/components/create-widget-ai-dialog"
import { ChartWidgetRenderer } from "@/components/chart-widget-renderer"
import { toRGLLayout, fromRGLLayout, DASHBOARD_GRID_CONFIG, DASHBOARD_GRID_CSS } from "@/lib/dashboard-utils"
import { DashboardToolbar } from "@/components/dashboard-toolbar"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

export function DashboardCanvas() {
  const { resolved: themeMode } = useTheme()
  const isDark = themeMode === "dark"

  const { _t } = useLang()
  const { width, containerRef } = useContainerWidth()

  const { activeDashboard, updateLayout, activeDashboardId, saveDashboard, publishDashboard, unpublishDashboard, updateWidget, addFilter, removeFilter, dashboards, createDashboard, isDirty: storeIsDirty } =
    useDashboardsStore(
      useShallow((s) => ({
        activeDashboard: s.dashboards.find((d) => d.id === s.activeDashboardId) ?? null,
        updateLayout: s.updateLayout,
        activeDashboardId: s.activeDashboardId,
        saveDashboard: s.saveDashboard,
        publishDashboard: s.publishDashboard,
        unpublishDashboard: s.unpublishDashboard,
        updateWidget: s.updateWidget,
        addFilter: s.addFilter,
        removeFilter: s.removeFilter,
        dashboards: s.dashboards,
        createDashboard: s.createDashboard,
        isDirty: s.isDirty,
      }))
    )

  const handleCreateDashboard = useCallback(() => {
    const id = createDashboard(_t("dashboard.list.defaultName"))
    useDashboardsStore.getState().setActiveDashboard(id)
  }, [createDashboard, _t])

  const hasDashboards = dashboards.length > 0

  const handleLayoutChange = useCallback(
    (layout: Layout) => {
      if (!activeDashboardId) return
      updateLayout(activeDashboardId, fromRGLLayout(layout))
    },
    [activeDashboardId, updateLayout]
  )

  const layout = useMemo(
    () => (activeDashboard ? toRGLLayout(activeDashboard.layout) : []),
    [activeDashboard]
  )

  const isPublished = activeDashboard?.status === "published"
  const isDirty = activeDashboardId ? storeIsDirty(activeDashboardId) : false

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

  const selectedTable = useDatasetStore((s) => s.selectedTable)
  const selectedDatabase = useDatasetStore((s) => s.selectedDatabase)
  const { queryLifecycle } = useData()

  const handleEditSql = useCallback((widget: ChartWidget) => {
    queryLifecycle.setSql(widget.sql)
    queryLifecycle.setPendingAutoExecute(widget.sql)
    useUiStore.getState().setPivotView("grid")
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

  if (activeDashboard.widgets.length === 0) {
    return (
      <div className="flex-1 flex min-h-0">
        <div className="w-48 shrink-0 border-r border-border overflow-auto">
          <DashboardList />
        </div>
        <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
          <DashboardToolbar
            name={activeDashboard.name}
            isPublished={!!isPublished}
            isDirty={isDirty}
            dashboardId={activeDashboard.id}
            onSave={handleSave}
            onPublish={handlePublish}
            onEditDraft={handleEditDraft}
            onNewSql={() => setShowSqlDialog(true)}
            onNewAi={() => setShowAiDialog(true)}
            _t={_t}
          />
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 opacity-40" />
            <span className="text-sm font-medium">{_t("dashboard.no_widgets_title")}</span>
            <span className="text-xs">{_t("dashboard.no_widgets_hint")}</span>
          </div>
        </div>
      </div>
    )
  }

  return (<>
    <div className="flex-1 flex min-h-0">
      <div className="w-48 shrink-0 border-r border-border overflow-auto">
        <DashboardList />
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 flex flex-col">
        <DashboardToolbar
          name={activeDashboard.name}
          isPublished={!!isPublished}
          isDirty={isDirty}
          dashboardId={activeDashboard.id}
          onSave={handleSave}
          onPublish={handlePublish}
          onEditDraft={handleEditDraft}
          onNewSql={() => setShowSqlDialog(true)}
          onNewAi={() => setShowAiDialog(true)}
          _t={_t}
        />
        <DashboardFilterBar
          dashboardId={activeDashboard.id}
          filters={activeDashboard.filters}
          isPublished={!!isPublished}
        />
        <div className="flex-1 min-h-0 overflow-auto">
        <style>{DASHBOARD_GRID_CSS}</style>
      <GridLayout
        width={width}
        layout={layout}
        gridConfig={DASHBOARD_GRID_CONFIG}
        dragConfig={{ enabled: !isPublished }}
        resizeConfig={{ enabled: !isPublished }}
        onLayoutChange={handleLayoutChange}
      >
        {activeDashboard.widgets.map((widget) => (
          <div key={widget.id} className={cn(
            "rounded-lg border overflow-hidden",
            isDark ? "bg-card border-border" : "bg-white border-border",
          )}>
            {widget.type === "chart" ? (
              <ChartWidgetRenderer
                widget={widget}
                isDark={isDark}
                isPublished={isPublished}
                onEditConfig={setEditingWidget}
                onEditSql={handleEditSql}
                dashboardFilters={activeDashboard.filters}
                onAddFilter={addFilter}
                onRemoveFilter={removeFilter}
                dashboardId={activeDashboard.id}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                {widget.type} widget (coming soon)
              </div>
            )}
          </div>
        ))}
      </GridLayout>
      </div>
      </div>
    </div>
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

