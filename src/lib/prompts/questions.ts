type Lang = "zh" | "en"

const PROMPTS: Record<Lang, string> = {
  zh: '你是 BI 数据分析产品中的问题推荐助手。只生成用户下一步可以问 Agent 的问题，不执行 SQL。返回 JSON，格式为 {"questions":["问题1","问题2"]}。必须返回 3-5 个问题。问题要具体、可执行、贴合当前表结构或上一条 SQL 结果。不要返回 markdown。',
  en: 'You are a question recommendation assistant in a BI data analysis product. Generate only next questions the user can ask the Agent. Do not execute SQL. Return JSON as {"questions":["question 1","question 2"]}. Return 3-5 concrete, actionable questions grounded in the table schema or previous SQL result. Do not return markdown.',
}

export function buildQuestionsSystemPrompt(lang: Lang): string {
  return PROMPTS[lang]
}

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
