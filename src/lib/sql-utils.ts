export function escapeField(name: string): string {
  return `\`${name.replace(/`/g, "``")}\``
}

const VALID_DIRECTIONS = new Set(["ASC", "DESC"])

export function validateDirection(dir: string): "ASC" | "DESC" {
  const upper = dir.toUpperCase()
  if (!VALID_DIRECTIONS.has(upper)) throw new Error(`Invalid SQL direction: ${dir}`)
  return upper as "ASC" | "DESC"
}

export function escapeValue(value: unknown): string {
  const s = String(value ?? "")
  const escaped = s.replace(/'/g, "''")
  return `'${escaped}'`
}

export function escapeLikeValue(value: unknown): string {
  const s = String(value ?? "")
  const escaped = s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
  return `'${escaped}'`
}

export function buildDistinctFilterValuesSQL(
  database: string,
  table: string,
  field: string
): string {
  const f = escapeField(field)
  return [
    `SELECT DISTINCT ${f} AS \`value\``,
    `FROM ${escapeField(database)}.${escapeField(table)}`,
    `WHERE ${f} IS NOT NULL`,
    `ORDER BY ${f}`,
    "LIMIT 200",
  ].join("\n")
}

export function fixConcatSql(sql: string): string | null {
  if (!/\bconcat\s*\(/i.test(sql)) return null
  const groupMatch = sql.match(/\bGROUP\s+BY\b\s+([\s\S]+?)(?:\bORDER\b|\bLIMIT\b|\bHAVING\b|\bUNION\b|$)/i)
  if (!groupMatch) return null
  const groupCols = groupMatch[1].split(",").map((c) => c.trim().replace(/^`|`$/g, "").replace(/\s+AS\s+\S+$/i, "").trim()).filter(Boolean)
  if (groupCols.length < 2) return null
  const selectMatch = sql.match(/\bSELECT\b\s+([\s\S]+?)\s+\bFROM\b/i)
  if (!selectMatch) return null
  const selectBody = selectMatch[1]
  const concatMatch = selectBody.match(/\bconcat\s*\([^)]+\)\s+AS\s+(\w+)/i)
  if (!concatMatch) return null
  const newSelect = selectBody.replace(concatMatch[0], groupCols.join(", "))
  return sql.replace(selectBody, newSelect)
}

