import { create } from "zustand"

export interface TableData {
  columns: string[]
  rows: unknown[][]
  stats: { elapsed: number; rowsRead: number; bytesRead: number }
}

interface SortState {
  column: string | null
  direction: "asc" | "desc" | null
}

interface QueryState {
  currentTable: string | null
  data: TableData | null
  isExecuting: boolean
  error: string | null
  sort: SortState
  searchQuery: string
  loadedRows: number
  allRows: unknown[][]
  setCurrentTable: (table: string | null) => void
  setData: (data: TableData | null) => void
  setExecuting: (executing: boolean) => void
  setError: (error: string | null) => void
  setSort: (sort: SortState) => void
  setSearchQuery: (query: string) => void
  loadMore: () => Promise<void>
  executeQuery: (sql: string, tableName: string, append?: boolean) => Promise<void>
}

export const useQueryStore = create<QueryState>((set, get) => ({
  currentTable: null,
  data: null,
  isExecuting: false,
  error: null,
  sort: { column: null, direction: null },
  searchQuery: "",
  loadedRows: 0,
  allRows: [],
  setCurrentTable: (table) => set({ currentTable: table }),
  setData: (data) => set({ data }),
  setExecuting: (executing) => set({ isExecuting: executing }),
  setError: (error) => set({ error }),
  setSort: (sort) => set({ sort }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  loadMore: async () => {
    const { currentTable, loadedRows, executeQuery } = get()
    if (!currentTable) return
    const offset = loadedRows
    const sql = `SELECT * FROM ${currentTable} LIMIT 1000 OFFSET ${offset}`
    await executeQuery(sql, currentTable, true)
  },
  executeQuery: async (sql, tableName, append = false) => {
    const state = get()
    if (!append) {
      set({ isExecuting: true, error: null, currentTable: tableName })
    } else {
      set({ isExecuting: true, error: null })
    }
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      })
      const json = await res.json()
      if (!res.ok) {
        set({ error: json.message || "Query failed", isExecuting: false })
        return
      }
      const newRows = json.rows as unknown[][]
      if (append && state.data) {
        const merged = [...state.allRows, ...newRows]
        set({
          data: { ...state.data, rows: merged },
          allRows: merged,
          loadedRows: merged.length,
          isExecuting: false,
        })
      } else {
        set({
          data: json,
          allRows: json.rows,
          loadedRows: json.rows.length,
          isExecuting: false,
          error: null,
        })
      }
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Network error",
        isExecuting: false,
      })
    }
  },
}))

export function getFilteredRows(
  rows: unknown[][],
  columns: string[],
  searchQuery: string
): unknown[][] {
  if (!searchQuery.trim()) return rows
  const q = searchQuery.toLowerCase()
  return rows.filter((row) =>
    row.some((cell) => String(cell ?? "").toLowerCase().includes(q))
  )
}