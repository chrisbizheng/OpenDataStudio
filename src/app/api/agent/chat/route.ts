import { NextRequest, NextResponse } from "next/server"
import { executeReadOnly, formatSql } from "@/lib/clickhouse"
import { isReadOnlySql } from "@/lib/sql-guard"
import { logger } from "@/lib/logger"
import { fixConcatSql } from "@/lib/sql-utils"
import { parseLlmConfigFromHeader } from "@/lib/llm-client"
import { buildChatSystemPrompt } from "@/lib/prompts/chat"
import { getTraceId } from "@/lib/trace-id"
import type { ChatContext, SSEDoneFrame, SSEErrorFrame, SSETokenFrame } from "@/lib/agent-types"
import { runAgentPipeline } from "@/lib/agent-pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request)
  const log = logger.child({ traceId })

  try {
    const body = (await request.json()) as {
      messages?: { role: string; content: string }[]
      context: ChatContext
      lang?: string
    }
    const { context } = body
    const messages = body.messages ?? []
    const lang = (body.lang === "zh" ? "zh" : "en") as "zh" | "en"

    log.info({ table: context?.currentTable, db: context?.database }, "agent:chat:start")

    const llmConfig = parseLlmConfigFromHeader(request)
    if (!llmConfig) {
      return NextResponse.json(
        { message: "LLM not configured. Set your API key in Settings." },
        { status: 400 }
      )
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const pipeline = runAgentPipeline(
            { messages, context, lang, llmConfig },
            {
              executeSql: async (sql) => {
                const result = await executeReadOnly(sql)
                return { columns: result.columns, rows: result.rows }
              },
              formatSql,
              buildSystemPrompt: buildChatSystemPrompt,
              fixConcatSql,
              isReadOnlySql,
            }
          )

          for await (const event of pipeline) {
            switch (event.type) {
              case "token":
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ t: "token", c: event.content } satisfies SSETokenFrame)}\n\n`)
                )
                break

              case "llm-parsed":
                log.info(
                  { sql: event.sql, viz: event.viz, reasoning: event.reasoning },
                  "agent:chat:llm-parsed"
                )
                break

              case "done":
                log.info(
                  {
                    cols: event.columns,
                    rows: event.rows.length,
                    finalViz: event.visualization?.type,
                    xKey: event.visualization?.config?.xKey,
                  },
                  "agent:chat:done"
                )

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      t: "done",
                      message: event.message,
                      sql: event.sql,
                      rows: event.rows,
                      columns: event.columns,
                      visualization: event.visualization,
                      reasoning: event.reasoning,
                      ...(event.error ? { error: event.error } : {}),
                    } satisfies SSEDoneFrame)}\n\n`
                  )
                )
                break

              case "error":
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      t: "error",
                      message: event.message,
                    } satisfies SSEErrorFrame)}\n\n`
                  )
                )
                break
            }
          }
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
