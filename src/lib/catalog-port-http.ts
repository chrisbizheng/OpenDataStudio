import type { CatalogPort, DatabaseInfo } from "./catalog"
import type { TableMeta, ColumnMeta } from "./types"
import { fetchJson } from "./fetch-json"

export class HttpCatalogPort implements CatalogPort {
  async listDatabases(): Promise<DatabaseInfo[]> {
    const json = await fetchJson<{ databases: { name: string; comment: string }[] }>("/api/databases")
    return json.databases
  }

  async listTables(database: string): Promise<TableMeta[]> {
    const params = database ? `?database=${encodeURIComponent(database)}` : ""
    const json = await fetchJson<{ tables: TableMeta[] }>(`/api/tables${params}`)
    return json.tables
  }

  async describeTable(database: string, table: string): Promise<ColumnMeta[]> {
    const params = database ? `?database=${encodeURIComponent(database)}` : ""
    const json = await fetchJson<{ columns: ColumnMeta[] }>(
      `/api/tables/${encodeURIComponent(table)}/schema${params}`
    )
    return json.columns
  }
}
