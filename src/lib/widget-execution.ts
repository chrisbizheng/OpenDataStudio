/**
 * Widget SQL execution — shared fetch+parse for dashboard widget queries.
 *
 * Extracted from chart-widget-renderer.tsx (handleRefresh) and
 * create-widget-sql-dialog.tsx (handleRunSql) which had identical
 * fetch /api/query → parse JSON → build QueryResult patterns.
 */
import type { QueryResult } from "@/lib/widget-cache"

/**
 * Execute a SQL query via the /api/query route and return a QueryResult
 * suitable for widget cache storage.
 *
 * @throws Error if the API returns a non-OK status or the response is malformed.
 */
export async function executeWidgetQuery(sql: string): Promise<QueryResult> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Query failed")
  return {
    columns: json.columns,
    rows: json.rows,
    fetchedAt: Date.now(),
  }
}
