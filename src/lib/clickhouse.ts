import { createClient } from "@clickhouse/client"
import { format } from "sql-formatter"
export type { TableMeta, ColumnMeta, QueryResult } from "./types"
import type { TableMeta, ColumnMeta, QueryResult } from "./types"

export interface ClassifiedError {
  kind: "forbidden" | "sql_error" | "timeout" | "connection" | "unknown"
  message: string
  statusCode: number
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

export function formatSql(sql: string): string {
  try {
    return format(sql, { language: "clickhouse", tabWidth: 2, keywordCase: "upper" })
  } catch {
    return sql
  }
}

export function classifyError(e: unknown): ClassifiedError {
  const message = e instanceof Error ? e.message : "Query execution failed"

  if (message.startsWith("Only SELECT")) {
    return { kind: "forbidden", message, statusCode: 403 }
  }

  if (message.includes("DB::Exception")) {
    const clean = message.replace(/^.*DB::Exception:\s*/, "").replace(/\n.*$/, "")
    return { kind: "sql_error", message: clean, statusCode: 400 }
  }

  if (message.includes("Timeout") || message.includes("max_execution_time")) {
    return { kind: "timeout", message: "Query exceeded the 30-second time limit. Add LIMIT or filter conditions.", statusCode: 408 }
  }

  if (message.includes("ECONNREFUSED") || message.includes("connect")) {
    return { kind: "connection", message, statusCode: 502 }
  }

  return { kind: "unknown", message, statusCode: 500 }
}

export async function executeReadOnly(
  sql: string,
  database?: string
): Promise<QueryResult> {
  const singleSql = extractFirstStatement(sql)

  if (!isReadOnlySql(singleSql)) {
    throw new Error("Only SELECT, SHOW, DESCRIBE, EXPLAIN, and WITH statements are allowed")
  }

  return query(singleSql, undefined, database)
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
