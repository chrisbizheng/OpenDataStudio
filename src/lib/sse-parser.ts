import type { SSEEvent } from "./agent-types"

export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<SSEEvent> {
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
        const eventType = parsed.t as SSEEvent["type"]
        if (eventType === "token" || eventType === "done" || eventType === "error") {
          yield { type: eventType, data: parsed }
        }
      } catch {
        // skip unparseable lines
      }
    }
  }
}

export function createSSEStream(
  generator: AsyncGenerator<string>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ t: "error", message: e instanceof Error ? e.message : "Stream failed" })}\n\n`
          )
        )
      } finally {
        controller.close()
      }
    },
  })
}

export async function* streamLLM(
  apiUrl: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>
): AsyncGenerator<string> {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...payload, stream: true }),
    signal: AbortSignal.timeout(55000),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`LLM API error (${res.status}): ${errText.slice(0, 200)}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let yielded = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim()
        if (data === "[DONE]") continue
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content || ""
          if (content) {
            yielded = true
            yield content
          }
        } catch {
          // skip unparseable chunks
        }
      }
    }
  }

  if (!yielded && buffer.length > 0) {
    try {
      const parsed = JSON.parse(buffer)
      const content =
        parsed.choices?.[0]?.message?.content ||
        parsed.choices?.[0]?.delta?.content ||
        ""
      if (content) yield content
    } catch {
      yield buffer
    }
  }
}
