"use client"

import { X } from "lucide-react"
import { useLang } from "@/components/lang-provider"
import { useDashboardsStore, type DashboardFilter } from "@/stores/dashboards"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddFilterButton } from "@/components/add-filter-button"

interface DashboardFilterBarProps {
  dashboardId: string
  filters: DashboardFilter[]
  isPublished: boolean
  /** Force visibility even when published (for view mode) */
  forceVisible?: boolean
}

export function DashboardFilterBar({
  dashboardId,
  filters,
  isPublished,
  forceVisible = false,
}: DashboardFilterBarProps) {
  const { _t } = useLang()
  const { addFilter, removeFilter, clearFilters } = useDashboardsStore()

  if (isPublished && !forceVisible) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0 flex-wrap min-h-10">
      {filters.map((f) => (
        <Badge
          key={f.id}
          variant="secondary"
          className="gap-1 text-xs font-normal cursor-default"
        >
          <span className="text-muted-foreground">{f.column}</span>
          <span>=</span>
          <span className="font-medium">{f.value}</span>
          <button
            onClick={() => removeFilter(dashboardId, f.id)}
            className="ml-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors"
            aria-label={_t("dashboard.delete")}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <AddFilterButton
        dashboardId={dashboardId}
        onAdd={addFilter}
        _t={_t}
      />
      {filters.length > 0 && (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => clearFilters(dashboardId)}
          className="text-xs text-muted-foreground"
        >
          {_t("dashboard.clear_filters")}
        </Button>
      )}
    </div>
  )
}
