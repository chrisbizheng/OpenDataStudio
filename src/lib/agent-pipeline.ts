import type { ChatContext, LlmConfig } from "./agent-types"
import type { RawViz, VisualizationConfig } from "./chart-types"
import { buildLlmRequest } from "./llm-client"
import { isMetricColumn } from "./column-type-classifier"

// ============================================================================
// LLM streaming (OpenAI-compatible SSE consumer)
// ============================================================================

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

// ============================================================================
// Response parsing (full JSON, after stream complete)
// ============================================================================

interface ParsedResponse {
  message: string
  sql?: string
  visualization?: RawViz
  reasoning?: string
}

function unescapeJson(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\(.)/g, "$1")
}

function parseResponse(fullContent: string): ParsedResponse {
  let parsed: Record<string, unknown> = {}
  try {
    parsed = JSON.parse(fullContent)
  } catch {
    const msgMatch = fullContent.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    const sqlMatch = fullContent.match(/"sql"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    const vizMatch = fullContent.match(/"visualization"\s*:\s*(\{[\s\S]*?\})/)
    const reasoningMatch = fullContent.match(/"reasoning"\s*:\s*"((?:[^"\\]|\\.)*)"/)

    if (msgMatch) parsed.message = unescapeJson(msgMatch[1])
    if (sqlMatch) parsed.sql = unescapeJson(sqlMatch[1])
    if (vizMatch) {
      try { parsed.visualization = JSON.parse(vizMatch[1]) } catch { /* ignore */ }
    }
    if (reasoningMatch) parsed.reasoning = unescapeJson(reasoningMatch[1])

    if (!parsed.message) {
      return { message: fullContent }
    }
  }

  return {
    message: (parsed.message as string) || fullContent,
    sql: parsed.sql as string | undefined,
    visualization: parsed.visualization as ParsedResponse["visualization"],
    reasoning: parsed.reasoning as string | undefined,
  }
}

// ============================================================================
// Visualization validation + inference
// ============================================================================

function fixVisualization(
  rawViz: RawViz,
  columns: string[]
): VisualizationConfig | null {
  if (!rawViz || !rawViz.type || !rawViz.config) return null
  if (!columns || columns.length === 0) return null

  const cfg = rawViz.config
  const type = rawViz.type

  // Validate series if present
  if (cfg.series && cfg.series.length > 0) {
    const validSeries = cfg.series.filter((s) => columns.includes(s.yKey))
    if (validSeries.length === 0) {
      // All series invalid — fall back to auto-detect
      const numericCol = columns.find((c) => isMetricColumn(c)) || columns[columns.length - 1]!
      const labelCol = columns.find((c) => c !== numericCol) || columns[0]!
      return {
        type,
        config: {
          xKey: cfg.xKey && columns.includes(cfg.xKey) ? cfg.xKey : labelCol,
          yKey: numericCol,
          title: cfg.title,
          showLegend: cfg.showLegend,
        },
      }
    }
    const xOk = cfg.xKey && columns.includes(cfg.xKey)
    const fallbackX = columns.find((c) => !validSeries.some((s) => s.yKey === c)) || columns[0]!
    return {
      type,
      config: {
        ...cfg,
        xKey: xOk ? cfg.xKey! : fallbackX,
        series: validSeries,
      },
    }
  }

  // Single yKey validation (original logic)
  const xOk = cfg.xKey && columns.includes(cfg.xKey)
  const yOk = cfg.yKey && columns.includes(cfg.yKey)
  if (xOk && yOk) {
    return {
      type,
      config: {
        xKey: cfg.xKey!,
        yKey: cfg.yKey,
        series: cfg.series,
        title: cfg.title,
        showLegend: cfg.showLegend,
        height: cfg.height,
      },
    }
  }

  const numericCol = columns.find((c) =>
    c === cfg.yKey || isMetricColumn(c)
  ) || columns[columns.length - 1]!
  const labelCol = columns.find((c) => c !== numericCol) || columns[0]!

  return {
    type,
    config: {
      xKey: cfg.xKey || labelCol,
      yKey: cfg.yKey || numericCol,
      title: cfg.title,
      showLegend: cfg.showLegend,
    },
  }
}

function inferVisualization(
  sql: string,
  columns: string[]
): VisualizationConfig | null {
  if (!columns || columns.length < 2) return null

  const groupMatch = sql.match(/\bGROUP\s+BY\b\s+([\s\S]+?)(?:\bORDER\b|\bLIMIT\b|\bHAVING\b|\bUNION\b|$)/i)
  if (!groupMatch) return null

  const groupCols = groupMatch[1]
    .split(",")
    .map((c) => c.trim().replace(/^`|`$/g, "").replace(/\s+AS\s+\S+$/i, "").trim())
    .filter(Boolean)

  if (groupCols.length === 0) return null

  const metricCols = columns.filter((c) => isMetricColumn(c))
  const dimCol = groupCols[0]

  // Multi-metric: generate series for composed chart
  if (metricCols.length >= 2) {
    return {
      type: "composed",
      config: {
        xKey: dimCol,
        series: metricCols.map((mc) => ({ yKey: mc })),
        title: undefined,
        showLegend: true,
      },
    }
  }

  const metricCol = metricCols[0] || columns[columns.length - 1]
  if (!metricCol) return null

  return {
    type: "bar",
    config: {
      xKey: dimCol,
      yKey: metricCol,
      title: undefined,
      showLegend: groupCols.length > 1,
    },
  }
}

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

  const parsed = parseResponse(fullContent)

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
