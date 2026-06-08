import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/clickhouse"
import { format } from "sql-formatter"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const OPENAI_URL = "https://api.openai.com/v1"

async function* streamLLM(
  apiUrl: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>
): AsyncGenerator<string> {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...payload, stream: true }),
    signal: AbortSignal.timeout(55000),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`LLM API error (${res.status}): ${errText.slice(0, 200)}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let yielded = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim()
        if (data === "[DONE]") continue
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content || ""
          if (content) {
            yielded = true
            yield content
          }
        } catch {
          // skip unparseable chunks
        }
      }
    }
  }

  if (!yielded && buffer.length > 0) {
    try {
      const parsed = JSON.parse(buffer)
      const content =
        parsed.choices?.[0]?.message?.content ||
        parsed.choices?.[0]?.delta?.content ||
        ""
      if (content) yield content
    } catch {
      yield buffer
    }
  }
}

function fixVisualization(
  rawViz: { type?: string; config?: { xKey?: string; yKey?: string; title?: string; showLegend?: boolean } } | null | undefined,
  rawSql: string | undefined,
  columns: string[]
): typeof rawViz {
  if (!rawViz || !rawViz.config) return rawViz
  if (!columns || columns.length === 0) return rawViz

  const cfg = rawViz.config
  const xOk = cfg.xKey && columns.includes(cfg.xKey)
  const yOk = cfg.yKey && columns.includes(cfg.yKey)
  if (xOk && yOk) return rawViz

  const numericCol = columns.find((c) =>
    c === cfg.yKey || /^(sum|total|avg|min|max|count|amount|qty|quantity|sales|revenue|sold|units)/i.test(c)
  ) || columns[columns.length - 1]
  const labelCol = columns.find((c) => c !== numericCol) || columns[0]

  return {
    ...rawViz,
    config: {
      xKey: cfg.xKey || labelCol,
      yKey: cfg.yKey || numericCol,
      title: cfg.title,
      showLegend: cfg.showLegend,
    },
  }
}

function fixConcatSql(sql: string): string | null {
  if (!/\bconcat\s*\(/i.test(sql)) return null
  const groupMatch = sql.match(/\bGROUP\s+BY\b\s+([\s\S]+?)(?:\bORDER\b|\bLIMIT\b|\bHAVING\b|\bUNION\b|$)/i)
  if (!groupMatch) return null
  const groupCols = groupMatch[1].split(",").map((c) => c.trim().replace(/^`|`$/g, "").replace(/\s+AS\s+\S+$/i, "").trim()).filter(Boolean)
  if (groupCols.length < 2) return null
  // Replace SELECT concat(...) AS alias, ... with SELECT col1, col2, ...
  const selectMatch = sql.match(/\bSELECT\b\s+([\s\S]+?)\s+\bFROM\b/i)
  if (!selectMatch) return null
  const selectBody = selectMatch[1]
  // Find the concat(...) AS alias part
  const concatMatch = selectBody.match(/\bconcat\s*\([^)]+\)\s+AS\s+(\w+)/i)
  if (!concatMatch) return null
  const concatAlias = concatMatch[1]
  // Replace concat(...) AS alias with groupCols
  const newSelect = selectBody.replace(concatMatch[0], groupCols.join(", "))
  return sql.replace(selectBody, newSelect)
}

export async function POST(request: NextRequest) {
  const traceId = request.headers.get("x-trace-id") || crypto.randomUUID()
  const log = logger.child({ traceId })

  try {
    const { messages, context } = await request.json()
    const llmConfigHeader = request.headers.get("x-llm-config")

    log.info({ table: context?.currentTable, db: context?.database }, "agent:chat:start")

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
5. After getting results, explain them in natural language. The "message" field is for INSIGHTS, not raw data. The UI already shows the data table and chart below your message — DO NOT repeat rows, columns, or paste markdown/ASCII tables. Instead summarise: highest/lowest value, trend direction, outliers, distribution shape, percentage gaps, notable categories. Aim for 2-5 short sentences or bullets. If user explicitly asked for raw rows, say "前 N 行已在下方表格中展示" and stop — do not copy the rows into the message.
6. ClickHouse string comparisons are case-sensitive. Use the EXACT values from the data — do NOT translate or localize. For example if a column contains 'Milk', write WHERE category = 'Milk' (not 'milk' or '牛奶'). If unsure about the exact value, use ILIKE with the English value: WHERE category ILIKE '%Milk%'. Never use Chinese characters in SQL string literals.
7. If the result is suitable for visualization, include a visualization suggestion. The chart component supports these EXACT type strings (case matters): "bar", "line", "area", "pie", "scatter", "radar", "radialBar", "treemap", "composed". Each chart can show: a title, a legend (set showLegend: true), and auto-computed average line + max-value dot. xKey is the category/dimension, yKey is the numeric metric.

IMPORTANT — follow this mapping based on your SQL structure:

| SQL 结构 | 推荐图表 |
| GROUP BY 单字段 + 多指标 | "composed" (bar+line 组合图) |
| GROUP BY 单字段 + 1 绝对值 + 1 占比 | "composed" |
| GROUP BY 两字段（层级/交叉分组） | "bar" — xKey = first GROUP BY field, yKey = metric. DO NOT use concat() in SQL! SELECT each GROUP BY field separately. Example: SELECT segment, category, SUM(x) AS total FROM ... GROUP BY segment, category |
| GROUP BY 时间列 + 多指标 | "composed"（首选） |
| GROUP BY 分类列 + 看分布结构 | "bar" — bar chart with xKey=category, yKey=metric, show how categories rank/comparison |
| 单维度排名/比较 | "bar" |
| 时间序列趋势 | "line" or "area" |
| 占比（≤8 份）| "pie" |
| 双指标相关性 | "scatter" |
| 用户明确要求层级/树状展示 | "treemap" |

CRITICAL: The "type" field in JSON MUST match this table. If your SQL has GROUP BY with 2+ non-time columns and the user wants a ranking/comparison, use "bar" with xKey as the first dimension column. Use "treemap" ONLY when the user explicitly asks for a tree/hierarchy/structure view.
NEVER use concat() in SQL. When GROUP BY has multiple columns (e.g. segment, category), SELECT each column separately: SELECT segment, category, SUM(x) AS total. The chart system will automatically combine them. Using concat() breaks the chart grouping.
7. Always LIMIT results — default to 100 unless specified.
8. Return your response in JSON format with these fields IN THIS ORDER (reasoning first so it streams first):
   {
     "reasoning": "Step-by-step analysis: 1) understand user intent; 2) identify which columns/tables apply; 3) explain why this SQL structure (joins, aggregates, filters, ordering, limits); 4) what the result will look like; 5) why this chart type fits. Be thorough — at least 3-5 sentences.",
     "sql": "...",
     "message": "...",
     "visualization": { "type": "bar", "config": { "xKey": "...", "yKey": "...", "title": "...", "showLegend": true } } | null
   }
9. The "reasoning" field MUST come first in the JSON — it shows in the thinking panel as it streams. The "message" field is the final user-facing reply.`

    const payload = {
      model: llmConfig.model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }

    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (llmConfig.provider !== "ollama") {
      reqHeaders["Authorization"] = `Bearer ${llmConfig.apiKey}`
    }

    const apiUrl = `${baseUrl.replace(/\/+$/, "")}/chat/completions`

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = ""
          for await (const token of streamLLM(apiUrl, reqHeaders, payload)) {
            fullContent += token
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ t: "token", c: token })}\n\n`)
            )
          }

          let parsed: Record<string, unknown> = {}
          let parseOk = true
          try {
            parsed = JSON.parse(fullContent)
            log.info({ sql: (parsed.sql as string), viz: parsed.visualization }, "agent:chat:llm-parsed")
          } catch {
            parseOk = false
            log.warn({ content: fullContent.slice(0, 300) }, "agent:chat:json-parse-fail")
            // Fallback: extract fields by regex from raw text
            const msgMatch = fullContent.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/)
            const sqlMatch = fullContent.match(/"sql"\s*:\s*"((?:[^"\\]|\\.)*)"/)
            const vizMatch = fullContent.match(/"visualization"\s*:\s*(\{[\s\S]*?\})/)
            if (msgMatch) parsed.message = msgMatch[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\(.)/g, "$1")
            if (sqlMatch) parsed.sql = sqlMatch[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\(.)/g, "$1")
            if (vizMatch) {
              try { parsed.visualization = JSON.parse(vizMatch[1]) } catch { /* ignore */ }
            }
            if (!parsed.message) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ t: "done", message: fullContent })}\n\n`
                )
              )
              controller.close()
              return
            }
          }

          const msg = (parsed.message as string) || fullContent
          const rawSql = parsed.sql as string | undefined
          const formattedSql = rawSql
            ? (() => { try { return format(rawSql, { language: "clickhouse", tabWidth: 2, keywordCase: "upper" }) } catch { return rawSql } })()
            : null

          const rawViz = parsed.visualization as
            | { type?: string; config?: { xKey?: string; yKey?: string; title?: string; showLegend?: boolean } }
            | undefined
            | null

          console.log("[BACKEND] LLM viz:", JSON.stringify(rawViz), "sql:", rawSql?.slice(0, 100))

          let rows: unknown[][] = []
          let columns: string[] = []

          if (rawSql) {
            // Fix concat() in SQL — replace with individual GROUP BY columns
            const fixedSql = fixConcatSql(rawSql)
            const sqlToExecute = fixedSql || rawSql
            if (fixedSql) {
              log.info({ original: rawSql.slice(0, 100), fixed: fixedSql.slice(0, 100) }, "agent:chat:sql-fixed")
            }

            const singleSql = sqlToExecute
              .split(";")
              .map((s: string) => s.trim())
              .filter((s: string) => s && !s.startsWith("--"))[0] || sqlToExecute
            const upperSql = singleSql.toUpperCase().trim()
            const isReadOnly =
              upperSql.startsWith("SELECT") ||
              upperSql.startsWith("SHOW") ||
              upperSql.startsWith("DESCRIBE") ||
              upperSql.startsWith("EXPLAIN")
            if (!isReadOnly) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    t: "done",
                    message: msg,
                    sql: formattedSql || rawSql,
                    rows: [],
                    columns: [],
                    visualization: fixVisualization(rawViz, rawSql, []),
                    error: "Only SELECT, SHOW, DESCRIBE, and EXPLAIN statements are allowed",
                  })}\n\n`
                )
              )
              controller.close()
              return
            }
            try {
              const result = await query(singleSql)
              rows = result.rows
              columns = result.columns
            } catch (e) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    t: "done",
                    message: msg,
                    sql: formattedSql || rawSql,
                    rows: [],
                    columns: [],
                    visualization: fixVisualization(rawViz, rawSql, []),
                    error: e instanceof Error ? e.message : "SQL execution failed",
                  })}\n\n`
                )
              )
              controller.close()
              return
            }
          }

          const finalViz = fixVisualization(rawViz, rawSql, columns)
          log.info({ cols: columns, rows: rows.length, finalViz: finalViz?.type, xKey: finalViz?.config?.xKey }, "agent:chat:done")

          const finalMessage = rows.length === 0
            ? `${msg}\n\n⚠️ 查询返回了 0 行数据，请检查过滤条件是否准确。`
            : msg

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                t: "done",
                message: finalMessage,
                sql: formattedSql || rawSql || null,
                rows,
                columns,
                visualization: finalViz,
              })}\n\n`
            )
          )
        } catch (e) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                t: "error",
                message: e instanceof Error ? e.message : "Stream failed",
              })}\n\n`
            )
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (e) {
    return NextResponse.json(
      {
        message:
          e instanceof Error ? e.message : "Agent request failed",
      },
      { status: 500 }
    )
  }
}
