"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Plus } from "lucide-react"
import { useCatalog } from "@/hooks/use-catalog"
import type { DashboardFilter, FilterOperator, FilterScope } from "@/stores/dashboards"
import { fetchDistinctValues, fetchViaApiQuery } from "@/lib/distinct-values"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ColumnMeta } from "@/lib/types"

interface AddFilterButtonProps {
  dashboardId: string
  onAdd: (dashboardId: string, filter: DashboardFilter) => void
  _t: (key: string) => string
  /** Widgets in current dashboard, for scope selection */
  widgets?: { id: string; title?: string }[]
}

const OPERATORS: { value: FilterOperator; labelKey: string }[] = [
  { value: "=", labelKey: "filter.equals" },
  { value: "!=", labelKey: "filter.not_equals" },
  { value: ">", labelKey: "filter.greater" },
  { value: "<", labelKey: "filter.less" },
  { value: ">=", labelKey: "filter.greater_equal" },
  { value: "<=", labelKey: "filter.less_equal" },
  { value: "IN", labelKey: "filter.in" },
  { value: "NOT IN", labelKey: "filter.not_in" },
  { value: "LIKE", labelKey: "filter.like" },
  { value: "BETWEEN", labelKey: "filter.between" },
]

function inferColumnType(type: string): "number" | "date" | "text" {
  const upper = type.toUpperCase()
  if (upper.includes("INT") || upper.includes("FLOAT") || upper.includes("DECIMAL") || upper.includes("DOUBLE") || upper.includes("UINT")) return "number"
  if (upper.includes("DATE") || upper.includes("DATETIME") || upper.includes("TIMESTAMP")) return "date"
  return "text"
}

export function AddFilterButton({
  dashboardId,
  onAdd,
  _t,
  widgets = [],
}: AddFilterButtonProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"column" | "operator" | "value" | "loading">("column")
  const [selectedColumn, setSelectedColumn] = useState<string>("")
  const [selectedColumnType, setSelectedColumnType] = useState<string>("")
  const [operator, setOperator] = useState<FilterOperator>("=")
  const [distinctValues, setDistinctValues] = useState<string[]>([])
  const [singleValue, setSingleValue] = useState("")
  const [multiValues, setMultiValues] = useState<string[]>([])
  const [likeValue, setLikeValue] = useState("")
  const [betweenFrom, setBetweenFrom] = useState("")
  const [betweenTo, setBetweenTo] = useState("")
  const [scope, setScope] = useState<FilterScope>("global")
  const [scopedWidgetIds, setScopedWidgetIds] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const { schema, selectedTable, selectedDatabase } = useCatalog()

  const columnNames = schema.map((c: ColumnMeta) => c.name)

  const columnTypeMap = useMemo(() => {
    const map = new Map<string, string>()
    schema.forEach((c: ColumnMeta) => map.set(c.name, c.type))
    return map
  }, [schema])

  const needsDistinctValues = operator === "=" || operator === "!=" || operator === "IN" || operator === "NOT IN"

  const handleSelectColumn = useCallback(
    async (column: string) => {
      setSelectedColumn(column)
      setSelectedColumnType(columnTypeMap.get(column) || "")
      setOperator("=")
      setSingleValue("")
      setMultiValues([])
      setLikeValue("")
      setBetweenFrom("")
      setBetweenTo("")
      setStep("operator")
    },
    [columnTypeMap],
  )

  const handleSelectOperator = useCallback(
    async (op: FilterOperator) => {
      setOperator(op)
      if (op === "LIKE" || op === "BETWEEN") {
        // No distinct values needed
        setStep("value")
        return
      }
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
          selectedColumn,
          fetchViaApiQuery,
        )
        setDistinctValues(raw.map(String))
        setStep("value")
      } catch {
        setDistinctValues([])
        setStep("value")
      }
    },
    [selectedDatabase, selectedTable, selectedColumn],
  )

  const handleConfirm = useCallback(() => {
    let value = singleValue
    let values: string[] | undefined

    if (operator === "IN" || operator === "NOT IN") {
      values = multiValues
      value = multiValues.join(",")
    } else if (operator === "BETWEEN") {
      values = [betweenFrom, betweenTo]
      value = betweenFrom
    } else if (operator === "LIKE") {
      value = likeValue
    }

    const filter: DashboardFilter = {
      id: crypto.randomUUID(),
      column: selectedColumn,
      value,
      values,
      operator,
      scope,
      scopedWidgets: scope === "scoped" ? scopedWidgetIds : undefined,
    }

    onAdd(dashboardId, filter)
    setOpen(false)
    setStep("column")
    setSelectedColumn("")
    setSelectedColumnType("")
    setOperator("=")
    setDistinctValues([])
    setSingleValue("")
    setMultiValues([])
    setLikeValue("")
    setBetweenFrom("")
    setBetweenTo("")
    setScope("global")
    setScopedWidgetIds([])
  }, [
    dashboardId, selectedColumn, operator, scope, scopedWidgetIds,
    multiValues, betweenFrom, betweenTo, likeValue, singleValue, onAdd,
  ])

  const handleOpen = useCallback(() => {
    setOpen((prev) => !prev)
    setStep("column")
    setSelectedColumn("")
    setSelectedColumnType("")
    setOperator("=")
    setDistinctValues([])
    setSingleValue("")
    setMultiValues([])
    setLikeValue("")
    setBetweenFrom("")
    setBetweenTo("")
    setScope("global")
    setScopedWidgetIds([])
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

  const canConfirm = useMemo(() => {
    if (operator === "IN" || operator === "NOT IN") return multiValues.length > 0
    if (operator === "BETWEEN") return betweenFrom !== "" && betweenTo !== ""
    if (operator === "LIKE") return likeValue !== ""
    return singleValue !== ""
  }, [operator, multiValues, betweenFrom, betweenTo, likeValue, singleValue])

  const inferredType = useMemo(() => inferColumnType(selectedColumnType), [selectedColumnType])

  const toggleMultiValue = useCallback((val: string) => {
    setMultiValues((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    )
  }, [])

  const toggleScopedWidget = useCallback((id: string) => {
    setScopedWidgetIds((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    )
  }, [])

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
        <div className="absolute top-full mt-1 left-0 z-50 min-w-56 rounded-lg border border-border bg-popover shadow-md p-2">
          {/* Step 1: Column selection */}
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

          {/* Step 2: Operator selection */}
          {step === "operator" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1.5 py-1">
                <span className="text-xs text-muted-foreground">
                  {selectedColumn}
                </span>
                <button
                  onClick={() => setStep("column")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← {_t("dashboard.cancel")}
                </button>
              </div>
              <div className="px-1.5">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  {_t("filter.operator")}
                </Label>
                <Select
                  value={operator}
                  onValueChange={(v) => handleSelectOperator(v as FilterOperator)}
                >
                  <SelectTrigger className="w-full text-xs h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value} className="text-xs">
                        {op.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Loading */}
          {step === "loading" && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              {_t("dashboard.loading")}
            </div>
          )}

          {/* Step 3: Value input + scope */}
          {step === "value" && (
            <div className="flex flex-col gap-2">
              {/* Header */}
              <div className="flex items-center justify-between px-1.5 py-1">
                <span className="text-xs text-muted-foreground">
                  {selectedColumn} {operator}
                </span>
                <button
                  onClick={() => setStep("operator")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← {_t("dashboard.cancel")}
                </button>
              </div>

              {/* Value input based on operator */}
              <div className="px-1.5">
                {needsDistinctValues && (
                  <div className="max-h-36 overflow-y-auto border border-border rounded">
                    {distinctValues.length === 0 && (
                      <span className="text-xs text-muted-foreground px-2 py-1.5 block">
                        {_t("dashboard.no_data_hint")}
                      </span>
                    )}
                    {(operator === "=" || operator === "!=") && (
                      <div className="flex flex-col">
                        {distinctValues.map((val) => (
                          <button
                            key={val}
                            onClick={() => setSingleValue(val)}
                            className={`w-full text-left text-xs px-2 py-1.5 truncate hover:bg-accent transition-colors ${
                              singleValue === val ? "bg-accent font-medium" : ""
                            }`}
                            title={val}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    )}
                    {(operator === "IN" || operator === "NOT IN") && (
                      <div className="flex flex-col">
                        {distinctValues.map((val) => (
                          <label
                            key={val}
                            className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent cursor-pointer truncate"
                          >
                            <input
                              type="checkbox"
                              checked={multiValues.includes(val)}
                              onChange={() => toggleMultiValue(val)}
                              className="shrink-0"
                            />
                            <span className="truncate">{val}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {operator === "LIKE" && (
                  <Input
                    value={likeValue}
                    onChange={(e) => setLikeValue(e.target.value)}
                    placeholder={_t("filter.like_placeholder")}
                    className="h-7 text-xs"
                  />
                )}

                {operator === "BETWEEN" && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-[10px] text-muted-foreground mb-0.5 block">
                        {_t("filter.from")}
                      </Label>
                      <Input
                        type={inferredType === "date" ? "date" : "number"}
                        value={betweenFrom}
                        onChange={(e) => setBetweenFrom(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px] text-muted-foreground mb-0.5 block">
                        {_t("filter.to")}
                      </Label>
                      <Input
                        type={inferredType === "date" ? "date" : "number"}
                        value={betweenTo}
                        onChange={(e) => setBetweenTo(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Scope config */}
              <div className="px-1.5 pt-1 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    {_t("filter.scope")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {scope === "global" ? _t("filter.scope_global") : _t("filter.scope_scoped")}
                    </span>
                    <Switch
                      size="sm"
                      checked={scope === "scoped"}
                      onCheckedChange={(checked) => setScope(checked ? "scoped" : "global")}
                    />
                  </div>
                </div>
                {scope === "scoped" && widgets.length > 0 && (
                  <div className="max-h-28 overflow-y-auto mt-1 border border-border rounded">
                    {widgets.map((w) => (
                      <label
                        key={w.id}
                        className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-accent cursor-pointer truncate"
                      >
                        <input
                          type="checkbox"
                          checked={scopedWidgetIds.includes(w.id)}
                          onChange={() => toggleScopedWidget(w.id)}
                          className="shrink-0"
                        />
                        <span className="truncate">{w.title || w.id.slice(0, 8)}</span>
                      </label>
                    ))}
                  </div>
                )}
                {scope === "scoped" && widgets.length === 0 && (
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {_t("dashboard.no_widgets_title")}
                  </span>
                )}
              </div>

              {/* Confirm button */}
              <div className="px-1.5 pb-1">
                <Button
                  size="xs"
                  variant="default"
                  className="w-full text-xs"
                  disabled={!canConfirm}
                  onClick={handleConfirm}
                >
                  {_t("dashboard.add_filter")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
