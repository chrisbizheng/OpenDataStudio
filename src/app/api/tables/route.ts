import { NextRequest, NextResponse } from "next/server"
import { getTables } from "@/lib/clickhouse"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const database = request.nextUrl.searchParams.get("database") || undefined
    const tables = await getTables(database)
    return NextResponse.json({ tables })
  } catch (e) {
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
