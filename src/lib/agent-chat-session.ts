import type {
  ChatContext,
  LlmConfig,
  Message,
  SSEDoneFrame,
  SSEErrorFrame,
  SSEFrame,
  SSETokenFrame,
} from "./agent-types"
import type { VisualizationConfig } from "./chart-types"
import { buildLlmHeaders } from "./llm-client"
import { extractField } from "./llm-response"
import { parseSSEStream } from "./sse-frame-parser"

export interface ChatSessionDeps {
  fetchSSE: (url: string, init: RequestInit) => Promise<ReadableStream<Uint8Array>>
  getLlmConfig: () => LlmConfig
  getTraceId: () => string
}

export type ChatEvent =
  | { type: "token"; content: string }
  | { type: "partial"; message: string; sql?: string }
  | { type: "done"; message: string; sql: string | null; rows: unknown[][]; columns: string[]; visualization: VisualizationConfig | null; reasoning?: string; error?: string }
  | { type: "error"; message: string }

async function* parseCustomSSEFrames(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<SSEFrame> {
  for await (const payload of parseSSEStream(reader)) {
    try {
      const parsed = JSON.parse(payload) as SSEFrame
      if (parsed.t === "token" || parsed.t === "done" || parsed.t === "error") {
        yield parsed
      }
    } catch {
    }
  }
}

function extractMessageFromPartial(json: string): string | null {
  const result = extractField(json, "message")
  if (!result) return null
  let msg = result.text
  const sqlResult = extractField(json, "sql")
  if (sqlResult?.text) {
    msg += "\n\n```sql\n" + sqlResult.text + "\n```"
  }
  return msg
}

export async function* runChatSession(
  input: {
    messages: Message[]
    context: ChatContext
    lang: "zh" | "en"
  },
  deps: ChatSessionDeps
): AsyncGenerator<ChatEvent> {
  const llmConfig = deps.getLlmConfig()
  const traceId = deps.getTraceId()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...buildLlmHeaders(llmConfig),
    "x-trace-id": traceId,
  }

  const apiMessages = input.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  let stream: ReadableStream<Uint8Array>
  try {
    stream = await deps.fetchSSE("/api/agent/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        lang: input.lang,
        messages: apiMessages,
        context: input.context,
      }),
    })
  } catch (e) {
    yield { type: "error", message: e instanceof Error ? e.message : "Network error" }
    return
  }

  const reader = stream.getReader()
  let rawJson = ""

  try {
    for await (const frame of parseCustomSSEFrames(reader)) {
      if (frame.t === "token") {
        const tokenFrame = frame as SSETokenFrame
        rawJson += tokenFrame.c
        const msg = extractMessageFromPartial(rawJson)
        if (msg) {
          yield { type: "partial", message: msg, sql: extractField(rawJson, "sql")?.text }
        }
        continue
      }

      if (frame.t === "done") {
        const doneFrame = frame as SSEDoneFrame
        yield {
          type: "done",
          message: doneFrame.message || "Done.",
          sql: doneFrame.sql,
          rows: doneFrame.rows || [],
          columns: doneFrame.columns || [],
          visualization: doneFrame.visualization ?? null,
          reasoning: doneFrame.reasoning,
          error: doneFrame.error,
        }
        return
      }

      if (frame.t === "error") {
        const errorFrame = frame as SSEErrorFrame
        yield { type: "error", message: errorFrame.message || "Unknown error" }
        return
      }
    }
  } finally {
    reader.releaseLock()
  }
}
