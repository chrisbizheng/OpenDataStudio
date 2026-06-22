import type { ChatContext, LlmConfig } from "./agent-types"
import type { RawViz, VisualizationConfig } from "./chart-types"
import { buildLlmRequest, streamLLM } from "./llm-client"
import { extractLlmFields } from "./llm-response"
import { fixVisualization, inferVisualization } from "./visualization-fix"

// ============================================================================
// Pipeline
// ============================================================================

export interface PipelineInput {
  messages: { role: string; content: string }[]
  context: ChatContext
  lang: "zh" | "en"
  llmConfig: LlmConfig
}

export interface PipelineDeps {
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
  fixConcatSql: (sql: string) => string | null
  isReadOnlySql: (sql: string) => boolean
}

export type PipelineEvent =
  | { type: "token"; content: string }
  | { type: "llm-parsed"; sql?: string; viz?: RawViz; reasoning?: string }
  | { type: "done"; message: string; sql: string | null; rows: unknown[][]; columns: string[]; visualization: VisualizationConfig | null; error?: string; reasoning?: string }
  | { type: "error"; message: string }

type SqlExecutionResult =
  | { ok: true; rows: unknown[][]; columns: string[] }
  | { ok: false; event: PipelineEvent }

async function executeSqlPhase(
  deps: PipelineDeps,
  rawSql: string,
  formattedSql: string | null,
  msg: string,
  reasoning?: string
): Promise<SqlExecutionResult> {
  const fixedSql = deps.fixConcatSql(rawSql)
  const sqlToExecute = fixedSql || rawSql

  if (!deps.isReadOnlySql(sqlToExecute)) {
    return {
      ok: false,
      event: {
        type: "done",
        message: msg,
        sql: formattedSql || rawSql,
        rows: [],
        columns: [],
        visualization: null,
        error: "Only SELECT, SHOW, DESCRIBE, EXPLAIN, and WITH statements are allowed",
        reasoning,
      },
    }
  }

  try {
    const result = await deps.executeSql(sqlToExecute)
    return { ok: true, rows: result.rows, columns: result.columns }
  } catch (e) {
    return {
      ok: false,
      event: {
        type: "done",
        message: msg,
        sql: formattedSql || rawSql,
        rows: [],
        columns: [],
        visualization: null,
        error: e instanceof Error ? e.message : "SQL execution failed",
        reasoning,
      },
    }
  }
}

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
  for await (const token of streamLLM(apiUrl, headers, payload)) {
    fullContent += token
    yield { type: "token", content: token }
  }

  const parsed = extractLlmFields(fullContent)

  yield {
    type: "llm-parsed",
    sql: parsed.sql,
    viz: parsed.visualization,
    reasoning: parsed.reasoning,
  }

  const msg = parsed.message
  const rawSql = parsed.sql
  const formattedSql = rawSql ? deps.formatSql(rawSql) : null

  const rawViz = parsed.visualization

  let rows: unknown[][] = []
  let columns: string[] = []

  if (rawSql) {
    const result = await executeSqlPhase(deps, rawSql, formattedSql, msg, parsed.reasoning)
    if (!result.ok) {
      yield result.event
      return
    }
    rows = result.rows
    columns = result.columns
  }

  const effectiveViz =
    rawViz ?? (rawSql ? inferVisualization(rawSql, columns) : null)
  const finalViz = fixVisualization(effectiveViz, columns)

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
    reasoning: parsed.reasoning,
  }
}
