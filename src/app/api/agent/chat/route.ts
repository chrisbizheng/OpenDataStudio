import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/clickhouse"
import { format } from "sql-formatter"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const OPENAI_URL = "https://api.openai.com/v1"

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json()
    const llmConfigHeader = request.headers.get("x-llm-config")

    if (!llmConfigHeader) {
      return NextResponse.json(
        { message: "LLM not configured. Set your API key in Settings." },
        { status: 400 }
      )
    }

    let llmConfig: { provider: string; apiKey: string; baseUrl: string; model: string }
    try {
      llmConfig = JSON.parse(atob(llmConfigHeader))
    } catch {
      return NextResponse.json(
        { message: "Invalid LLM configuration" },
        { status: 400 }
      )
    }

    const baseUrl = llmConfig.baseUrl || OPENAI_URL

    const systemPrompt = `You are a data analysis assistant connected to a ClickHouse database.
Current table: ${context?.currentTable || "unknown"}
Database: ${context?.database || "default"}
Schema: ${(context?.schema || []).map((c: { name: string; type: string }) => `${c.name}: ${c.type}`).join(", ")}

Rules:
1. When asked a question, generate a ClickHouse SQL query.
2. Use fully qualified table names: \`${context?.database || "default"}.${context?.currentTable || "table"}\`.
3. Generate only ONE SQL statement at a time — do NOT use semicolons or multiple statements.
4. Execute the query yourself and use the results.
5. After getting results, explain them in natural language.
6. If the result is suitable for visualization, include a visualization suggestion.
7. Always LIMIT results — default to 100 unless specified.
8. Return your response in JSON format: { "message": "...", "sql": "...", "visualization": { "type": "bar"|"line"|"pie", "config": { "xKey": "...", "yKey": "..." } } | null }`

    const payload = {
      model: llmConfig.model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (llmConfig.provider === "ollama") {
      // Ollama uses a different endpoint
    } else {
      headers["Authorization"] = `Bearer ${llmConfig.apiKey}`
    }

    const apiUrl =
      llmConfig.provider === "ollama"
        ? `${baseUrl.replace(/\/+$/, "")}/chat/completions`
        : `${baseUrl.replace(/\/+$/, "")}/chat/completions`

    const llmRes = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(55000),
    })

    if (!llmRes.ok) {
      const errText = await llmRes.text().catch(() => "")
      return NextResponse.json(
        {
          message: `LLM API error (${llmRes.status}): ${errText.slice(0, 200)}`,
        },
        { status: 502 }
      )
    }

    const llmData = await llmRes.json()
    const content = llmData.choices?.[0]?.message?.content || ""

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({ message: content })
    }

    const sql = parsed.sql
    const formattedSql = sql ? format(sql, { language: "clickhouse", tabWidth: 2, keywordCase: "upper" }) : null
    let rows: unknown[][] = []
    let columns: string[] = []

    if (sql) {
      const singleSql = sql.split(";").map((s: string) => s.trim()).filter((s: string) => s && !s.startsWith("--"))[0] || sql
      const upperSql = singleSql.toUpperCase().trim()
      const isReadOnly = upperSql.startsWith("SELECT") || upperSql.startsWith("SHOW") || upperSql.startsWith("DESCRIBE") || upperSql.startsWith("EXPLAIN")
      if (!isReadOnly) {
        return NextResponse.json({
          message: parsed.message || content,
          sql: formattedSql || sql || null,
          rows: [],
          columns: [],
          visualization: parsed.visualization || null,
          error: "Only SELECT, SHOW, DESCRIBE, and EXPLAIN statements are allowed",
        })
      }
      try {
        const result = await query(singleSql)
        rows = result.rows
        columns = result.columns
      } catch (e) {
        return NextResponse.json({
          message: parsed.message || content,
          sql: formattedSql || sql || null,
          rows: [],
          columns: [],
          visualization: parsed.visualization || null,
          error: e instanceof Error ? e.message : "SQL execution failed",
        })
      }
    }

    return NextResponse.json({
      message: parsed.message || content,
      sql: formattedSql || sql || null,
      rows,
      columns,
      visualization: parsed.visualization || null,
    })
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Agent request failed"
    return NextResponse.json({ message }, { status: 500 })
  }
}