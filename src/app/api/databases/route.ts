import { NextResponse } from "next/server"
import { getDatabases } from "@/lib/clickhouse"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const log = logger.child({ route: "databases" })
  try {
    const databases = await getDatabases()
    log.info({ count: databases.length }, "databases:done")
    return NextResponse.json({ databases })
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "databases:error")
    return NextResponse.json(
      {
        error: "connection_failed",
        message: e instanceof Error ? e.message : "Cannot connect to ClickHouse",
      },
      { status: 503 }
    )
  }
}
