import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import type { ChatContext } from "@/lib/agent-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const OPENAI_URL = "https://api.openai.com/v1"

interface DirectionRequest {
  context: ChatContext
  clicked: {
    key: string
    value: number
    row: Record<string, unknown>
    seriesName?: string
  }
  visualization: {
    type: string
    xKey: string
    yKey?: string
    series?: { yKey: string; label?: string; chartType?: string }[]
  }
  columns: string[]
  localDirections: { label: string; prompt: string }[]
  lang: string
}

function parseDirections(content: string): { label: string; prompt: string }[] {
  let parsed: { directions?: unknown } = {}
  try {
    parsed = JSON.parse(content) as { directions?: unknown }
  } catch {
    return []
  }
  const directions = Array.isArray(parsed.directions) ? parsed.directions : []
  return directions
    .map((item) => {
      const d = item as { label?: unknown; prompt?: unknown }
      return { label: String(d.label ?? ""), prompt: String(d.prompt ?? "") }
    })
    .filter((d) => d.label.trim() && d.prompt.trim())
    .slice(0, 4)
}

export async function POST(request: NextRequest) {
  const traceId = request.headers.get("x-trace-id") || crypto.randomUUID()
  const log = logger.child({ traceId })

  try {
    const body = (await request.json()) as DirectionRequest
    const llmConfigHeader = request.headers.get("x-llm-config")

    if (!llmConfigHeader) {
      return NextResponse.json({ message: "LLM not configured. Set your API key in Settings." }, { status: 400 })
    }

    let llmConfig: { provider: string; apiKey: string; baseUrl: string; model: string }
    try {
      llmConfig = JSON.parse(atob(llmConfigHeader))
    } catch {
      return NextResponse.json({ message: "Invalid LLM configuration" }, { status: 400 })
    }

    const isZh = body.lang === "zh"
    const systemPrompt = isZh
      ? "你是 BI 数据分析产品中的推荐助手。只生成用户点击图表节点后的深度分析方向，不执行 SQL。返回 JSON，格式为 {\"directions\":[{\"label\":\"短按钮文案\",\"prompt\":\"发送给数据分析 Agent 的完整分析请求\"}]}。必须返回 3-4 个方向。每个 prompt 必须包含精确字段名、点击值过滤条件、度量字段和分析动作。不要返回 markdown。"
      : "You are a recommendation assistant in a BI data analysis product. Generate only deep-dive analysis directions after a user clicks a chart node. Do not execute SQL. Return JSON as {\"directions\":[{\"label\":\"short button label\",\"prompt\":\"complete request to send to the data analysis Agent\"}]}. Return 3-4 directions. Each prompt must include exact field names, clicked value filter condition, metric field, and analysis action. Do not return markdown."

    const userPrompt = JSON.stringify({
      table: body.context?.currentTable,
      database: body.context?.database,
      schema: body.context?.schema,
      clicked: body.clicked,
      visualization: body.visualization,
      columns: body.columns,
      localDirections: body.localDirections,
      language: body.lang,
    })

    const baseUrl = llmConfig.baseUrl || OPENAI_URL
    const reqHeaders: Record<string, string> = { "Content-Type": "application/json" }
    if (llmConfig.provider !== "ollama") reqHeaders.Authorization = `Bearer ${llmConfig.apiKey}`

    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({
        model: llmConfig.model || "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
      return NextResponse.json({ message: err.error?.message || `LLM request failed: ${res.status}` }, { status: res.status })
    }

    const json = await res.json()
    const content = json.choices?.[0]?.message?.content ?? ""
    const directions = parseDirections(content)
    log.info({ count: directions.length, table: body.context?.currentTable }, "agent:directions:done")

    return NextResponse.json({ directions })
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Direction generation failed" }, { status: 500 })
  }
}
