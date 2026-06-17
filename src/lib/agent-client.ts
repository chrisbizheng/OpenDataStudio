import type { LlmConfig } from "./agent-types"
import { buildLlmHeaders } from "./llm-client"
import { getTraceId } from "./client-logger"

function buildAgentHeaders(
  llmConfig: LlmConfig,
  traceId: string
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...buildLlmHeaders(llmConfig),
    "x-trace-id": traceId,
  }
}

export async function fetchAgentDirections(
  llmConfig: LlmConfig,
  params: {
    context: {
      currentTable?: string | null
      schema?: { name: string; type: string; comment?: string }[]
      database?: string | null
    }
    clicked: {
      key: string
      value: number
      row: Record<string, unknown>
      seriesName?: string
    }
    visualization: {
      type: string
      xKey: string
      yKey?: string
      series?: { yKey: string; label?: string; chartType?: string }[]
    }
    columns: string[]
    localDirections: { label: string; prompt: string }[]
    lang: string
  }
): Promise<{ label: string; prompt: string }[]> {
  const traceId = getTraceId()
  const res = await fetch("/api/agent/directions", {
    method: "POST",
    headers: buildAgentHeaders(llmConfig, traceId),
    body: JSON.stringify(params),
  })
  if (!res.ok) return []
  const json = (await res.json()) as {
    directions?: { label: string; prompt: string }[]
  }
  return (json.directions || []).slice(0, 4)
}

export async function fetchAgentQuestions(
  llmConfig: LlmConfig,
  params: {
    context: {
      currentTable?: string | null
      schema?: { name: string; type: string; comment?: string }[]
      database?: string | null
    }
    localQuestions: string[]
    previousQuestion?: string
    sql?: string
    columns?: string[]
    lang: string
  }
): Promise<string[]> {
  const traceId = getTraceId()
  const res = await fetch("/api/agent/questions", {
    method: "POST",
    headers: buildAgentHeaders(llmConfig, traceId),
    body: JSON.stringify(params),
  })
  if (!res.ok) return []
  const json = (await res.json()) as { questions?: string[] }
  return (json.questions || []).slice(0, 5)
}
