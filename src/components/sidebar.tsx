"use client"

import { useState, useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { useFieldRoleStore } from "@/stores/field-role"
import { useLang } from "@/components/lang-provider"
import { formatRowCount } from "@/lib/format"
import { unwrapNullable, resolveFieldRole, getNextFieldRole, createFieldRoleKey, type FieldRole } from "@/lib/column-type-classifier"
import { useCatalog } from "@/hooks/use-catalog"
import { SchemaFieldDraggable } from "./schema-field-draggable"
import { FieldRoleBadge } from "./field-role-badge"
import { Search } from "lucide-react"

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
  // Only count prefix if >50% of tables share it
  const matchCount = names.filter(n => n.startsWith(prefix)).length
  if (matchCount / names.length <= 0.5) return null
  // Find last underscore in prefix to keep meaningful group names
  const lastUnderscore = prefix.lastIndexOf("_")
  if (lastUnderscore > 0) return prefix.slice(0, lastUnderscore + 1)
  return prefix
}

export function Sidebar() {
  const { _t } = useLang()
  const {
    databases,
    tables,
    schema,
    selectedDatabase,
    selectedTable,
    isLoading,
    error,
    selectDatabase,
    selectTable,
  } = useCatalog()

  const tableMeta = tables.find((t) => t.name === selectedTable)
  const roleOverrides = useFieldRoleStore((s) => s.overrides)
  const setRoleOverride = useFieldRoleStore((s) => s.setOverride)
  const clearRoleOverride = useFieldRoleStore((s) => s.clearOverride)
  const [roleMenu, setRoleMenu] = useState<{
    column: string
    x: number
    y: number
  } | null>(null)

  const [schemaHeight, setSchemaHeight] = useState(384)

  // P1-8: Table search
  const [tableSearch, setTableSearch] = useState("")

  // P1-9: Common prefix detection
  const tableNames = useMemo(() => tables.map(t => t.name), [tables])
  const commonPrefix = useMemo(() => extractCommonPrefix(tableNames), [tableNames])

  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return tables
    const q = tableSearch.toLowerCase()
    return tables.filter(t => t.name.toLowerCase().includes(q))
  }, [tables, tableSearch])

  const displayPrefix = tableSearch.trim() ? null : commonPrefix

  return (
    <div className="flex flex-col h-full border-r border-border bg-muted/30">
      <div className="px-3 py-2 border-b border-border space-y-2">
        {databases.length > 0 && (
          <>
            <Tooltip>
              <TooltipTrigger className="w-full" render={<span />}>
                <select
                  value={selectedDatabase}
                  onChange={(e) => selectDatabase(e.target.value)}
                  aria-label="Database"
                  className="w-full text-xs rounded border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-ring truncate"
                >
                  {databases.map((db) => (
                    <option key={db.name} value={db.name} title={db.name}>
                      {db.name}
                    </option>
                  ))}
                </select>
              </TooltipTrigger>
              <TooltipContent side="right">{selectedDatabase}</TooltipContent>
            </Tooltip>
            {databases.find((d) => d.name === selectedDatabase)?.comment && (
              <div className="text-[10px] text-muted-foreground/80 leading-relaxed px-0.5">
                {_t("schema.data_source")}：{databases.find((d) => d.name === selectedDatabase)!.comment}
              </div>
            )}
          </>
        )}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {_t("sidebar.tables")}
        </h2>
      </div>

      {/* P1-8: Search input */}
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
          /* P0-3: Use text-muted-foreground for proper contrast */
          <div className="p-3 text-sm text-muted-foreground">
            {_t("sidebar.no_tables")}
          </div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {/* P1-9: Show common prefix as group header */}
            {displayPrefix && (
              <div className="px-2 py-1 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wide select-none">
                {displayPrefix}
              </div>
            )}
            {filteredTables.map((table) => {
              // P1-9: Strip prefix for display
              const displayName = displayPrefix && table.name.startsWith(displayPrefix)
                ? table.name.slice(displayPrefix.length)
                : table.name

              return (
                <Tooltip key={table.name}>
                  <TooltipTrigger className="w-full" render={<span />}>
                    <Button
                      variant={
                        selectedTable === table.name ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="w-full flex-col items-start text-xs font-normal h-auto min-h-8 py-1.5 px-2 pointer-events-auto"
                      onClick={() => selectTable(table.name)}
                    >
                      <div className="w-full flex items-center gap-1">
                        {/* P0-6: truncated text with title fallback */}
                        <span className="truncate" title={table.name}>{displayName}</span>
                        <span className="text-muted-foreground ml-auto shrink-0 tabular-nums">
                          {formatRowCount(table.rowCount)}
                        </span>
                      </div>
                      {table.comment && (
                        <span className="text-[10px] text-muted-foreground/60 italic leading-tight truncate w-full" title={table.comment}>
                          {table.comment}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {/* P1-9: Tooltip shows FULL name */}
                    {table.name} · {table.engine} · {formatRowCount(table.rowCount)}行
                    {table.comment && <> · {table.comment}</>}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {selectedTable && schema.length > 0 && (
        <>
          <div
            className="h-1 shrink-0 cursor-row-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault()
              const startY = e.clientY
              const startH = schemaHeight
              const onMove = (ev: MouseEvent) =>
                setSchemaHeight(Math.max(80, Math.min(600, startH - (ev.clientY - startY))))
              const onUp = () => {
                document.removeEventListener("mousemove", onMove)
                document.removeEventListener("mouseup", onUp)
              }
              document.addEventListener("mousemove", onMove)
              document.addEventListener("mouseup", onUp)
            }}
          />
          <div className="border-t border-border shrink-0 flex flex-col" style={{ height: schemaHeight }}>
            <div className="px-3 py-1.5 border-b border-border shrink-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {_t("tab.schema")}
              </h3>
            </div>
            {tableMeta && (
              <div className="shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-3 py-1.5 border-b border-border/50">
                  {/* P0-6: title on truncated table name */}
                  <span className="font-mono font-medium text-foreground truncate" title={tableMeta.name}>{tableMeta.name}</span>
                  <span>·</span>
                  <span className="font-mono shrink-0">{tableMeta.engine}</span>
                  <span>·</span>
                  <span className="shrink-0">{formatRowCount(tableMeta.rowCount)}行</span>
                </div>
                {tableMeta.comment && (
                  <div className="text-[10px] text-muted-foreground/70 italic leading-tight px-3 py-1 border-b border-border/30" title={tableMeta.comment}>
                    {tableMeta.comment}
                  </div>
                )}
              </div>
            )}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-1 py-0.5 space-y-0.5">
                {schema.map((col) => {
                  const resolvedRole = resolveFieldRole(
                    col.name, schema, roleOverrides,
                    selectedDatabase ?? "", selectedTable ?? ""
                  )
                  const fieldKey = selectedDatabase && selectedTable
                    ? createFieldRoleKey(selectedDatabase, selectedTable, col.name)
                    : ""
                  return (
                    <Tooltip key={col.name}>
                      <TooltipTrigger className="block w-full" render={<span />}>
                        <SchemaFieldDraggable
                          id={`schema:${fieldKey}`}
                          field={col.name}
                          role={resolvedRole?.role ?? null}
                          disabled={!resolvedRole}
                          label={`${_t("field.role.drag")} ${col.name}`}
                        >
                          {/* P0-6: title on truncated field name */}
                          <span className="font-medium truncate" title={col.name}>{col.name}</span>
                          {col.comment && (
                            <span className="text-[10px] text-muted-foreground/60 italic truncate min-w-0" title={col.comment}>
                              {col.comment}
                            </span>
                          )}
                          <span className="text-muted-foreground font-mono text-[10px] ml-auto shrink-0">
                            {unwrapNullable(col.type)}
                          </span>
                          {/* P0-4: Nullable as neutral badge with dot, not red */}
                          {col.type !== unwrapNullable(col.type) && (
                            <span className="text-[10px] text-muted-foreground shrink-0 inline-flex items-center gap-0.5">
                              <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/50" />
                              {_t("sidebar.nullable")}
                            </span>
                          )}
                          <FieldRoleBadge
                            role={resolvedRole?.role ?? null}
                            defaultRole={resolvedRole?.defaultRole ?? null}
                            isOverridden={resolvedRole?.isOverridden ?? false}
                            onToggle={(e) => {
                              e.stopPropagation()
                              if (!selectedDatabase || !selectedTable || !resolvedRole) return
                              setRoleOverride(
                                selectedDatabase,
                                selectedTable,
                                col.name,
                                getNextFieldRole(resolvedRole.role)
                              )
                            }}
                            onOpenMenu={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (!resolvedRole) return
                              setRoleMenu({ column: col.name, x: e.clientX, y: e.clientY })
                            }}
                            label={_t}
                          />
                        </SchemaFieldDraggable>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {col.name}
                        {col.comment && <> · {col.comment}</>}
                        <span className="text-muted-foreground font-mono ml-1">
                          {unwrapNullable(col.type)}
                        </span>
                        {/* P0-4: Nullable in tooltip also neutral */}
                        {col.type !== unwrapNullable(col.type) && (
                          <span className="text-muted-foreground ml-0.5">
                            · {_t("sidebar.nullable")}
                          </span>
                        )}
                        {resolvedRole && (
                          <span className="ml-1">
                            · {_t("field.role.current")}：{_t(`field.role.${resolvedRole.role}`)}
                            （{_t("field.role.default")}：{_t(`field.role.${resolvedRole.defaultRole}`)}）
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </ScrollArea>
            {roleMenu && selectedDatabase && selectedTable && (
              <div
                className="fixed z-50 min-w-28 rounded-md border border-border bg-popover p-1 text-xs shadow-md"
                style={{ left: roleMenu.x, top: roleMenu.y }}
                onMouseLeave={() => setRoleMenu(null)}
              >
                {(["dimension", "indicator"] as FieldRole[]).map((role) => (
                  <button
                    key={role}
                    className="block w-full rounded px-2 py-1 text-left hover:bg-muted"
                    onClick={() => {
                      setRoleOverride(selectedDatabase, selectedTable, roleMenu.column, role)
                      setRoleMenu(null)
                    }}
                  >
                    {_t(`field.role.menu.set_${role}`)}
                  </button>
                ))}
                <button
                  className="block w-full rounded px-2 py-1 text-left text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    clearRoleOverride(selectedDatabase, selectedTable, roleMenu.column)
                    setRoleMenu(null)
                  }}
                >
                  {_t("field.role.menu.reset")}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
