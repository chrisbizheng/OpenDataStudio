import type { AssistantMessage, Message, MessageUIState } from "@/lib/agent-types"
import { useAgentChatSessionStore } from "@/stores/agent-chat-session"

export function updatePlaceholderMessage(
  currentMessages: Message[],
  placeholderIndex: number,
  updater: (m: Message) => AssistantMessage,
  chatKey: string,
): Message[] {
  const updated = currentMessages.map((m, i) =>
    i === placeholderIndex ? updater(m) : m
  )
  useAgentChatSessionStore.getState().setMessages(chatKey, updated)
  return updated
}

export function finalizeThinkingPanel(
  placeholderIndex: number,
  chatKey: string,
): void {
  useAgentChatSessionStore.getState().setMessageUI(chatKey, (prev) => {
    const existing = prev[placeholderIndex] ?? {}
    return {
      ...prev,
      [placeholderIndex]: {
        thinkingExpanded: false,
        thinkingStartTime: existing.thinkingStartTime,
        thinkingElapsedMs: existing.thinkingStartTime ? Date.now() - existing.thinkingStartTime : undefined,
      },
    }
  })
}
