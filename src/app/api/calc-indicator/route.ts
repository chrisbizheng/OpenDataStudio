import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { parseLlmConfigFromHeader, callLlm } from "@/lib/llm-client"
import { buildCalcIndicatorSystemPrompt } from "@/lib/prompts/calc-indicator"
import { getTraceId } from "@/lib/trace-id"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request)
  const log = logger.child({ traceId })

  try {
    const body = (await request.json()) as {
      lang?: string
      context?: { currentTable?: string; database?: string; schema?: { name: string; type: string }[] }
      description?: string
      indicators?: { key: string; title: string; aggregation: string; field: string }[]
    }
    const { context } = body

    const llmConfig = parseLlmConfigFromHeader(request)
    if (!llmConfig) {
      return NextResponse.json(
        { message: "LLM not configured. Set your API key in Settings." },
        { status: 400 }
      )
    }

    log.info({ table: context?.currentTable, db: context?.database }, "calc-indicator:start")

    const lang = (body.lang === "zh" ? "zh" : "en") as "zh" | "en"
    const systemPrompt = buildCalcIndicatorSystemPrompt(lang, {
      tableName: context?.currentTable || "unknown",
      indicators: body.indicators ?? [],
      schema: context?.schema ?? [],
    })

    const content = await callLlm(
      llmConfig,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: body.description ?? "" },
      ],
      { temperature: 0.1, response_format: { type: "json_object" } }
    )

    log.info({ content: content.slice(0, 200) }, "calc-indicator:done")
    try {
      return NextResponse.json(JSON.parse(content))
    } catch {
      return NextResponse.json({ message: "LLM returned invalid JSON", raw: content }, { status: 422 })
    }
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Calc indicator request failed" },
      { status: 500 }
    )
  }
}
