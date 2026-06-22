import type { RawViz } from "./chart-types"

// ============================================================================
// Streaming JSON field extractor — used client-side by agent-chat-session
// to render partial assistant messages as the SSE stream arrives.
// ============================================================================

export interface ExtractedField {
  text: string
  complete: boolean
}

function unescapeJson(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\(.)/g, "$1")
}

/**
 * Extract a single string field from a partial JSON string.
 * Handles both complete (closed) and incomplete (open, streaming) values.
 */
export function extractField(json: string, field: string): ExtractedField | null {
  // Try closed (complete) match: "field": "value"
  const closed = json.match(
    new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`)
  )
  if (closed) {
    return { text: unescapeJson(closed[1]), complete: true }
  }
  // Try open (incomplete, streaming) match: "field": "partial...
  const open = json.match(
    new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)$`)
  )
  if (open && open[1].length > 0) {
    return { text: unescapeJson(open[1]), complete: false }
  }
  return null
}

// ============================================================================
// Full response parsing (after stream complete)
// ============================================================================

export interface LlmFields {
  message: string
  sql?: string
  visualization?: RawViz
  reasoning?: string
}

/**
 * Parse a complete LLM JSON response into structured fields.
 * Falls back to regex extraction if JSON.parse fails (handles malformed JSON).
 */
export function extractLlmFields(fullContent: string): LlmFields {
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
    visualization: parsed.visualization as RawViz,
    reasoning: parsed.reasoning as string | undefined,
  }
}
