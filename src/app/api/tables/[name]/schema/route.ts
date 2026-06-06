import { NextRequest, NextResponse } from "next/server"
import { getTableSchema } from "@/lib/clickhouse"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const database = request.nextUrl.searchParams.get("database") || undefined
  try {
    const columns = await getTableSchema(name, database)
    return NextResponse.json({ columns })
  } catch (e) {
    return NextResponse.json(
      {
        error: "not_found",
        message: `Table '${name}' not found or inaccessible`,
      },
      { status: 404 }
    )
  }
}
