"use client"

import { useShallow } from "zustand/react/shallow"
import { useLang } from "@/components/lang-provider"
import { useDashboardsStore } from "@/stores/dashboards"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export function DashboardView({ dashboardId }: { dashboardId: string }) {
  const { _t } = useLang()

  const dashboard = useDashboardsStore(
    useShallow((s) => s.dashboards.find((d) => d.id === dashboardId) ?? null)
  )

  const { addFilter, removeFilter, clearFilters } = useDashboardsStore(
    useShallow((s) => ({
      addFilter: s.addFilter,
      removeFilter: s.removeFilter,
      clearFilters: s.clearFilters,
    }))
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
    <DashboardLayout
      mode="view"
      dashboard={dashboard}
      onAddFilter={addFilter}
      onRemoveFilter={removeFilter}
      onClearFilters={clearFilters}
    />
  )
}
