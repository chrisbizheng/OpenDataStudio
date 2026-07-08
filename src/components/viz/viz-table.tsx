"use client"

import { useMemo } from "react"
import { DataGrid } from "@/components/data-grid"
import type { ColumnMeta } from "@/lib/types"

interface VizTableProps {
  columns: string[]
  rows: unknown[][]
}

export function VizTable({ columns, rows }: VizTableProps) {
  const schema: ColumnMeta[] = useMemo(
    () => columns.map((name) => ({ name, type: "", comment: "" })),
    [columns]
  )

  return (
    <div className="h-full">
      <DataGrid columns={columns} rows={rows} schema={schema} />
    </div>
  )
}
