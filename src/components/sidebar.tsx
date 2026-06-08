"use client"

import { useEffect, useCallback, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { useDatasetStore } from "@/stores/dataset"
import { useLang } from "@/components/lang-provider"
import { formatRowCount } from "@/lib/format"
import { fetchDatabases, fetchTables, fetchTableSchema } from "@/lib/api-client"

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
                {schema.map((col) => (
                  <Tooltip key={col.name}>
                    <TooltipTrigger className="block w-full" render={<span />}>
                      <div className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded hover:bg-muted/50 pointer-events-auto">
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
                      </div>
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
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  )
}
