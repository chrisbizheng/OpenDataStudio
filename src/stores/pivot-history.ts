import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { PivotConfig } from "@/lib/pivot-sql"

export interface PivotHistoryEntry {
  id: string
  tableName: string
  database: string
  config: PivotConfig
  timestamp: number
  rowCount: number
}

interface PivotHistoryState {
  entries: PivotHistoryEntry[]
  addEntry: (entry: Omit<PivotHistoryEntry, "id" | "timestamp">) => void
  removeEntry: (id: string) => void
  clear: () => void
}

const MAX_ENTRIES = 20

export const usePivotHistoryStore = create<PivotHistoryState>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: (entry) =>
        set((s) => {
          const newEntry: PivotHistoryEntry = {
            ...entry,
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            timestamp: Date.now(),
          }
          return {
            entries: [newEntry, ...s.entries].slice(0, MAX_ENTRIES),
          }
        }),

      removeEntry: (id) =>
        set((s) => ({
          entries: s.entries.filter((e) => e.id !== id),
        })),

      clear: () => set({ entries: [] }),
    }),
    { name: "pivot-history" }
  )
)
