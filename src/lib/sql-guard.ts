/**
 * Pure SQL string analysis — no ClickHouse connection needed.
 * Security boundary: enforces read-only statements (SELECT/SHOW/DESCRIBE/EXPLAIN/WITH).
 */

const READ_ONLY_PREFIXES = ["SELECT", "SHOW", "DESCRIBE", "EXPLAIN", "WITH"]

export function extractFirstStatement(sql: string): string {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("--"))[0] || sql
}

export function isReadOnlySql(sql: string): boolean {
  const singleSql = extractFirstStatement(sql)
  const trimmed = singleSql.trim().toUpperCase()
  return READ_ONLY_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
}
