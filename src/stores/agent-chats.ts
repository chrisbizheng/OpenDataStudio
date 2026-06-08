import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AgentMessage {
  role: "user" | "assistant"
  content: string
  sql?: string
  rows?: unknown[][]
  columns?: string[]
  visualization?: {
    type: string
    config: {
      xKey: string
      yKey?: string
      series?: { yKey: string; chartType?: string; label?: string }[]
      title?: string
      showLegend?: boolean
      height?: number
    }
  } | null
  thinkingExpanded?: boolean
  thinkingStartTime?: number
  thinkingElapsedMs?: number
  streamingContent?: string
}

interface AgentChatsState {
  conversations: Record<string, AgentMessage[]>
  getConversation: (key: string) => AgentMessage[] | undefined
  setConversation: (key: string, messages: AgentMessage[]) => void
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
        conversations: Object.fromEntries(
          Object.entries(s.conversations).map(([k, msgs]) => [
            k,
            msgs.map((m) => ({
              role: m.role,
              content: m.content,
              sql: m.sql,
              rows: m.rows,
              columns: m.columns,
              visualization: m.visualization,
            })),
          ])
        ),
      }),
    }
  )
)

export function buildChatKey(database: string | null | undefined, table: string | null | undefined): string {
  return `${database || "_"}::${table || "_"}`
}
