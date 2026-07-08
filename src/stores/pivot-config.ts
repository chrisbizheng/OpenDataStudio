import { create } from "zustand"
import { persist } from "zustand/middleware"
import { type PivotConfig, type PivotIndicator, type CalculatedIndicator, type FilterRule, type SortRule, type TotalsConfig } from "@/lib/pivot-sql"
import { migratePivotPersisted } from "./migrate-pivot-store"

export interface PivotResult {
  columns: string[]
  rows: unknown[][]
}

interface PivotConfigState {
  rows: string[]
  columns: string[]
  indicators: PivotIndicator[]
  calculatedIndicators: CalculatedIndicator[]
  filters: FilterRule[]
  sort: SortRule | null
  totals: TotalsConfig

  addRow: (field: string) => void
  removeRow: (field: string) => void
  addColumn: (field: string) => void
  removeColumn: (field: string) => void
  addIndicator: (indicator: PivotIndicator) => void
  updateIndicator: (key: string, updates: Partial<PivotIndicator>) => void
  removeIndicator: (key: string) => void
  addCalculatedIndicator: (indicator: CalculatedIndicator) => void
  updateCalculatedIndicator: (key: string, updates: Partial<CalculatedIndicator>) => void
  removeCalculatedIndicator: (key: string) => void
  setFilters: (filters: FilterRule[]) => void
  addFilter: (filter: FilterRule) => void
  updateFilter: (field: string, updates: Partial<FilterRule>) => void
  removeFilter: (field: string) => void
  setSort: (sort: SortRule | null) => void
  setTotals: (totals: TotalsConfig) => void
  reset: () => void
  loadConfig: (config: PivotConfig) => void
  getPivotConfig: () => PivotConfig
}

const defaultTotals: TotalsConfig = {
  row: { showGrandTotals: true, showSubTotals: false },
  column: { showGrandTotals: true, showSubTotals: false },
}

const initialState = {
  rows: [] as string[],
  columns: [] as string[],
  indicators: [] as PivotIndicator[],
  calculatedIndicators: [] as CalculatedIndicator[],
  filters: [] as FilterRule[],
  sort: null as SortRule | null,
  totals: defaultTotals,
}

export interface PivotConfigSource {
  rows: string[]
  columns: string[]
  indicators: PivotIndicator[]
  calculatedIndicators: CalculatedIndicator[]
  filters: FilterRule[]
  sort: SortRule | null
  totals: TotalsConfig
}

export function validatePivotExecution(
  state: PivotConfigSource,
  tableName: string,
  database: string
): string | null {
  if (state.indicators.length === 0 && state.calculatedIndicators.length === 0) {
    return "请至少添加一个指标"
  }
  if (state.rows.length === 0 && state.columns.length === 0) {
    return "请至少添加一个行维度或列维度"
  }
  if (!tableName || !database) {
    return "请先选择数据表"
  }
  return null
}

export function buildPivotConfig(state: PivotConfigSource): PivotConfig {
  return {
    rows: state.rows,
    columns: state.columns,
    indicators: state.indicators,
    calculatedIndicators: state.calculatedIndicators,
    filters: state.filters,
    sort: state.sort ?? undefined,
    totals: state.totals,
  }
}

export const usePivotConfigStore = create<PivotConfigState>()(
  persist(
    (set, get) => ({
      ...initialState,

      addRow: (field) =>
        set((s) => (s.rows.includes(field) ? s : { rows: [...s.rows, field] })),

      removeRow: (field) =>
        set((s) => ({ rows: s.rows.filter((r) => r !== field) })),

      addColumn: (field) =>
        set((s) =>
          s.columns.includes(field) ? s : { columns: [...s.columns, field] }
        ),

      removeColumn: (field) =>
        set((s) => ({ columns: s.columns.filter((c) => c !== field) })),

      addIndicator: (indicator) =>
        set((s) =>
          s.indicators.some((existing) => existing.key === indicator.key)
            ? s
            : { indicators: [...s.indicators, indicator] }
        ),

      updateIndicator: (key, updates) =>
        set((s) => ({
          indicators: s.indicators.map((ind) =>
            ind.key === key ? { ...ind, ...updates } : ind
          ),
        })),

      removeIndicator: (key) =>
        set((s) => ({
          indicators: s.indicators.filter((ind) => ind.key !== key),
        })),

      addCalculatedIndicator: (indicator) => {
        set((s) => ({
          calculatedIndicators: [...s.calculatedIndicators, indicator],
        }))
      },

      updateCalculatedIndicator: (key, updates) =>
        set((s) => ({
          calculatedIndicators: s.calculatedIndicators.map((c) =>
            c.key === key ? { ...c, ...updates } : c
          ),
        })),

      removeCalculatedIndicator: (key) =>
        set((s) => ({
          calculatedIndicators: s.calculatedIndicators.filter(
            (c) => c.key !== key
          ),
        })),

      setFilters: (filters) => set({ filters }),
      addFilter: (filter) =>
        set((s) => ({
          filters: [
            ...s.filters.filter((f) => f.field !== filter.field),
            filter,
          ],
        })),
      updateFilter: (field, updates) =>
        set((s) => ({
          filters: s.filters.map((filter) =>
            filter.field === field ? { ...filter, ...updates } : filter
          ),
        })),
      removeFilter: (field) =>
        set((s) => ({
          filters: s.filters.filter((filter) => filter.field !== field),
        })),
      setSort: (sort) => set({ sort }),
      setTotals: (totals) => set({ totals }),

      getPivotConfig: () => buildPivotConfig(get()),

      reset: () => set(initialState),

      loadConfig: (config) =>
        set({
          rows: config.rows,
          columns: config.columns,
          indicators: config.indicators,
          calculatedIndicators: config.calculatedIndicators,
          filters: config.filters ?? [],
          sort: config.sort ?? null,
          totals: config.totals ?? defaultTotals,
        }),
    }),
    {
      name: "pivot-store",
      partialize: (state) => ({
        rows: state.rows,
        columns: state.columns,
        indicators: state.indicators,
        calculatedIndicators: state.calculatedIndicators,
        filters: state.filters,
        sort: state.sort,
        totals: state.totals,
      }),
      merge: (persisted, current) => migratePivotPersisted(persisted, current) as typeof current,
    }
  )
)
