import { NextResponse } from "next/server"
import { getDatabases } from "@/lib/clickhouse"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const databases = await getDatabases()
    return NextResponse.json({ databases })
  } catch (e) {
    return NextResponse.json(
      {
        error: "connection_failed",
        message: e instanceof Error ? e.message : "Cannot connect to ClickHouse",
      },
      { status: 503 }
    )
  }
}
