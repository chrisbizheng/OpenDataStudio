"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { useLang } from "@/components/lang-provider"
import { formatRowCount } from "@/lib/format"
import type { TableMeta } from "@/lib/types"

/** Extract the longest common prefix shared by >50% of table names, ending at underscore */
function extractCommonPrefix(names: string[]): string | null {
  if (names.length < 2) return null
  const sorted = [...names].sort()
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  let i = 0
  while (i < first.length && first[i] === last[i]) i++
  if (i === 0) return null
  const prefix = first.slice(0, i)
  const matchCount = names.filter((n) => n.startsWith(prefix)).length
  if (matchCount / names.length <= 0.5) return null
  const lastUnderscore = prefix.lastIndexOf("_")
  if (lastUnderscore > 0) return prefix.slice(0, lastUnderscore + 1)
  return prefix
}

export function TableList({
  tables,
  selectedTable,
  isLoading,
  error,
  onSelectTable,
}: {
  tables: TableMeta[]
  selectedTable: string | null
  isLoading: boolean
  error: string | null
  onSelectTable: (name: string) => void
}) {
  const { _t } = useLang()
  const [tableSearch, setTableSearch] = useState("")

  const tableNames = useMemo(() => tables.map((t) => t.name), [tables])
  const commonPrefix = useMemo(() => extractCommonPrefix(tableNames), [tableNames])

  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return tables
    const q = tableSearch.toLowerCase()
    return tables.filter((t) => t.name.toLowerCase().includes(q))
  }, [tables, tableSearch])

  const displayPrefix = tableSearch.trim() ? null : commonPrefix

  return (
    <>
      {tables.length > 0 && (
        <div className="px-3 py-1.5 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder={_t("sidebar.search_tables")}
              className="h-7 text-xs pl-7 pr-2"
              aria-label={_t("sidebar.search_tables")}
            />
          </div>
        </div>
      )}
      <ScrollArea className="flex-1 min-h-0">
        {isLoading && tables.length === 0 ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-3 text-sm text-destructive">{error}</div>
        ) : filteredTables.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">{_t("sidebar.no_tables")}</div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {displayPrefix && (
              <div className="px-2 py-1 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wide select-none">
                {displayPrefix}
              </div>
            )}
            {filteredTables.map((table) => {
              const displayName =
                displayPrefix && table.name.startsWith(displayPrefix)
                  ? table.name.slice(displayPrefix.length)
                  : table.name

              return (
                <Tooltip key={table.name}>
                  <TooltipTrigger className="w-full" render={<span />}>
                    <Button
                      variant={selectedTable === table.name ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full flex-col items-start text-xs font-normal h-auto min-h-8 py-1.5 px-2 pointer-events-auto"
                      onClick={() => onSelectTable(table.name)}
                    >
                      <div className="w-full flex items-center gap-1">
                        <span className="truncate" title={table.name}>
                          {displayName}
                        </span>
                        <span className="text-muted-foreground ml-auto shrink-0 tabular-nums">
                          {formatRowCount(table.rowCount)}
                        </span>
                      </div>
                      {table.comment && (
                        <span
                          className="text-[10px] text-muted-foreground/60 italic leading-tight truncate w-full"
                          title={table.comment}
                        >
                          {table.comment}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {table.name} · {table.engine} · {formatRowCount(table.rowCount)}行
                    {table.comment && <> · {table.comment}</>}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </>
  )
}
