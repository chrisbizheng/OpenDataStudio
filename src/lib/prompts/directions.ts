type Lang = "zh" | "en"

const PROMPTS: Record<Lang, string> = {
  zh: '你是 BI 数据分析产品中的推荐助手。只生成用户点击图表节点后的深度分析方向，不执行 SQL。返回 JSON，格式为 {"directions":[{"label":"短按钮文案","prompt":"发送给数据分析 Agent 的完整分析请求"}]}。必须返回 3-4 个方向。每个 prompt 必须包含精确字段名、点击值过滤条件、度量字段和分析动作。不要返回 markdown。',
  en: 'You are a recommendation assistant in a BI data analysis product. Generate only deep-dive analysis directions after a user clicks a chart node. Do not execute SQL. Return JSON as {"directions":[{"label":"short button label","prompt":"complete request to send to the data analysis Agent"}]}. Return 3-4 directions. Each prompt must include exact field names, clicked value filter condition, metric field, and analysis action. Do not return markdown.',
}

export function buildDirectionsSystemPrompt(lang: Lang): string {
  return PROMPTS[lang]
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
