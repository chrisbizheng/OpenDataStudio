import { create } from "zustand"
import type { ExploreConfig, Metric, Dimension, TimeConfig, AdvancedAnalytics } from "@/lib/metric-types"
import { useDatasetRegistryStore } from "@/stores/dataset-registry"

interface ExploreConfigState {
  config: ExploreConfig | null
  lastGeneratedSql: string | null
  lastError: string | null
  isRunning: boolean
  pendingDatasetId: string | null

  initExplore: (datasetId: string) => void
  setPendingDatasetId: (id: string) => void
  clearPendingDatasetId: () => void
  setMetrics: (metrics: Metric[]) => void
  addMetric: (metric: Metric) => void
  removeMetric: (metricId: string) => void
  updateMetric: (metricId: string, updates: Partial<Metric>) => void
  setDimensions: (dims: Dimension[]) => void
  addDimension: (dim: Dimension) => void
  removeDimension: (column: string) => void
  setTimeConfig: (tc: TimeConfig | undefined) => void
  setAnalytics: (analytics: AdvancedAnalytics | undefined) => void
  setOrderBy: (col: string, direction: "asc" | "desc") => void
  setRowLimit: (n: number) => void

  setRunning: (b: boolean) => void
  setLastResult: (sql: string) => void
  setError: (err: string | null) => void
  reset: () => void
}

export const useExploreConfigStore = create<ExploreConfigState>()(
  (set) => ({
    config: null,
    lastGeneratedSql: null,
    lastError: null,
    isRunning: false,
    pendingDatasetId: null,

    setPendingDatasetId: (id) => set({ pendingDatasetId: id }),

    clearPendingDatasetId: () => set({ pendingDatasetId: null }),

    initExplore: (datasetId) => {
      const dataset = useDatasetRegistryStore.getState().getDataset(datasetId)
      const initialMetrics = dataset?.metrics ?? []
      set({
        config: { datasetId, metrics: [...initialMetrics], dimensions: [], rowLimit: 10000 },
        lastGeneratedSql: null,
        lastError: null,
        isRunning: false,
      })
    },

    setMetrics: (metrics) =>
      set((s) => {
        if (!s.config) return s
        return { config: { ...s.config, metrics } }
      }),

    addMetric: (metric) =>
      set((s) => {
        if (!s.config) return s
        return { config: { ...s.config, metrics: [...s.config.metrics, metric] } }
      }),

    removeMetric: (metricId) =>
      set((s) => {
        if (!s.config) return s
        return {
          config: {
            ...s.config,
            metrics: s.config.metrics.filter((m) => m.id !== metricId),
          },
        }
      }),

    updateMetric: (metricId, updates) =>
      set((s) => {
        if (!s.config) return s
        return {
          config: {
            ...s.config,
            metrics: s.config.metrics.map((m) =>
              m.id === metricId ? { ...m, ...updates } as Metric : m
            ),
          },
        }
      }),

    setDimensions: (dims) =>
      set((s) => {
        if (!s.config) return s
        return { config: { ...s.config, dimensions: dims } }
      }),

    addDimension: (dim) =>
      set((s) => {
        if (!s.config) return s
        const exists = s.config.dimensions.some((d) => d.column === dim.column)
        if (exists) return s
        return { config: { ...s.config, dimensions: [...s.config.dimensions, dim] } }
      }),

    removeDimension: (column) =>
      set((s) => {
        if (!s.config) return s
        return {
          config: {
            ...s.config,
            dimensions: s.config.dimensions.filter((d) => d.column !== column),
          },
        }
      }),

    setTimeConfig: (tc) =>
      set((s) => {
        if (!s.config) return s
        return { config: { ...s.config, timeConfig: tc } }
      }),

    setAnalytics: (analytics) =>
      set((s) => {
        if (!s.config) return s
        return { config: { ...s.config, analytics } }
      }),

    setOrderBy: (col, direction) =>
      set((s) => {
        if (!s.config) return s
        return { config: { ...s.config, orderBy: { column: col, direction } } }
      }),

    setRowLimit: (n) =>
      set((s) => {
        if (!s.config) return s
        return { config: { ...s.config, rowLimit: n } }
      }),

    setRunning: (b) => set({ isRunning: b }),

    setLastResult: (sql) =>
      set({ lastGeneratedSql: sql, lastError: null }),

    setError: (err) =>
      set({ lastError: err, lastGeneratedSql: null }),

    reset: () =>
      set({
        config: null,
        lastGeneratedSql: null,
        lastError: null,
        isRunning: false,
      }),
  })
)
