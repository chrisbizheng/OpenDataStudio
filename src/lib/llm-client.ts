import type { NextRequest } from "next/server"
import type { LlmConfig } from "./agent-types"

const OPENAI_URL = "https://api.openai.com/v1"

export interface LlmCallOptions {
  temperature?: number
  model?: string
  response_format?: { type: string }
  signal?: AbortSignal
}

export function parseLlmConfigFromHeader(request: NextRequest): LlmConfig | null {
  const header = request.headers.get("x-llm-config")
  if (!header) return null
  try {
    return JSON.parse(atob(header)) as LlmConfig
  } catch {
    return null
  }
}

export function buildLlmRequest(config: LlmConfig): {
  apiUrl: string
  headers: Record<string, string>
} {
  const baseUrl = config.baseUrl || OPENAI_URL
  const apiUrl = `${baseUrl.replace(/\/+$/, "")}/chat/completions`
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (config.provider !== "ollama") {
    headers["Authorization"] = `Bearer ${config.apiKey}`
  }
  return { apiUrl, headers }
}

export function buildLlmHeaders(config: {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
}): Record<string, string> {
  if (!config.apiKey) return {}
  return { "x-llm-config": btoa(JSON.stringify(config)) }
}

export async function callLlm(
  config: LlmConfig,
  messages: { role: string; content: string }[],
  options?: LlmCallOptions
): Promise<string> {
  const { apiUrl, headers } = buildLlmRequest(config)

  const res = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: options?.model || config.model || "gpt-4o",
      messages,
      temperature: options?.temperature ?? 0.3,
      response_format: options?.response_format,
    }),
    signal: options?.signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({
      error: { message: `HTTP ${res.status}` },
    }))
    throw new Error(
      err.error?.message || `LLM request failed: ${res.status}`
    )
  }

  const data = await res.json()
  return (data.choices?.[0]?.message?.content as string) ?? ""
}
