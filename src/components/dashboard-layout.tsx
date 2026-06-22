"use client"

import { useCallback, useMemo } from "react"
import { GridLayout, useContainerWidth, type Layout } from "react-grid-layout"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { useLang } from "@/components/lang-provider"
import { type ChartWidget, type Dashboard, type DashboardFilter, type WidgetLayout } from "@/stores/dashboards"
import { DashboardList } from "@/components/dashboard-list"
import { DashboardFilterBar } from "@/components/dashboard-filter-bar"
import { ChartWidgetRenderer } from "@/components/chart-widget-renderer"
import { toRGLLayout, fromRGLLayout, DASHBOARD_GRID_CONFIG, DASHBOARD_GRID_CSS } from "@/lib/dashboard-utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Save, Upload, Pencil, CheckCircle2, FileCode, MessageSquare, ArrowLeft, Moon, Sun, BarChart3 } from "lucide-react"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

interface DashboardLayoutProps {
  mode: "edit" | "view"
  dashboard: Dashboard
  isDirty?: boolean
  onAddFilter: (dashboardId: string, filter: DashboardFilter) => void
  onRemoveFilter: (dashboardId: string, filterId: string) => void
  onClearFilters: (dashboardId: string) => void
  onSave?: () => void
  onPublish?: () => void
  onUnpublish?: () => void
  onNewSql?: () => void
  onNewAi?: () => void
  onEditWidget?: (widget: ChartWidget) => void
  onEditSql?: (widget: ChartWidget) => void
  onLayoutChange?: (dashboardId: string, layout: WidgetLayout[]) => void
}

export function DashboardLayout({
  mode,
  dashboard,
  isDirty = false,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
  onSave,
  onPublish,
  onUnpublish,
  onNewSql,
  onNewAi,
  onEditWidget,
  onEditSql,
  onLayoutChange,
}: DashboardLayoutProps) {
  const { resolved: themeMode, setTheme, theme } = useTheme()
  const isDark = themeMode === "dark"
  const { _t } = useLang()
  const { width, containerRef } = useContainerWidth()

  const isView = mode === "view"
  const isPublished = dashboard.status === "published"

  const layout = useMemo(() => toRGLLayout(dashboard.layout), [dashboard.layout])

  const handleLayoutChange = useCallback(
    (rglLayout: Layout) => {
      if (!onLayoutChange) return
      onLayoutChange(dashboard.id, fromRGLLayout(rglLayout))
    },
    [dashboard.id, onLayoutChange]
  )

  const handleOpenView = useCallback(() => {
    window.open(`/dashboard/${dashboard.id}`, "_blank")
  }, [dashboard.id])

  const renderEditToolbar = () => {
    if (isView) return null
    return (
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{dashboard.name}</span>
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
              <Button size="xs" variant="outline" onClick={onUnpublish}>
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

  const renderViewTopBar = () => {
    if (!isView) return null
    return (
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              {_t("dashboard.view_back_to_studio")}
            </Button>
          </Link>
          <span className="font-medium text-sm">{dashboard.name}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    )
  }

  const renderWidgets = () => {
    if (dashboard.widgets.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
          {isView ? (
            <span className="text-sm">{_t("dashboard.no_widgets_title")}</span>
          ) : (
            <>
              <BarChart3 className="w-12 h-12 opacity-40" />
              <span className="text-sm font-medium">{_t("dashboard.no_widgets_title")}</span>
              <span className="text-xs">{_t("dashboard.no_widgets_hint")}</span>
            </>
          )}
        </div>
      )
    }
    return (
      <GridLayout
        width={width}
        layout={layout}
        gridConfig={DASHBOARD_GRID_CONFIG}
        dragConfig={{ enabled: !isView && !isPublished }}
        resizeConfig={{ enabled: !isView && !isPublished }}
        onLayoutChange={isView ? () => {} : handleLayoutChange}
      >
        {dashboard.widgets.map((widget) => (
          <div key={widget.id} className={cn(
            "rounded-lg border overflow-hidden",
            isDark ? "bg-card border-border" : "bg-white border-border",
          )}>
            {widget.type === "chart" ? (
              <ChartWidgetRenderer
                widget={widget as ChartWidget}
                isDark={isDark}
                isPublished={isPublished}
                viewOnly={isView}
                dashboardFilters={dashboard.filters}
                onAddFilter={onAddFilter}
                onRemoveFilter={onRemoveFilter}
                dashboardId={dashboard.id}
                onEditConfig={isView ? undefined : onEditWidget}
                onEditSql={isView ? undefined : onEditSql}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                {widget.type} widget (coming soon)
              </div>
            )}
          </div>
        ))}
      </GridLayout>
    )
  }

  if (!isView) {
    return (
      <div className="flex-1 flex min-h-0">
        <div className="w-48 shrink-0 border-r border-border overflow-auto">
          <DashboardList />
        </div>
        <div ref={containerRef} className="flex-1 min-h-0 flex flex-col">
          {renderEditToolbar()}
          <DashboardFilterBar
            dashboardId={dashboard.id}
            filters={dashboard.filters}
            isPublished={!!isPublished}
            onAddFilter={onAddFilter}
            onRemoveFilter={onRemoveFilter}
            onClearFilters={onClearFilters}
          />
          <div className="flex-1 min-h-0 overflow-auto">
            <style>{DASHBOARD_GRID_CSS}</style>
            {renderWidgets()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {renderViewTopBar()}
      <DashboardFilterBar
        dashboardId={dashboard.id}
        filters={dashboard.filters}
        isPublished={true}
        forceVisible={true}
        onAddFilter={onAddFilter}
        onRemoveFilter={onRemoveFilter}
        onClearFilters={onClearFilters}
      />
      <div ref={containerRef} className="flex-1 min-h-0 overflow-auto">
        <style>{DASHBOARD_GRID_CSS}</style>
        {renderWidgets()}
      </div>
    </div>
  )
}
