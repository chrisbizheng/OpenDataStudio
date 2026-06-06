import { create } from "zustand"
import { persist } from "zustand/middleware"

interface SqlHistoryEntry {
  id: string
  sql: string
  timestamp: number
  executionTime: number
  tableName: string | null
  rowCount: number
}

interface SqlHistoryState {
  entries: SqlHistoryEntry[]
  addEntry: (entry: Omit<SqlHistoryEntry, "id" | "timestamp">) => void
  clearHistory: () => void
}

export const useSqlHistoryStore = create<SqlHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((s) => {
          const newEntry: SqlHistoryEntry = {
            ...entry,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          }
          return {
            entries: [newEntry, ...s.entries].slice(0, 20),
          }
        }),
      clearHistory: () => set({ entries: [] }),
    }),
    { name: "sql-history" }
  )
)