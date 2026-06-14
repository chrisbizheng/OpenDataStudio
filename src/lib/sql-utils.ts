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
