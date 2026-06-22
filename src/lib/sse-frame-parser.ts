// Protocol-agnostic SSE frame parser.
// Splits a byte stream into individual `data:` payload strings.
// Does NOT parse JSON — callers decide frame format (OpenAI, custom {t,c}, etc.).

/**
 * Yield each `data:` payload string from an SSE byte stream.
 * Strips `data: ` prefix, skips `[DONE]`, handles cross-buffer concatenation.
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string> {
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
      yield data
    }
  }
}
