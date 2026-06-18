"use client"

import { useCatalog } from "@/hooks/use-catalog"
import { DatabasePicker } from "./database-picker"
import { TableList } from "./table-list"
import { SchemaPanel } from "./schema-panel"

export function Sidebar() {
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

  return (
    <div className="flex flex-col h-full border-r border-border bg-muted/30">
      <DatabasePicker
        databases={databases}
        selectedDatabase={selectedDatabase}
        onSelectDatabase={selectDatabase}
      />
      <TableList
        tables={tables}
        selectedTable={selectedTable}
        isLoading={isLoading}
        error={error}
        onSelectTable={selectTable}
      />
      <SchemaPanel
        schema={schema}
        tableMeta={tableMeta}
        selectedDatabase={selectedDatabase ?? ""}
        selectedTable={selectedTable ?? ""}
      />
    </div>
  )
}
