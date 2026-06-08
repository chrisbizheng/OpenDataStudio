import { NextRequest, NextResponse } from "next/server"
import { getTableSchema } from "@/lib/clickhouse"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const database = request.nextUrl.searchParams.get("database") || undefined
  const log = logger.child({ route: "schema", table: name, db: database })
  try {
    const columns = await getTableSchema(name, database)
    log.info({ cols: columns.length }, "schema:done")
    return NextResponse.json({ columns })
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "schema:error")
    return NextResponse.json(
      {
        error: "not_found",
        message: `Table '${name}' not found or inaccessible`,
      },
      { status: 404 }
    )
  }
}
