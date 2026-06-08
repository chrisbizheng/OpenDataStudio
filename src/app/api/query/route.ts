import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/clickhouse"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED_PREFIXES = ["SELECT", "SHOW", "DESCRIBE", "EXPLAIN", "WITH"]

export async function POST(request: NextRequest) {
  const traceId = request.headers.get("x-trace-id") || crypto.randomUUID()
  const log = logger.child({ traceId, route: "query" })

  try {
    const { sql, database } = await request.json()

    if (!sql || typeof sql !== "string") {
      log.warn({ sql }, "query:invalid")
      return NextResponse.json(
        { error: "invalid_request", message: "Missing or invalid 'sql' field" },
        { status: 400 }
      )
    }

    const trimmedSql = sql.trim().toUpperCase()
    const isAllowed = ALLOWED_PREFIXES.some((prefix) => trimmedSql.startsWith(prefix))
    if (!isAllowed) {
      log.warn({ sql: sql.slice(0, 100) }, "query:forbidden")
      return NextResponse.json(
        { error: "forbidden", message: "Only SELECT, SHOW, DESCRIBE, EXPLAIN, and WITH statements are allowed" },
        { status: 403 }
      )
    }

    log.debug({ sql: sql.slice(0, 200), db: database }, "query:start")
    const result = await query(sql, undefined, database || undefined)
    log.info({ sql: sql.slice(0, 100), rows: result.rows.length, cols: result.columns.length }, "query:done")
    return NextResponse.json(result)
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Query execution failed"
    log.error({ err: message }, "query:error")

    if (message.includes("DB::Exception")) {
      const clean = message.replace(/^.*DB::Exception:\s*/, "").replace(/\n.*$/, "")
      return NextResponse.json(
        { error: "sql_error", message: clean },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "query_failed", message },
      { status: 500 }
    )
  }
}
