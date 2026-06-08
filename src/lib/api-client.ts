import type { TableMeta, ColumnMeta, QueryResult } from "@/lib/clickhouse"

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

async function request<T>(
  url: string,
  options?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error(err.message || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function fetchDatabases(): Promise<{ name: string; comment: string }[]> {
  const json = await request<{ databases: { name: string; comment: string }[] }>("/api/databases")
  return json.databases
}

export async function fetchTables(database: string): Promise<TableMeta[]> {
  const params = database ? `?database=${encodeURIComponent(database)}` : ""
  const json = await request<{ tables: TableMeta[] }>(`/api/tables${params}`)
  return json.tables
}

export async function fetchTableSchema(
  table: string,
  database?: string
): Promise<ColumnMeta[]> {
  const params = database ? `?database=${encodeURIComponent(database)}` : ""
  const json = await request<{ columns: ColumnMeta[] }>(
    `/api/tables/${encodeURIComponent(table)}/schema${params}`
  )
  return json.columns
}

export async function executeQuery(
  sql: string,
  database?: string,
  signal?: AbortSignal
): Promise<QueryResult> {
  return request<QueryResult>("/api/query", {
    method: "POST",
    body: JSON.stringify({ sql, database }),
    signal,
  })
}

export function buildLlmHeaders(config: {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
}): Record<string, string> {
  if (!config.apiKey) return {}
  return { "x-llm-config": btoa(JSON.stringify(config)) }
}
