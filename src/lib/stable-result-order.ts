import { unwrapNullable } from "@/lib/column-utils"
import type { ColumnMeta } from "@/lib/types"
import { escapeField } from "./sql-utils"

export interface StableOrder {
  field: string
  direction: "ASC" | "DESC"
}

const TIME_NAME_PATTERN = /^(event_time|timestamp|created_at|date|time)$/i
const ID_NAME_PATTERN = /(^id$|_id$)/i

export function inferStableOrder(schema: Pick<ColumnMeta, "name" | "type">[]): StableOrder | null {
  const timeField = schema.find((field) => {
    const type = unwrapNullable(field.type)
    return /^(Date|DateTime)/.test(type) && TIME_NAME_PATTERN.test(field.name)
  })
  if (timeField) return { field: timeField.name, direction: "DESC" }
  const idField = schema.find((field) => ID_NAME_PATTERN.test(field.name))
  if (idField) return { field: idField.name, direction: "ASC" }
  return null
}

export function buildNextResultWindowSql(
  database: string,
  table: string,
  stableOrder: StableOrder | null,
  offset: number,
  limit = 1000
): string {
  const qualified = `${escapeField(database)}.${escapeField(table)}`
  const orderBy = stableOrder ? ` ORDER BY ${escapeField(stableOrder.field)} ${stableOrder.direction}` : ""
  return `SELECT * FROM ${qualified}${orderBy} LIMIT ${limit} OFFSET ${offset}`
}
