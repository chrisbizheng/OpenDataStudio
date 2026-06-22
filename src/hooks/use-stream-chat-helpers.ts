import type { AssistantMessage, Message, MessageUIState } from "@/lib/agent-types"

export function updatePlaceholderMessage(
  currentMessages: Message[],
  placeholderIndex: number,
  updater: (m: Message) => AssistantMessage,
  onMessagesChange: (msgs: Message[]) => void
): Message[] {
  const updated = currentMessages.map((m, i) =>
    i === placeholderIndex ? updater(m) : m
  )
  onMessagesChange(updated)
  return updated
}

export function finalizeThinkingPanel(
  placeholderIndex: number,
  onMessageUIChange: (updater: (prev: Map<number, MessageUIState>) => Map<number, MessageUIState>) => void
): void {
  onMessageUIChange((prev) => {
    const next = new Map(prev)
    const existing = next.get(placeholderIndex) ?? {}
    next.set(placeholderIndex, {
      thinkingExpanded: false,
      thinkingStartTime: existing.thinkingStartTime,
      thinkingElapsedMs: existing.thinkingStartTime ? Date.now() - existing.thinkingStartTime : undefined,
    })
    return next
  })
}
