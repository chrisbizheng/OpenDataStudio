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
