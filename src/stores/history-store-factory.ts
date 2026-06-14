import { create } from "zustand"
import { persist } from "zustand/middleware"

interface HistoryStoreOptions {
  name: string
  maxEntries?: number
}

export interface HistoryStoreState<T extends { id: string; timestamp: number }> {
  entries: T[]
  addEntry: (entry: Omit<T, "id" | "timestamp">) => void
  removeEntry: (id: string) => void
  clear: () => void
}

export function createHistoryStore<T extends { id: string; timestamp: number }>(
  options: HistoryStoreOptions
) {
  const { name, maxEntries = 20 } = options

  return create<HistoryStoreState<T>>()(
    persist(
      (set) => ({
        entries: [],

        addEntry: (entry) =>
          set((s) => {
            const newEntry = {
              ...entry,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
            } as T
            return {
              entries: [newEntry, ...s.entries].slice(0, maxEntries),
            }
          }),

        removeEntry: (id) =>
          set((s) => ({
            entries: s.entries.filter((e) => e.id !== id),
          })),

        clear: () => set({ entries: [] }),
      }),
      { name }
    )
  )
}
