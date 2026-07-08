import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { TimeGranularity, Metric } from "@/lib/metric-types"

export interface DatasetColumn {
  name: string
  type: string
  displayName?: string
  isTime: boolean
  timeGranularity?: TimeGranularity
  role: "dimension" | "metric"
  description?: string
}

export interface Dataset {
  id: string
  name: string
  type: "physical" | "virtual"
  database?: string
  table?: string
  sql?: string
  columns: DatasetColumn[]
  metrics?: import("@/lib/metric-types").Metric[]
  createdAt: number
  updatedAt: number
}

interface DatasetRegistryState {
  datasets: Dataset[]

  createDataset: (input: {
    name: string
    type: "physical" | "virtual"
    database?: string
    table?: string
    sql?: string
    columns: DatasetColumn[]
  }) => string
  updateDataset: (id: string, updates: Partial<Omit<Dataset, "id" | "createdAt">>) => void
  deleteDataset: (id: string) => void
  getDataset: (id: string) => Dataset | undefined

  updateColumn: (datasetId: string, columnName: string, updates: Partial<DatasetColumn>) => void
  addMetricToDataset: (datasetId: string, metric: Metric) => void
}

function updateOneAndTouch(
  datasets: Dataset[],
  id: string,
  updater: (d: Dataset) => Partial<Dataset>
): Dataset[] {
  return datasets.map((d) =>
    d.id === id
      ? { ...d, ...updater(d), updatedAt: Date.now() }
      : d
  )
}

export const useDatasetRegistryStore = create<DatasetRegistryState>()(
  persist(
    (set, get) => ({
      datasets: [],

      createDataset: (input) => {
        const id = crypto.randomUUID()
        const now = Date.now()
        set((s) => ({
          datasets: [
            {
              id,
              name: input.name,
              type: input.type,
              database: input.database,
              table: input.table,
              sql: input.sql,
              columns: input.columns,
              createdAt: now,
              updatedAt: now,
            },
            ...s.datasets,
          ],
        }))
        return id
      },

      updateDataset: (id, updates) =>
        set((s) => ({
          datasets: updateOneAndTouch(s.datasets, id, () => updates),
        })),

      deleteDataset: (id) =>
        set((s) => ({
          datasets: s.datasets.filter((d) => d.id !== id),
        })),

      getDataset: (id) => get().datasets.find((d) => d.id === id),

      updateColumn: (datasetId, columnName, updates) =>
        set((s) => ({
          datasets: updateOneAndTouch(s.datasets, datasetId, (d) => ({
            columns: d.columns.map((c) =>
              c.name === columnName ? { ...c, ...updates } : c
            ),
          })),
        })),

      addMetricToDataset: (datasetId, metric) =>
        set((s) => ({
          datasets: updateOneAndTouch(s.datasets, datasetId, (d) => ({
            metrics: [...(d.metrics ?? []), metric],
          })),
        })),
    }),
    {
      name: "datasets",
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.datasets.forEach((d) => {
          if (!Array.isArray(d.columns)) d.columns = []
        })
      },
    }
  )
)
