import type { ColumnMeta } from "@/lib/clickhouse"

export interface GridColumnMeta {
  name: string
  type?: string
  comment?: string
}

export function buildGridColumns(
  columns: string[],
  schema: ColumnMeta[]
): GridColumnMeta[] {
  const metaByName = new Map(schema.map((field) => [field.name, field]))
  return columns.map((name) => {
    const meta = metaByName.get(name)
    return {
      name,
      type: meta?.type,
      comment: meta?.comment,
    }
  })
}
