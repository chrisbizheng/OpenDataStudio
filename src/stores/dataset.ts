import { create } from "zustand"
import { persist } from "zustand/middleware"

interface DatasetState {
  selectedDatabase: string
  selectedTable: string | null
  selectDatabase: (db: string) => void
  selectTable: (name: string | null) => void
}

export const useDatasetStore = create<DatasetState>()(
  persist(
    (set) => ({
      selectedDatabase: "",
      selectedTable: null,

      selectDatabase: (db: string) => set({ selectedDatabase: db, selectedTable: null }),
      selectTable: (name: string | null) => set({ selectedTable: name }),
    }),
    {
      name: "dataset-store",
      partialize: (state) => ({
        selectedDatabase: state.selectedDatabase,
        selectedTable: state.selectedTable,
      }),
    }
  )
)
