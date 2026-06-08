import { NextRequest, NextResponse } from "next/server"
import { getTables } from "@/lib/clickhouse"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const database = request.nextUrl.searchParams.get("database") || undefined
  const log = logger.child({ route: "tables", db: database })
  try {
    const tables = await getTables(database)
    log.info({ count: tables.length }, "tables:done")
    return NextResponse.json({ tables })
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "tables:error")
    return NextResponse.json(
      {
        error: "connection_failed",
        message:
          e instanceof Error ? e.message : "Cannot connect to ClickHouse",
      },
      { status: 503 }
    )
  }
}
