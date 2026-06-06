import { createClient } from "@clickhouse/client"

export interface TableMeta {
  name: string
  rowCount: number
  engine: string
  comment?: string
}

export interface ColumnMeta {
  name: string
  type: string
  comment?: string
}

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
  stats: { elapsed: number; rowsRead: number; bytesRead: number }
}

let client: ReturnType<typeof createClient> | null = null

function getClient() {
  if (!client) {
    const host = process.env.CLICKHOUSE_HOST || "127.0.0.1"
    const port = process.env.CLICKHOUSE_PORT || "8123"
    const protocol = host.startsWith("http") ? "" : "http://"

    client = createClient({
      url: `${protocol}${host}:${port}`,
      username: process.env.CLICKHOUSE_USER || "default",
      password: process.env.CLICKHOUSE_PASSWORD || "",
      clickhouse_settings: {
        max_execution_time: 30,
      },
    })
  }
  return client
}

function qualify(db: string | undefined, table: string): string {
  return db ? `${db}.${table}` : table
}

export async function getDatabases(): Promise<{ name: string; comment: string }[]> {
  const c = getClient()
  const result = await c.query({
    query: `SELECT name, comment FROM system.databases WHERE name NOT IN ('system', 'INFORMATION_SCHEMA', 'information_schema') ORDER BY name`,
    format: "JSONEachRow",
  })
  return (await result.json()) as { name: string; comment: string }[]
}

export async function getTables(database?: string): Promise<TableMeta[]> {
  const c = getClient()
  const db = database || process.env.CLICKHOUSE_DB || "default"
  const result = await c.query({
    query: `
      SELECT
        name,
        total_rows AS rowCount,
        engine,
        comment
      FROM system.tables
      WHERE database = {db:String}
        AND total_rows > 0
      ORDER BY total_rows DESC
    `,
    format: "JSONEachRow",
    query_params: { db },
  })
  return (await result.json()) as TableMeta[]
}

export async function getTableSchema(table: string, database?: string): Promise<ColumnMeta[]> {
  const c = getClient()
  const db = database || process.env.CLICKHOUSE_DB || "default"
  const result = await c.query({
    query: `
      SELECT
        name,
        type,
        comment
      FROM system.columns
      WHERE database = {db:String}
        AND table = {table:String}
      ORDER BY position
    `,
    format: "JSONEachRow",
    query_params: { db, table },
  })
  return (await result.json()) as ColumnMeta[]
}

export async function query(
  sql: string,
  params?: Record<string, unknown>,
  database?: string
): Promise<QueryResult> {
  const c = getClient()
  const start = performance.now()
  const result = await c.query({
    query: sql,
    format: "JSONEachRow",
    query_params: params,
  })
  const elapsed = (performance.now() - start) / 1000

  const rows = (await result.json()) as Record<string, unknown>[]
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []

  return {
    columns,
    rows: rows.map((r) => columns.map((c) => r[c])),
    stats: {
      elapsed: Math.round(elapsed * 100) / 100,
      rowsRead: rows.length,
      bytesRead: 0,
    },
  }
}

export async function getTotalRowCount(database?: string): Promise<number> {
  const c = getClient()
  const db = database || process.env.CLICKHOUSE_DB || "default"
  const result = await c.query({
    query: `
      SELECT sum(total_rows) AS total
      FROM system.tables
      WHERE database = {db:String}
    `,
    format: "JSONEachRow",
    query_params: { db },
  })
  const rows = (await result.json()) as { total: number }[]
  return rows[0]?.total ?? 0
}
