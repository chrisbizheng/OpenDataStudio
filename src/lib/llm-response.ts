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

export function extractFields(json: string, fields: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {}
  for (const field of fields) {
    const extracted = extractField(json, field)
    result[field] = extracted ? extracted.text : null
  }
  return result
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

export function stripMarkdownTables(text: string): string {
  const lines = text.split("\n")
  const out: string[] = []
  let removed = 0
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const next = lines[i + 1] || ""
    const looksLikeTableHeader = /^\s*\|.*\|\s*$/.test(line)
    const looksLikeSeparator = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(next)
    if (looksLikeTableHeader && looksLikeSeparator) {
      i += 2
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        i++
        removed++
      }
      removed += 2
      continue
    }
    out.push(line)
    i++
  }
  if (removed > 0) out.push(`_（已隐藏 ${removed} 行数据表，请见下方表格 / 图表）_`)
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

function unescapeJson(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\(.)/g, "$1")
}
