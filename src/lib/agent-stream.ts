import type { Message } from "@/lib/agent-types"
import { extractField } from "@/lib/llm-response"
import { appLog } from "@/lib/client-logger"

interface InternalSSEEvent {
  type: "token" | "done" | "error"
  data: Record<string, unknown>
}

async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<InternalSSEEvent> {
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const data = line.slice(6).trim()
      if (data === "[DONE]") continue
      try {
        const parsed = JSON.parse(data)
        const eventType = parsed.t as string
        if (eventType === "token" || eventType === "done" || eventType === "error") {
          yield { type: eventType, data: parsed }
        }
      } catch {
      }
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

export interface StreamResult {
  messages: Message[]
  sql?: string
  aborted: boolean
}

export async function processStream(
  reader: ReadableStreamDefaultReader,
  initialMessages: Message[],
  onStateUpdate: (messages: Message[]) => void,
  signal?: AbortSignal
): Promise<StreamResult> {
  const messages = [...initialMessages]
  const placeholderIndex = messages.length - 1
  let rawJson = ""
  let sql: string | undefined
  let aborted = false

  for await (const event of parseSSEStream(reader)) {
    if (signal?.aborted) {
      aborted = true
      break
    }

    const d = event.data

    if (event.type === "token" && d.c) {
      rawJson += d.c as string
      if (rawJson.length % 500 < (rawJson.length - (d.c as string).length) % 500 || rawJson.length < 500) {
        appLog("[Agent-Stream]", `${rawJson.length} bytes received`)
      }
      const msg = extractMessageFromPartial(rawJson)
      if (msg) {
        messages[placeholderIndex] = { ...messages[placeholderIndex], content: msg }
        onStateUpdate([...messages])
      }
      continue
    }

    if (event.type === "done") {
      messages[placeholderIndex] = {
        ...messages[placeholderIndex],
        content: (d.message as string) || "Done.",
        sql: (d.sql as string) || undefined,
        rows: (d.rows as unknown[][]) || undefined,
        columns: (d.columns as string[]) || undefined,
        visualization: (d.visualization as Message["visualization"]) ?? null,
      }
      sql = d.sql ? (d.sql as string) : undefined
      onStateUpdate([...messages])
      break
    }

    if (event.type === "error") {
      messages[placeholderIndex] = {
        ...messages[placeholderIndex],
        content: (d.message as string) || "Unknown error",
      }
      onStateUpdate([...messages])
      break
    }
  }

  if (aborted && !messages[placeholderIndex].content) {
    messages[placeholderIndex] = { ...messages[placeholderIndex], content: "" }
  }

  return { messages, sql, aborted }
}
