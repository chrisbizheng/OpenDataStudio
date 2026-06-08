import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { parseAiQuestions } from "@/lib/ai-questions"
import type { ChatContext } from "@/lib/agent-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const OPENAI_URL = "https://api.openai.com/v1"

interface QuestionsRequest {
  context: ChatContext
  localQuestions: string[]
  previousQuestion?: string
  sql?: string
  columns?: string[]
  lang: string
}

export async function POST(request: NextRequest) {
  const traceId = request.headers.get("x-trace-id") || crypto.randomUUID()
  const log = logger.child({ traceId })

  try {
    const body = (await request.json()) as QuestionsRequest
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
      ? "你是 BI 数据分析产品中的问题推荐助手。只生成用户下一步可以问 Agent 的问题，不执行 SQL。返回 JSON，格式为 {\"questions\":[\"问题1\",\"问题2\"]}。必须返回 3-5 个问题。问题要具体、可执行、贴合当前表结构或上一条 SQL 结果。不要返回 markdown。"
      : "You are a question recommendation assistant in a BI data analysis product. Generate only next questions the user can ask the Agent. Do not execute SQL. Return JSON as {\"questions\":[\"question 1\",\"question 2\"]}. Return 3-5 concrete, actionable questions grounded in the table schema or previous SQL result. Do not return markdown."

    const userPrompt = JSON.stringify({
      table: body.context?.currentTable,
      database: body.context?.database,
      schema: body.context?.schema,
      localQuestions: body.localQuestions,
      previousQuestion: body.previousQuestion,
      sql: body.sql,
      columns: body.columns,
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
        temperature: 0.5,
        response_format: { type: "json_object" },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
      return NextResponse.json({ message: err.error?.message || `LLM request failed: ${res.status}` }, { status: res.status })
    }

    const json = await res.json()
    const content = json.choices?.[0]?.message?.content ?? ""
    const questions = parseAiQuestions(content)
    log.info({ count: questions.length, table: body.context?.currentTable }, "agent:questions:done")

    return NextResponse.json({ questions })
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Question generation failed" }, { status: 500 })
  }
}
