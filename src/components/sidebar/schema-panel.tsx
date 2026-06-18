"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useFieldRoleStore } from "@/stores/field-role"
import { useLang } from "@/components/lang-provider"
import { formatRowCount } from "@/lib/format"
import {
  unwrapNullable,
  resolveFieldRole,
  getNextFieldRole,
  type FieldRole,
} from "@/lib/column-type-classifier"
import type { TableMeta, ColumnMeta } from "@/lib/types"
import { FieldRoleBadge } from "./field-role-badge"

export function SchemaPanel({
  schema,
  tableMeta,
  selectedDatabase,
  selectedTable,
}: {
  schema: ColumnMeta[]
  tableMeta: TableMeta | undefined
  selectedDatabase: string
  selectedTable: string
}) {
  const { _t } = useLang()
  const overrides = useFieldRoleStore((s) => s.overrides)
  const setRoleOverride = useFieldRoleStore((s) => s.setOverride)
  const clearRoleOverride = useFieldRoleStore((s) => s.clearOverride)
  const [schemaHeight, setSchemaHeight] = useState(384)
  const [roleMenu, setRoleMenu] = useState<{ column: string; x: number; y: number } | null>(null)

  if (!selectedTable) return null

  if (schema.length === 0) {
    return (
      <>
        <div
          className="h-1 shrink-0 cursor-row-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
        />
        <div className="border-t border-border shrink-0 flex flex-col" style={{ height: schemaHeight }}>
          <div className="px-3 py-1.5 border-b border-border shrink-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {_t("tab.schema")}
            </h3>
          </div>
          <div className="px-3 py-2 space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
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
                col.name, schema, overrides,
                selectedDatabase, selectedTable
              )
              return (
                <Tooltip key={col.name}>
                  <TooltipTrigger className="block w-full" render={<span />}>
                    <div
                      className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded hover:bg-muted/50 pointer-events-auto"
                      role="button"
                      aria-label={`${_t("field.role.drag")} ${col.name}`}
                    >
                      <span className="font-medium truncate" title={col.name}>{col.name}</span>
                      {col.comment && (
                        <span className="text-[10px] text-muted-foreground/60 italic truncate min-w-0" title={col.comment}>
                          {col.comment}
                        </span>
                      )}
                      <span className="text-muted-foreground font-mono text-[10px] ml-auto shrink-0">
                        {unwrapNullable(col.type)}
                      </span>
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
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {col.name}
                    {col.comment && <> · {col.comment}</>}
                    <span className="text-muted-foreground font-mono ml-1">
                      {unwrapNullable(col.type)}
                    </span>
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
  )
}
