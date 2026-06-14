export function parseAiQuestions(content: string): string[] {
  let parsed: { questions?: unknown } = {}
  try {
    parsed = JSON.parse(content) as { questions?: unknown }
  } catch {
    return []
  }

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : []
  return rawQuestions
    .map((item) => {
      if (typeof item === "string") return item
      const q = item as { question?: unknown }
      return typeof q.question === "string" ? q.question : ""
    })
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, 5)
}

export function parseDirections(content: string): { label: string; prompt: string }[] {
  let parsed: { directions?: unknown } = {}
  try {
    parsed = JSON.parse(content) as { directions?: unknown }
  } catch {
    return []
  }
  const directions = Array.isArray(parsed.directions) ? parsed.directions : []
  return directions
    .map((item) => {
      const d = item as { label?: unknown; prompt?: unknown }
      return { label: String(d.label ?? ""), prompt: String(d.prompt ?? "") }
    })
    .filter((d) => d.label.trim() && d.prompt.trim())
    .slice(0, 4)
}
