import { NextRequest, NextResponse } from "next/server"
import { executeReadOnly, classifyError } from "@/lib/clickhouse"
import { logger } from "@/lib/logger"
import { getTraceId } from "@/lib/trace-id"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request)
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
    const classified = classifyError(e)
    log.error({ err: classified.message }, "query:error")
    return NextResponse.json(
      { error: classified.kind, message: classified.message },
      { status: classified.statusCode }
    )
  }
}
