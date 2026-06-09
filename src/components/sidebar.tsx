"use client"

import { useEffect, useCallback, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react"
import { useShallow } from "zustand/react/shallow"
import { useDraggable } from "@dnd-kit/core"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { useDatasetStore } from "@/stores/dataset"
import { useFieldRoleStore } from "@/stores/field-role"
import { useLang } from "@/components/lang-provider"
import { formatRowCount } from "@/lib/format"
import { fetchDatabases, fetchTables, fetchTableSchema } from "@/lib/api-client"
import { createFieldRoleKey, getFieldRole, getNextFieldRole, type FieldRole } from "@/lib/field-role"

export function Sidebar() {
  const { _t } = useLang()
  const {
    databases,
    selectedDatabase,
    tables,
    selectedTable,
    schema,
    isLoading,
    error,
    setDatabases,
    setSelectedDatabase,
    setTables,
    setSelectedTable,
    setSchema,
    setTotalRows,
    setConnected,
    setLoading,
    setError,
    selectDatabase,
  } = useDatasetStore(useShallow((s) => ({
    databases: s.databases,
    selectedDatabase: s.selectedDatabase,
    tables: s.tables,
    selectedTable: s.selectedTable,
    schema: s.schema,
    isLoading: s.isLoading,
    error: s.error,
    setDatabases: s.setDatabases,
    setSelectedDatabase: s.setSelectedDatabase,
    setTables: s.setTables,
    setSelectedTable: s.setSelectedTable,
    setSchema: s.setSchema,
    setTotalRows: s.setTotalRows,
    setConnected: s.setConnected,
    setLoading: s.setLoading,
    setError: s.setError,
    selectDatabase: s.selectDatabase,
  })))

  const loadTables = useCallback(
    async (db: string) => {
      setLoading(true)
      setError(null)
      setSelectedTable(null)
      setSchema([])
      try {
        const tableList = await fetchTables(db)
        const total = tableList.reduce((s, t) => s + t.rowCount, 0)
        setTables(tableList)
        setTotalRows(total)
        setConnected(true)
      } catch (e) {
        setConnected(false)
        setError(
          e instanceof Error
            ? e.message
            : "Failed to connect to ClickHouse"
        )
      } finally {
        setLoading(false)
      }
    },
    [setTables, setTotalRows, setConnected, setLoading, setError, setSelectedTable, setSchema]
  )

  useEffect(() => {
    async function init() {
      try {
        const dbList = await fetchDatabases()
        setDatabases(dbList)
        const db =
          selectedDatabase || dbList[0]?.name || ""
        if (db) setSelectedDatabase(db)
      } catch {
        // databases unavailable
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (selectedDatabase) {
      loadTables(selectedDatabase)
    }
  }, [selectedDatabase, loadTables])

  async function handleSelectTable(name: string) {
    setSelectedTable(name)
    try {
      const columns = await fetchTableSchema(name, selectedDatabase ?? undefined)
      setSchema(columns)
    } catch {
      setSchema([])
    }
  }

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

  return (
    <div className="flex flex-col h-full border-r border-border bg-muted/30">
      <div className="px-3 py-2 border-b border-border space-y-2">
        {databases.length > 0 && (
          <>
            <select
              value={selectedDatabase}
              onChange={(e) => selectDatabase(e.target.value)}
              aria-label="Database"
              className="w-full text-xs rounded border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-ring"
            >
              {databases.map((db) => (
                <option key={db.name} value={db.name}>
                  {db.name}
                </option>
              ))}
            </select>
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
      <ScrollArea className="flex-1 min-h-0">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-3 text-sm text-destructive">{error}</div>
        ) : tables.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">
            {_t("sidebar.no_tables")}
          </div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {tables.map((table) => (
              <Tooltip key={table.name}>
                <TooltipTrigger className="w-full" render={<span />}>
                  <Button
                    variant={
                      selectedTable === table.name ? "secondary" : "ghost"
                    }
                    size="sm"
                    className="w-full flex-col items-start text-xs font-normal h-auto min-h-8 py-1.5 px-2 pointer-events-auto"
                    onClick={() => handleSelectTable(table.name)}
                  >
                    <div className="w-full flex items-center gap-1">
                      <span className="truncate">{table.name}</span>
                      <span className="text-muted-foreground ml-auto shrink-0 tabular-nums">
                        {formatRowCount(table.rowCount)}
                      </span>
                    </div>
                    {table.comment && (
                      <span className="text-[10px] text-muted-foreground/60 italic leading-tight truncate w-full">
                        {table.comment}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {table.engine} · {formatRowCount(table.rowCount)}行
                  {table.comment && <> · {table.comment}</>}
                </TooltipContent>
              </Tooltip>
            ))}
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
                  <span className="font-mono font-medium text-foreground truncate">{tableMeta.name}</span>
                  <span>·</span>
                  <span className="font-mono shrink-0">{tableMeta.engine}</span>
                  <span>·</span>
                  <span className="shrink-0">{formatRowCount(tableMeta.rowCount)}行</span>
                </div>
                {tableMeta.comment && (
                  <div className="text-[10px] text-muted-foreground/70 italic leading-tight px-3 py-1 border-b border-border/30">
                    {tableMeta.comment}
                  </div>
                )}
              </div>
            )}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-1 py-0.5 space-y-0.5">
                {schema.map((col) => {
                  const key = selectedDatabase && selectedTable
                    ? createFieldRoleKey(selectedDatabase, selectedTable, col.name)
                    : ""
                  const resolvedRole = getFieldRole(col.type, key ? roleOverrides[key] : undefined)
                  return (
                    <Tooltip key={col.name}>
                      <TooltipTrigger className="block w-full" render={<span />}>
                        <SchemaFieldDraggable
                          id={`schema:${key}`}
                          field={col.name}
                          role={resolvedRole?.role ?? null}
                          disabled={!resolvedRole}
                          label={`${_t("field.role.drag")} ${col.name}`}
                        >
                          <span className="font-medium truncate">{col.name}</span>
                          {col.comment && (
                            <span className="text-[10px] text-muted-foreground/60 italic truncate min-w-0">
                              {col.comment}
                            </span>
                          )}
                          <span className="text-muted-foreground font-mono text-[10px] ml-auto shrink-0">
                            {col.type.replace(/^Nullable\((.+)\)$/, "$1")}
                          </span>
                          {col.type.startsWith("Nullable(") && (
                            <span className="text-[10px] text-destructive/70 shrink-0">nullable</span>
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
                          {col.type.replace(/^Nullable\((.+)\)$/, "$1")}
                        </span>
                        {col.type.startsWith("Nullable(") && (
                          <span className="text-destructive/70 ml-0.5">nullable</span>
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

function SchemaFieldDraggable({
  id,
  field,
  role,
  disabled,
  label,
  children,
}: {
  id: string
  field: string
  role: FieldRole | null
  disabled: boolean
  label: string
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled,
    data: { source: "schema", field, role },
  })

  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded hover:bg-muted/50 pointer-events-auto"
      {...attributes}
      {...listeners}
      role="button"
      aria-label={label}
      aria-grabbed={isDragging}
    >
      {children}
    </div>
  )
}

function FieldRoleBadge({
  role,
  defaultRole,
  isOverridden,
  onToggle,
  onOpenMenu,
  label,
}: {
  role: FieldRole | null
  defaultRole: FieldRole | null
  isOverridden: boolean
  onToggle: (event: ReactMouseEvent<HTMLButtonElement>) => void
  onOpenMenu: (event: ReactMouseEvent<HTMLButtonElement>) => void
  label: (key: string) => string
}) {
  const text = role === "dimension" ? "D" : role === "indicator" ? "I" : "—"
  const roleLabel = role ? label(`field.role.${role}`) : label("field.role.unmarkable")
  const defaultLabel = defaultRole ? label(`field.role.${defaultRole}`) : label("field.role.unmarkable")
  const className = role
    ? isOverridden
      ? role === "dimension"
        ? "border-blue-500/50 bg-blue-500/10 text-blue-600"
        : "border-orange-500/50 bg-orange-500/10 text-orange-600"
      : "border-transparent bg-muted text-muted-foreground"
    : "border-transparent text-muted-foreground/40"

  return (
    <button
      type="button"
      disabled={!role}
      aria-label={`${label("field.role.current")}：${roleLabel}`}
      title={`${label("field.role.current")}：${roleLabel} · ${label("field.role.default")}：${defaultLabel}${isOverridden ? ` · ${label("field.role.overridden")}` : ""}`}
      onClick={onToggle}
      onContextMenu={onOpenMenu}
      className={`h-4 min-w-4 rounded border px-1 text-[9px] leading-3 shrink-0 ${className}`}
    >
      {text}
    </button>
  )
}
