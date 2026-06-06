import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/clickhouse"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { sql, database } = await request.json()

    if (!sql || typeof sql !== "string") {
      return NextResponse.json(
        { error: "invalid_request", message: "Missing or invalid 'sql' field" },
        { status: 400 }
      )
    }

    const result = await query(sql, undefined, database || undefined)
    return NextResponse.json(result)
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Query execution failed"

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
