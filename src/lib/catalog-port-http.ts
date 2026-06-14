import type { CatalogPort, DatabaseInfo } from "./catalog"
import type { TableMeta, ColumnMeta } from "./types"

async function request<T>(url: string, options?: RequestInit): Promise<T> {
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

export class HttpCatalogPort implements CatalogPort {
  async listDatabases(): Promise<DatabaseInfo[]> {
    const json = await request<{ databases: { name: string; comment: string }[] }>("/api/databases")
    return json.databases
  }

  async listTables(database: string): Promise<TableMeta[]> {
    const params = database ? `?database=${encodeURIComponent(database)}` : ""
    const json = await request<{ tables: TableMeta[] }>(`/api/tables${params}`)
    return json.tables
  }

  async describeTable(database: string, table: string): Promise<ColumnMeta[]> {
    const params = database ? `?database=${encodeURIComponent(database)}` : ""
    const json = await request<{ columns: ColumnMeta[] }>(
      `/api/tables/${encodeURIComponent(table)}/schema${params}`
    )
    return json.columns
  }
}
