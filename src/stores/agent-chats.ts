import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Message } from "@/lib/agent-types"

interface AgentChatsState {
  conversations: Record<string, Message[]>
  getConversation: (key: string) => Message[] | undefined
  setConversation: (key: string, messages: Message[]) => void
  clearConversation: (key: string) => void
  clearAll: () => void
}

export const useAgentChatsStore = create<AgentChatsState>()(
  persist(
    (set, get) => ({
      conversations: {},
      getConversation: (key) => get().conversations[key],
      setConversation: (key, messages) =>
        set((s) => ({
          conversations: { ...s.conversations, [key]: messages },
        })),
      clearConversation: (key) =>
        set((s) => {
          const next = { ...s.conversations }
          delete next[key]
          return { conversations: next }
        }),
      clearAll: () => set({ conversations: {} }),
    }),
    {
      name: "agent-chats",
      partialize: (s) => ({
        conversations: s.conversations,
      }),
    }
  )
)

export function buildChatKey(database: string | null | undefined, table: string | null | undefined): string {
  return `${database || "_"}::${table || "_"}`
}
