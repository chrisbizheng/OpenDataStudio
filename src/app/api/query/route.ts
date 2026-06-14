import { NextRequest, NextResponse } from "next/server"
import { executeReadOnly } from "@/lib/clickhouse"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

    log.debug({ sql: sql.slice(0, 200), db: database }, "query:start")

    const result = await executeReadOnly(sql, database || undefined)
    log.info({ sql: sql.slice(0, 100), rows: result.rows.length, cols: result.columns.length }, "query:done")
    return NextResponse.json(result)
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Query execution failed"
    log.error({ err: message }, "query:error")

    if (message.startsWith("Only SELECT")) {
      return NextResponse.json(
        { error: "forbidden", message },
        { status: 403 }
      )
    }

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
