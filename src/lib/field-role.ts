import { isDimensionType, isIndicatorType } from "./column-utils"
import type { ColumnMeta } from "./types"

export type FieldRole = "dimension" | "indicator"

export interface ResolvedFieldRole {
  role: FieldRole
  defaultRole: FieldRole
  isOverridden: boolean
}

const KEY_SEPARATOR = "\u0000"

export function createFieldRoleKey(
  database: string,
  table: string,
  column: string
): string {
  return [database, table, column].map(encodeURIComponent).join(KEY_SEPARATOR)
}

export function parseFieldRoleKey(key: string): {
  database: string
  table: string
  column: string
} {
  const [database, table, column] = key.split(KEY_SEPARATOR).map(decodeURIComponent)
  return { database, table, column }
}

export function getNextFieldRole(role: FieldRole): FieldRole {
  return role === "dimension" ? "indicator" : "dimension"
}

export function inferDefaultFieldRole(type: string): FieldRole | null {
  if (isDimensionType(type)) return "dimension"
  if (isIndicatorType(type)) return "indicator"
  return null
}

export function getFieldRole(
  type: string,
  override?: FieldRole
): ResolvedFieldRole | null {
  const defaultRole = inferDefaultFieldRole(type)
  if (!defaultRole) return null
  return {
    role: override ?? defaultRole,
    defaultRole,
    isOverridden: Boolean(override),
  }
}

export function resolveFieldRole(
  field: string,
  schema: ColumnMeta[],
  overrides: Record<string, FieldRole>,
  database: string,
  table: string
): ResolvedFieldRole | null {
  const meta = schema.find((s) => s.name === field)
  if (!meta) return null
  const key = createFieldRoleKey(database, table, field)
  const override = overrides[key]
  return getFieldRole(meta.type, override)
}
