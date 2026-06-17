import { buildDistinctFilterValuesSQL } from "@/lib/sql-utils"

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { values: unknown[]; ts: number }>()

function cacheKey(database: string, table: string, column: string): string {
  return `${database}.${table}.${column}`
}

function getCached(key: string): unknown[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.values
}

/**
 * Fetch distinct values for a column. Caller supplies executor (raw fetch or queryEngine).
 * Returns raw row[0] values (unknown[]). Callers needing string[] should `.map(String)`.
 * 60s TTL shared cache keyed by database.table.column.
 */
export async function fetchDistinctValues(
  database: string,
  table: string,
  column: string,
  executor: (sql: string, db: string) => Promise<{ rows: unknown[][] } | null>,
): Promise<unknown[]> {
  const key = cacheKey(database, table, column)
  const cached = getCached(key)
  if (cached) return cached

  const sql = buildDistinctFilterValuesSQL(database, table, column)
  const result = await executor(sql, database)
  if (!result) return []
  const values = result.rows.map((row) => row[0])
  cache.set(key, { values, ts: Date.now() })
  return values
}

/**
 * Default executor that POSTs to /api/query (used by dashboard-filter-bar).
 */
export async function fetchViaApiQuery(
  sql: string,
  _db: string,
): Promise<{ rows: unknown[][] } | null> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  })
  const json = await res.json()
  return { rows: json.rows ?? [] }
}
