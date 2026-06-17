"use client"

import { useMemo } from "react"
import { GridLayout, useContainerWidth } from "react-grid-layout"
import { useShallow } from "zustand/react/shallow"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { useLang } from "@/components/lang-provider"
import { useDashboardsStore, type ChartWidget, type WidgetLayout } from "@/stores/dashboards"
import { ChartWidgetRenderer } from "@/components/chart-widget-renderer"
import { DashboardFilterBar } from "@/components/dashboard-filter-bar"
import { toRGLLayout, DASHBOARD_GRID_CONFIG, DASHBOARD_GRID_CSS } from "@/lib/dashboard-utils"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Moon, Sun } from "lucide-react"
import Link from "next/link"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

export function DashboardView({ dashboardId }: { dashboardId: string }) {
  const { resolved: themeMode, setTheme, theme } = useTheme()
  const isDark = themeMode === "dark"
  const { _t } = useLang()
  const { width, containerRef } = useContainerWidth()

  const dashboard = useDashboardsStore(
    useShallow((s) => s.dashboards.find((d) => d.id === dashboardId) ?? null)
  )

  const { addFilter, removeFilter } = useDashboardsStore(
    useShallow((s) => ({
      addFilter: s.addFilter,
      removeFilter: s.removeFilter,
    }))
  )

  const layout = useMemo(
    () => (dashboard ? toRGLLayout(dashboard.layout) : []),
    [dashboard]
  )

  if (!dashboard) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <span className="text-lg font-medium">{_t("dashboard.view_not_found")}</span>
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {_t("dashboard.view_back")}
          </Button>
        </Link>
      </div>
    )
  }

  if (dashboard.status === "draft") {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <span className="text-lg font-medium">{_t("dashboard.view_not_published")}</span>
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {_t("dashboard.view_back_to_studio")}
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
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

      <DashboardFilterBar
        dashboardId={dashboard.id}
        filters={dashboard.filters}
        isPublished={true}
        forceVisible={true}
      />

      <div ref={containerRef} className="flex-1 min-h-0 overflow-auto">
        <style>{DASHBOARD_GRID_CSS}</style>
        {dashboard.widgets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <span className="text-sm">{_t("dashboard.no_widgets_title")}</span>
          </div>
        ) : (
          <GridLayout
            width={width}
            layout={layout}
            gridConfig={DASHBOARD_GRID_CONFIG}
            dragConfig={{ enabled: false }}
            resizeConfig={{ enabled: false }}
            onLayoutChange={() => {}}
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
                    isPublished={true}
                    viewOnly={true}
                    dashboardFilters={dashboard.filters}
                    onAddFilter={addFilter}
                    onRemoveFilter={removeFilter}
                    dashboardId={dashboard.id}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    {widget.type} widget (coming soon)
                  </div>
                )}
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </div>
  )
}
