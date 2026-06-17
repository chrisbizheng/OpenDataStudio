import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { parseLlmConfigFromHeader, callLlm } from "@/lib/llm-client"
import { getTraceId } from "@/lib/trace-id"

interface AgentRouteConfig<TBody> {
  buildSystemPrompt: (lang: "zh" | "en") => string
  buildUserPrompt: (body: TBody) => string
  parseResponse: (content: string) => unknown
  responseKey: string
  logPrefix: string
  temperature?: number
}

export async function handleAgentRoute<TBody>(
  request: NextRequest,
  config: AgentRouteConfig<TBody>
): Promise<NextResponse> {
  const traceId = getTraceId(request)
  const log = logger.child({ traceId })

  try {
    const body = (await request.json()) as TBody

    const llmConfig = parseLlmConfigFromHeader(request)
    if (!llmConfig) {
      return NextResponse.json(
        { message: "LLM not configured. Set your API key in Settings." },
        { status: 400 }
      )
    }

    const lang = ((body as Record<string, unknown>).lang === "zh" ? "zh" : "en") as "zh" | "en"
    const systemPrompt = config.buildSystemPrompt(lang)
    const userPrompt = config.buildUserPrompt(body)

    const content = await callLlm(
      llmConfig,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: config.temperature ?? 0.5, response_format: { type: "json_object" } }
    )

    const result = config.parseResponse(content)
    log.info({ count: Array.isArray(result) ? result.length : 1 }, `${config.logPrefix}:done`)

    return NextResponse.json({ [config.responseKey]: result })
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : `${config.logPrefix} failed` },
      { status: 500 }
    )
  }
}
