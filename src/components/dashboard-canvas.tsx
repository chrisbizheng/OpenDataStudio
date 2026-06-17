"use client"

import { useCallback, useMemo, useState } from "react"
import { GridLayout, useContainerWidth, type Layout } from "react-grid-layout"
import { useShallow } from "zustand/react/shallow"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { useDashboardsStore } from "@/stores/dashboards"
import { useDatasetStore } from "@/stores/dataset"
import { DashboardFilterBar } from "@/components/dashboard-filter-bar"
import { ExternalLink, LayoutDashboard, BarChart3, Save, Upload, Pencil, CheckCircle2, FileCode, Plus, MessageSquare, PlusCircle } from "lucide-react"
import { WidgetConfigEditor } from "@/components/widget-config-editor"
import { useData } from "@/components/data-provider"
import { DashboardList } from "@/components/dashboard-list"
import { useLang } from "@/components/lang-provider"
import { useUiStore } from "@/stores/ui"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ChartWidget, WidgetLayout } from "@/stores/dashboards"
import { CreateWidgetSqlDialog } from "@/components/create-widget-sql-dialog"
import { CreateWidgetAiDialog } from "@/components/create-widget-ai-dialog"
import { ChartWidgetRenderer, buildFilteredSql, formatTimeAgo } from "@/components/chart-widget-renderer"
import { toRGLLayout } from "@/lib/dashboard-utils"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

/** Convert react-grid-layout Layout → store WidgetLayout[] */
function fromRGLLayout(layout: Layout): WidgetLayout[] {
  return layout.map((l) => ({
    i: l.i,
    x: l.x,
    y: l.y,
    w: l.w,
    h: l.h,
  }))
}

export function DashboardCanvas() {
  const { resolved: themeMode } = useTheme()
  const isDark = themeMode === "dark"

  const { _t } = useLang()
  const { width, containerRef } = useContainerWidth()

  const { activeDashboard, updateLayout, activeDashboardId, saveDashboard, publishDashboard, unpublishDashboard, updateWidget, addFilter, removeFilter, dashboards, createDashboard } =
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
  const isDirty =
    activeDashboard != null &&
    activeDashboard.lastSavedAt != null &&
    activeDashboard.updatedAt > activeDashboard.lastSavedAt

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
        <style>{`
          .react-grid-placeholder {
            background: color-mix(in oklch, var(--accent) 30%, transparent) !important;
            opacity: 1 !important;
          }
          .react-grid-item > .react-resizable-handle::after {
            border-color: var(--border) !important;
          }
        `}</style>
      <GridLayout
        width={width}
        layout={layout}
        gridConfig={{
          cols: 12,
          rowHeight: 80,
          margin: [12, 12] as const,
          containerPadding: null,
          maxRows: Infinity,
        }}
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
        tableName={selectedTable}
        selectedDatabase={selectedDatabase}
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

// ── Dashboard Toolbar ───────────────────────────────────────

interface DashboardToolbarProps {
  name: string
  isPublished: boolean
  isDirty: boolean
  dashboardId: string
  onSave: () => void
  onPublish: () => void
  onEditDraft: () => void
  onNewSql: () => void
  onNewAi: () => void
  _t: (key: string) => string
}

function DashboardToolbar({
  name,
  isPublished,
  isDirty,
  dashboardId,
  onSave,
  onPublish,
  onEditDraft,
  onNewSql,
  onNewAi,
  _t,
}: DashboardToolbarProps) {
  const handleOpenView = useCallback(() => {
    window.open(`/dashboard/${dashboardId}`, "_blank")
  }, [dashboardId])
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{name}</span>
        <Badge variant={isPublished ? "default" : "secondary"} className="text-[10px]">
          {isPublished ? (
            <>
              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
              {_t("dashboard.published")}
            </>
          ) : (
            _t("dashboard.draft")
          )}
        </Badge>
        {isDirty && (
          <Badge variant="destructive" className="text-[10px]">
            {_t("dashboard.unsaved")}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!isPublished && (
          <>
            <Button size="xs" variant="outline" onClick={onNewSql}>
              <FileCode className="h-3 w-3 mr-1" />
              {_t("dashboard.new_sql")}
            </Button>
            <Button size="xs" variant="outline" onClick={onNewAi}>
              <MessageSquare className="h-3 w-3 mr-1" />
              {_t("dashboard.new_ai")}
            </Button>
          </>
        )}
        {isPublished ? (
          <>
            <Button size="xs" variant="outline" onClick={handleOpenView}>
              <ExternalLink className="h-3 w-3 mr-1" />
              {_t("dashboard.view_open")}
            </Button>
            <Button size="xs" variant="outline" onClick={onEditDraft}>
              <Pencil className="h-3 w-3 mr-1" />
              {_t("dashboard.edit_draft")}
            </Button>
          </>
        ) : (
          <>
            <Button size="xs" variant="outline" onClick={onSave} disabled={!isDirty}>
              <Save className="h-3 w-3 mr-1" />
              {_t("dashboard.save")}
            </Button>
            <Button size="xs" variant="default" onClick={onPublish}>
              <Upload className="h-3 w-3 mr-1" />
              {_t("dashboard.publish")}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
