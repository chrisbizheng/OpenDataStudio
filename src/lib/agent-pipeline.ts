import type { ChatContext, LlmConfig, RawViz } from "./agent-types"
import type { ParsedResponse } from "./llm-response"
import { buildLlmRequest } from "./llm-client"

export interface PipelineInput {
  messages: { role: string; content: string }[]
  context: ChatContext
  lang: "zh" | "en"
  llmConfig: LlmConfig
}

export interface PipelineDeps {
  streamLLM: (
    apiUrl: string,
    headers: Record<string, string>,
    payload: Record<string, unknown>
  ) => AsyncGenerator<string>
  executeSql: (
    sql: string,
    database?: string
  ) => Promise<{ columns: string[]; rows: unknown[][] }>
  formatSql: (sql: string) => string
  buildSystemPrompt: (
    lang: "zh" | "en",
    params: {
      currentTable?: string | null
      database?: string | null
      schema: { name: string; type: string }[]
    }
  ) => string
  parseResponse: (fullContent: string) => ParsedResponse
  fixVisualization: (rawViz: RawViz, columns: string[]) => RawViz
  inferVisualization: (sql: string, columns: string[]) => RawViz
  fixConcatSql: (sql: string) => string | null
  isReadOnlySql: (sql: string) => boolean
}

export type PipelineEvent =
  | { type: "token"; content: string }
  | { type: "llm-parsed"; sql?: string; viz?: RawViz }
  | { type: "done"; message: string; sql: string | null; rows: unknown[][]; columns: string[]; visualization: RawViz; error?: string }
  | { type: "error"; message: string }

export async function* runAgentPipeline(
  input: PipelineInput,
  deps: PipelineDeps
): AsyncGenerator<PipelineEvent> {
  const { messages, context, lang, llmConfig } = input

  const { apiUrl, headers } = buildLlmRequest(llmConfig)

  const systemPrompt = deps.buildSystemPrompt(lang, {
    currentTable: context?.currentTable,
    database: context?.database,
    schema: context?.schema ?? [],
  })

  const payload = {
    model: llmConfig.model || "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  }

  let fullContent = ""
  for await (const token of deps.streamLLM(apiUrl, headers, payload)) {
    fullContent += token
    yield { type: "token", content: token }
  }

  const parsed = deps.parseResponse(fullContent)

  yield {
    type: "llm-parsed",
    sql: parsed.sql,
    viz: parsed.visualization,
  }

  const msg = parsed.message
  const rawSql = parsed.sql
  const formattedSql = rawSql ? deps.formatSql(rawSql) : null

  const rawViz = parsed.visualization

  let rows: unknown[][] = []
  let columns: string[] = []

  if (rawSql) {
    const fixedSql = deps.fixConcatSql(rawSql)
    const sqlToExecute = fixedSql || rawSql

    if (!deps.isReadOnlySql(sqlToExecute)) {
      yield {
        type: "done",
        message: msg,
        sql: formattedSql || rawSql,
        rows: [],
        columns: [],
        visualization: deps.fixVisualization(rawViz, []),
        error: "Only SELECT, SHOW, DESCRIBE, EXPLAIN, and WITH statements are allowed",
      }
      return
    }

    try {
      const result = await deps.executeSql(sqlToExecute)
      rows = result.rows
      columns = result.columns
    } catch (e) {
      yield {
        type: "done",
        message: msg,
        sql: formattedSql || rawSql,
        rows: [],
        columns: [],
        visualization: deps.fixVisualization(rawViz, []),
        error: e instanceof Error ? e.message : "SQL execution failed",
      }
      return
    }
  }

  const effectiveViz =
    rawViz ?? (rawSql ? deps.inferVisualization(rawSql, columns) : null)
  const finalViz = deps.fixVisualization(effectiveViz, columns)

  const finalMessage =
    rows.length === 0
      ? `${msg}\n\n⚠️ 查询返回了 0 行数据，请检查过滤条件是否准确。`
      : msg

  yield {
    type: "done",
    message: finalMessage,
    sql: formattedSql || rawSql || null,
    rows,
    columns,
    visualization: finalViz,
  }
}
