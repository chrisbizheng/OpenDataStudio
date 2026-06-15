import { create } from "zustand"
import type { ColumnMeta } from "@/lib/types"

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
  currentSchema: ColumnMeta[]
  data: TableData | null
  isExecuting: boolean
  error: string | null
  sort: SortState
  searchQuery: string
  sql: string
  loadedRows: number
  pendingAutoExecute: string | null
  setCurrentTable: (table: string | null) => void
  setCurrentSchema: (schema: ColumnMeta[]) => void
  setData: (data: TableData | null) => void
  setExecuting: (executing: boolean) => void
  setError: (error: string | null) => void
  setSort: (sort: SortState) => void
  setSearchQuery: (query: string) => void
  setSql: (sql: string) => void
  setLoadedRows: (n: number) => void
  setPendingAutoExecute: (sql: string | null) => void
}

export const useQueryStore = create<QueryState>((set) => ({
  currentTable: null,
  currentSchema: [],
  data: null,
  isExecuting: false,
  error: null,
  sort: { column: null, direction: null },
  searchQuery: "",
  sql: "",
  loadedRows: 0,
  pendingAutoExecute: null,
  setCurrentTable: (table) => set({ currentTable: table }),
  setCurrentSchema: (schema) => set({ currentSchema: schema }),
  setData: (data) => set({ data }),
  setExecuting: (executing) => set({ isExecuting: executing }),
  setError: (error) => set({ error }),
  setSort: (sort) => set({ sort }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSql: (sql) => set({ sql }),
  setLoadedRows: (n) => set({ loadedRows: n }),
  setPendingAutoExecute: (sql) => set({ pendingAutoExecute: sql }),
}))

export function getFilteredRows(
  rows: unknown[][],
  searchQuery: string
): unknown[][] {
  if (!searchQuery.trim()) return rows
  return rows.filter((row) => {
    const q = searchQuery.toLowerCase()
    return row.some((cell) => String(cell ?? "").toLowerCase().includes(q))
  })
}
