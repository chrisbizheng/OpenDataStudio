"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { X, Plus } from "lucide-react"
import { useLang } from "@/components/lang-provider"
import { useCatalog } from "@/hooks/use-catalog"
import { useDashboardsStore, type DashboardFilter } from "@/stores/dashboards"
import { fetchDistinctValues, fetchViaApiQuery } from "@/lib/distinct-values"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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

function AddFilterButton({
  dashboardId,
  onAdd,
  _t,
}: {
  dashboardId: string
  onAdd: (dashboardId: string, filter: DashboardFilter) => void
  _t: (key: string) => string
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"column" | "value" | "loading">("column")
  const [selectedColumn, setSelectedColumn] = useState<string>("")
  const [distinctValues, setDistinctValues] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const { schema, selectedTable, selectedDatabase } = useCatalog()

  const columnNames = schema.map((c) => c.name)

  const handleSelectColumn = useCallback(
    async (column: string) => {
      setSelectedColumn(column)
      if (!selectedDatabase || !selectedTable) {
        setDistinctValues([])
        setStep("value")
        return
      }
      setStep("loading")
      try {
        const raw = await fetchDistinctValues(
          selectedDatabase,
          selectedTable,
          column,
          fetchViaApiQuery,
        )
        setDistinctValues(raw.map(String))
        setStep("value")
      } catch {
        setDistinctValues([])
        setStep("value")
      }
    },
    [selectedDatabase, selectedTable],
  )

  const handleSelectValue = useCallback(
    (value: string) => {
      onAdd(dashboardId, {
        id: crypto.randomUUID(),
        column: selectedColumn,
        value,
      })
      setOpen(false)
      setStep("column")
      setSelectedColumn("")
      setDistinctValues([])
    },
    [dashboardId, selectedColumn, onAdd],
  )

  const handleOpen = useCallback(() => {
    setOpen((prev) => !prev)
    setStep("column")
    setSelectedColumn("")
    setDistinctValues([])
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-flex">
      <Button
        size="xs"
        variant="outline"
        onClick={handleOpen}
        className="text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        {_t("dashboard.add_filter")}
      </Button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-44 rounded-lg border border-border bg-popover shadow-md p-2">
          {step === "column" && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground px-1.5 py-1">
                {_t("dashboard.select_column")}
              </span>
              <div className="max-h-48 overflow-y-auto">
                {columnNames.length === 0 && (
                  <span className="text-xs text-muted-foreground px-1.5 py-1 block">
                    {_t("schema.select_table")}
                  </span>
                )}
                {columnNames.map((col) => (
                  <button
                    key={col}
                    onClick={() => handleSelectColumn(col)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent transition-colors"
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === "loading" && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              {_t("dashboard.loading")}
            </div>
          )}
          {step === "value" && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between px-1.5 py-1">
                <span className="text-xs text-muted-foreground">
                  {selectedColumn} {_t("dashboard.select_value")}
                </span>
                <button
                  onClick={() => setStep("column")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← {_t("dashboard.cancel")}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {distinctValues.length === 0 && (
                  <span className="text-xs text-muted-foreground px-1.5 py-1 block">
                    {_t("dashboard.no_data_hint")}
                  </span>
                )}
                {distinctValues.map((val) => (
                  <button
                    key={val}
                    onClick={() => handleSelectValue(val)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent transition-colors truncate"
                    title={val}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
