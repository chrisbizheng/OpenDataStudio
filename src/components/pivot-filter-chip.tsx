"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useLang } from "@/components/lang-provider"
import { executeQuery } from "@/lib/api-client"
import { buildDistinctFilterValuesSQL, toggleFilterValue } from "@/lib/pivot-filter-values"
import type { FilterRule } from "@/lib/pivot-sql"
import type { FieldRole } from "@/lib/field-role"

interface PivotFilterChipProps {
  filter: FilterRule
  role: FieldRole
  type: string
  database: string
  tableName: string
  onChange: (filter: FilterRule) => void
  onRemove: () => void
}

export function PivotFilterChip({
  filter,
  role,
  type,
  database,
  tableName,
  onChange,
  onRemove,
}: PivotFilterChipProps) {
  const { _t } = useLang()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<unknown[]>([])
  const [loading, setLoading] = useState(false)
  const isRange = role === "indicator" || /^Date/.test(type.replace(/^Nullable\((.+)\)$/, "$1"))
  const isDateRange = isRange && role !== "indicator"
  const values = Array.isArray(filter.value) ? filter.value : [filter.value]

  function toggleOpen() {
    const nextOpen = !open
    setOpen(nextOpen)
    if (!nextOpen || isRange || options.length > 0 || loading) return
    setLoading(true)
    executeQuery(
      buildDistinctFilterValuesSQL(database, tableName, filter.field),
      database
    )
      .then((result) => setOptions(result.rows.map((row) => row[0])))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false))
  }

  return (
    <div className="relative inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[11px]">
      <button type="button" className="max-w-40 truncate" onClick={toggleOpen}>
        {filter.field} {filterSummary(filter)}
      </button>
      <button type="button" className="text-muted-foreground hover:text-destructive" onClick={onRemove}>
        ×
      </button>
      {open && (
        <div className={isDateRange ? "absolute left-0 top-6 z-50 w-72 rounded-xl border border-border bg-popover p-3 shadow-xl" : "absolute left-0 top-6 z-50 w-56 rounded-md border border-border bg-popover p-2 shadow-md"}>
          {isRange ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-foreground">{filter.field}</div>
                <div className="text-[10px] text-muted-foreground">{_t("pivot.filter.range")}</div>
              </div>
              <div className={isDateRange ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                <label className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">{_t("pivot.filter.min")}</span>
                  <Input
                    className="h-8 rounded-lg bg-background text-[10px]"
                    placeholder={_t("pivot.filter.min")}
                    value={String(values[0] ?? "")}
                    type={role === "indicator" ? "number" : "date"}
                    onChange={(e) => onChange({ ...filter, op: "BETWEEN", value: [e.target.value, values[1] ?? ""] })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">{_t("pivot.filter.max")}</span>
                  <Input
                    className="h-8 rounded-lg bg-background text-[10px]"
                    placeholder={_t("pivot.filter.max")}
                    value={String(values[1] ?? "")}
                    type={role === "indicator" ? "number" : "date"}
                    onChange={(e) => onChange({ ...filter, op: "BETWEEN", value: [values[0] ?? "", e.target.value] })}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground">{_t("pivot.filter.values")}</div>
              <div className="max-h-40 overflow-auto rounded border border-border">
                {loading ? (
                  <div className="px-2 py-1 text-xs text-muted-foreground">{_t("grid.loading")}</div>
                ) : options.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-muted-foreground">{_t("grid.no_rows")}</div>
                ) : (
                  options.map((option) => {
                    const checked = values.includes(option)
                    return (
                      <button
                        key={String(option)}
                        type="button"
                        className="flex w-full items-center gap-2 px-2 py-1 text-left text-xs hover:bg-muted"
                        onClick={() =>
                          onChange({
                            ...filter,
                            op: "IN",
                            value: toggleFilterValue(values, option),
                          })
                        }
                      >
                        <span className="w-3 text-center">{checked ? "✓" : ""}</span>
                        <span className="truncate">{String(option)}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
          <Button type="button" size="sm" variant="outline" className="mt-2 h-7 w-full text-xs" onClick={() => setOpen(false)}>
            {_t("pivot.save")}
          </Button>
        </div>
      )}
    </div>
  )
}

function filterSummary(filter: FilterRule): string {
  if (filter.op === "BETWEEN") {
    const [from, to] = Array.isArray(filter.value) ? filter.value : [filter.value, filter.value]
    return `${from ?? ""} ~ ${to ?? ""}`
  }
  if (filter.op === "IN") {
    const values = Array.isArray(filter.value) ? filter.value : [filter.value]
    return `∈ [${values.join(", ")}]`
  }
  return `${filter.op} ${String(filter.value)}`
}
