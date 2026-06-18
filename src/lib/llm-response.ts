// Streaming JSON field extractor — used client-side by agent-chat-session
// to render partial assistant messages as the SSE stream arrives.

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

function unescapeJson(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\(.)/g, "$1")
}
