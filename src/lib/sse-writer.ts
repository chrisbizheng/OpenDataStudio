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
