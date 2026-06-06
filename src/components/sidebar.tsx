"use client"

import { useEffect, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useDatasetStore } from "@/stores/dataset"
import { useLang } from "@/components/lang-provider"
import type { TableMeta, ColumnMeta } from "@/lib/clickhouse"

function formatRowCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function Sidebar() {
  const { _t } = useLang()
  const {
    databases,
    selectedDatabase,
    tables,
    selectedTable,
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
  } = useDatasetStore()

  const loadTables = useCallback(
    async (db: string) => {
      setLoading(true)
      setError(null)
      setSelectedTable(null)
      setSchema([])
      try {
        const params = db ? `?database=${encodeURIComponent(db)}` : ""
        const tablesRes = await fetch(`/api/tables${params}`)
        if (!tablesRes.ok) throw new Error(await tablesRes.text())
        const { tables: tableList } = (await tablesRes.json()) as {
          tables: TableMeta[]
        }
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
        const dbsRes = await fetch("/api/databases")
        if (!dbsRes.ok) return
        const { databases: dbList } = (await dbsRes.json()) as {
          databases: { name: string; comment: string }[]
        }
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
      const params = selectedDatabase
        ? `?database=${encodeURIComponent(selectedDatabase)}`
        : ""
      const res = await fetch(
        `/api/tables/${encodeURIComponent(name)}/schema${params}`
      )
      if (!res.ok) throw new Error()
      const { columns } = (await res.json()) as { columns: ColumnMeta[] }
      setSchema(columns)
    } catch {
      setSchema([])
    }
  }

  return (
    <div className="flex flex-col h-full border-r border-border bg-muted/30">
      <div className="px-3 py-2 border-b border-border space-y-2">
        {databases.length > 0 && (
          <select
            value={selectedDatabase}
            onChange={(e) => setSelectedDatabase(e.target.value)}
            className="w-full text-xs rounded border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-ring"
          >
            {databases.map((db) => (
              <option key={db.name} value={db.name}>
                {db.name}
              </option>
            ))}
          </select>
        )}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {_t("sidebar.tables")}
        </h2>
      </div>
      <ScrollArea className="flex-1">
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
              <Button
                key={table.name}
                variant={
                  selectedTable === table.name ? "secondary" : "ghost"
                }
                size="sm"
                className="w-full justify-between text-xs font-normal h-8 px-2"
                onClick={() => handleSelectTable(table.name)}
              >
                <span className="truncate">{table.name}</span>
                <span className="text-muted-foreground ml-2 shrink-0 tabular-nums">
                  {formatRowCount(table.rowCount)}
                </span>
              </Button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
