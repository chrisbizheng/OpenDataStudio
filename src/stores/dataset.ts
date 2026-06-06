import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { TableMeta, ColumnMeta } from "@/lib/clickhouse"

interface DbInfo {
  name: string
  comment: string
}

interface DatasetState {
  databases: DbInfo[]
  selectedDatabase: string
  tables: TableMeta[]
  selectedTable: string | null
  schema: ColumnMeta[]
  totalRows: number
  isConnected: boolean
  isLoading: boolean
  error: string | null
  setDatabases: (databases: DbInfo[]) => void
  setSelectedDatabase: (db: string) => void
  setTables: (tables: TableMeta[]) => void
  setSelectedTable: (name: string | null) => void
  setSchema: (schema: ColumnMeta[]) => void
  setTotalRows: (total: number) => void
  setConnected: (connected: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useDatasetStore = create<DatasetState>()(
  persist(
    (set) => ({
      databases: [],
      selectedDatabase: "",
      tables: [],
      selectedTable: null,
      schema: [],
      totalRows: 0,
      isConnected: false,
      isLoading: false,
      error: null,
      setDatabases: (databases) => set({ databases }),
      setSelectedDatabase: (db) => set({ selectedDatabase: db }),
      setTables: (tables) => set({ tables }),
      setSelectedTable: (name) => set({ selectedTable: name }),
      setSchema: (schema) => set({ schema }),
      setTotalRows: (total) => set({ totalRows: total }),
      setConnected: (connected) => set({ isConnected: connected }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    { name: "dataset-store", partialize: (state) => ({ selectedDatabase: state.selectedDatabase }) }
  )
)
