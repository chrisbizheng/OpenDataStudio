import { create } from "zustand"
import { executeQuery } from "@/lib/api-client"
import { buildNextResultWindowSql, inferStableOrder } from "@/lib/stable-result-order"

import type { ColumnMeta } from "@/lib/clickhouse"

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
  loadedRows: number
  setCurrentTable: (table: string | null) => void
  setCurrentSchema: (schema: ColumnMeta[]) => void
  setData: (data: TableData | null) => void
  setExecuting: (executing: boolean) => void
  setError: (error: string | null) => void
  setSort: (sort: SortState) => void
  setSearchQuery: (query: string) => void
  loadMore: () => Promise<void>
  executeQuery: (sql: string, tableName: string, append?: boolean) => Promise<void>
}

let abortController: AbortController | null = null

function createAbortController(): AbortController {
  if (abortController) abortController.abort()
  abortController = new AbortController()
  return abortController
}

export const useQueryStore = create<QueryState>((set, get) => ({
  currentTable: null,
  currentSchema: [],
  data: null,
  isExecuting: false,
  error: null,
  sort: { column: null, direction: null },
  searchQuery: "",
  loadedRows: 0,
  setCurrentTable: (table) => set({ currentTable: table }),
  setCurrentSchema: (schema) => set({ currentSchema: schema }),
  setData: (data) => set({ data }),
  setExecuting: (executing) => set({ isExecuting: executing }),
  setError: (error) => set({ error }),
  setSort: (sort) => set({ sort }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  loadMore: async () => {
    const { currentTable, loadedRows, executeQuery } = get()
    if (!currentTable) return
    const db = currentTable.split(".")[0] || ""
    const table = currentTable.split(".")[1] || currentTable
    const stableOrder = inferStableOrder(get().currentSchema)
    const sql = buildNextResultWindowSql(db, table, stableOrder, loadedRows)
    await executeQuery(sql, currentTable, true)
  },
  executeQuery: async (sql, tableName, append = false) => {
    const controller = createAbortController()

    if (!append) {
      set({ isExecuting: true, error: null, currentTable: tableName })
    } else {
      set({ isExecuting: true, error: null })
    }
    try {
      const json = await executeQuery(sql, undefined, controller.signal)
      const newRows = json.rows as unknown[][]
      if (append && get().data) {
        const state = get()
        const merged = [...(state.data?.rows ?? []), ...newRows]
        set({
          data: { ...state.data!, rows: merged },
          loadedRows: merged.length,
          isExecuting: false,
        })
      } else {
        set({
          data: json,
          loadedRows: json.rows.length,
          isExecuting: false,
          error: null,
        })
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      set({
        error: e instanceof Error ? e.message : "Network error",
        isExecuting: false,
      })
    }
  },
}))

export function getFilteredRows(
  rows: unknown[][],
  searchQuery: string
): unknown[][] {
  if (!searchQuery.trim()) return rows
  const q = searchQuery.toLowerCase()
  return rows.filter((row) =>
    row.some((cell) => String(cell ?? "").toLowerCase().includes(q))
  )
}
