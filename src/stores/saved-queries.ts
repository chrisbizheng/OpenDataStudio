import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface SavedQuery {
  id: string
  name: string
  sql: string
  createdAt: number
}

interface SavedQueriesState {
  queries: SavedQuery[]
  add: (name: string, sql: string) => void
  remove: (id: string) => void
  rename: (id: string, name: string) => void
}

export const useSavedQueriesStore = create<SavedQueriesState>()(
  persist(
    (set) => ({
      queries: [],
      add: (name, sql) =>
        set((s) => ({
          queries: [
            ...s.queries,
            { id: crypto.randomUUID(), name, sql, createdAt: Date.now() },
          ],
        })),
      remove: (id) =>
        set((s) => ({ queries: s.queries.filter((q) => q.id !== id) })),
      rename: (id, name) =>
        set((s) => ({
          queries: s.queries.map((q) => (q.id === id ? { ...q, name } : q)),
        })),
    }),
    { name: "saved-queries" }
  )
)
