"use client"

import { X, Target } from "lucide-react"
import { useLang } from "@/components/lang-provider"
import { type DashboardFilter } from "@/stores/dashboards"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AddFilterButton } from "@/components/add-filter-button"

interface DashboardFilterBarProps {
  dashboardId: string
  filters: DashboardFilter[]
  isPublished: boolean
  /** Force visibility even when published (for view mode) */
  forceVisible?: boolean
  onAddFilter: (dashboardId: string, filter: DashboardFilter) => void
  onRemoveFilter: (dashboardId: string, filterId: string) => void
  onClearFilters: (dashboardId: string) => void
  /** Widgets in current dashboard, for scope selection */
  widgets?: { id: string; title?: string }[]
}

function formatFilterLabel(f: DashboardFilter): string {
  const op = f.operator || "="
  switch (op) {
    case "=":
      return `${f.column}: ${f.value}`
    case "!=":
      return `${f.column} \u2260 ${f.value}`
    case ">":
    case "<":
    case ">=":
    case "<=":
      return `${f.column} ${op} ${f.value}`
    case "IN": {
      const vals = f.values || f.value.split(",")
      const display = vals.length > 3
        ? vals.slice(0, 3).join(", ") + ", ..."
        : vals.join(", ")
      return `${f.column} \u2208 [${display}]`
    }
    case "NOT IN": {
      const vals = f.values || f.value.split(",")
      const display = vals.length > 3
        ? vals.slice(0, 3).join(", ") + ", ..."
        : vals.join(", ")
      return `${f.column} \u2209 [${display}]`
    }
    case "LIKE":
      return `${f.column} ~ ${f.value}`
    case "BETWEEN": {
      const from = f.values?.[0] || ""
      const to = f.values?.[1] || ""
      return `${f.column}: ${from} ~ ${to}`
    }
    default:
      return `${f.column}: ${f.value}`
  }
}

export function DashboardFilterBar({
  dashboardId,
  filters,
  isPublished,
  forceVisible = false,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
  widgets = [],
}: DashboardFilterBarProps) {
  const { _t } = useLang()

  if (isPublished && !forceVisible) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0 flex-wrap min-h-10">
      {filters.map((f) => {
        const isScoped = f.scope === "scoped"
        return (
          <TooltipProvider key={f.id}>
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <Badge
                  variant="secondary"
                  className={`gap-1 text-xs font-normal cursor-default ${
                    isScoped ? "border border-primary/40" : ""
                  }`}
                >
                  {isScoped && <Target className="h-3 w-3 text-primary" />}
                  <span className="text-muted-foreground">
                    {formatFilterLabel(f)}
                  </span>
                  <button
                    onClick={() => onRemoveFilter(dashboardId, f.id)}
                    className="ml-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors"
                    aria-label={_t("dashboard.delete")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </TooltipTrigger>
              {isScoped && f.scopedWidgets && f.scopedWidgets.length > 0 && (
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs font-medium mb-1">
                    {_t("filter.scope_scoped")}:
                  </p>
                  <ul className="text-[10px] list-disc list-inside">
                    {f.scopedWidgets.map((wid) => (
                      <li key={wid}>{wid.slice(0, 8)}</li>
                    ))}
                  </ul>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )
      })}
      <AddFilterButton
        dashboardId={dashboardId}
        onAdd={onAddFilter}
        _t={_t}
        widgets={widgets}
      />
      {filters.length > 0 && (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => onClearFilters(dashboardId)}
          className="text-xs text-muted-foreground"
        >
          {_t("dashboard.clear_filters")}
        </Button>
      )}
    </div>
  )
}
