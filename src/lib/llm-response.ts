export interface ExtractedField {
  text: string
  complete: boolean
}

export function extractField(json: string, field: string): ExtractedField | null {
  const closed = json.match(new RegExp(`"${field}"\\s*:\\s*"(.*?)(?<!\\\\)"`))
  if (closed) {
    return { text: unescapeJson(closed[1]), complete: true }
  }
  const open = json.match(new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)$`))
  if (open && open[1].length > 0) {
    return { text: unescapeJson(open[1]), complete: false }
  }
  return null
}

export interface ParsedResponse {
  message: string
  sql?: string
  visualization?: { type?: string; config?: { xKey?: string; yKey?: string; title?: string; showLegend?: boolean } } | null
  reasoning?: string
}

export function parseResponse(fullContent: string): ParsedResponse {
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

function unescapeJson(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\(.)/g, "$1")
}
