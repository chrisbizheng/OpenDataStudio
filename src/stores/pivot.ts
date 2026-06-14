import { create } from "zustand"
import { persist } from "zustand/middleware"
import { type PivotConfig, type PivotIndicator, type CalculatedIndicator, type FilterRule, type SortRule, type TotalsConfig } from "@/lib/pivot-sql"
import { validate } from "@/lib/expression"
import { migratePivotPersisted } from "./migrate-pivot-store"

const AGG_SUFFIXES: Record<string, string> = {
  _distinct_count: "DISTINCT_COUNT",
  _sum: "SUM",
  _avg: "AVG",
  _count: "COUNT",
  _min: "MIN",
  _max: "MAX",
}

export function migrateIndicatorKey(oldKey: string): string | null {
  for (const [suffix, agg] of Object.entries(AGG_SUFFIXES)) {
    if (oldKey.endsWith(suffix)) {
      const field = oldKey.slice(0, -suffix.length)
      if (field) return `${field}-${agg}`
    }
  }
  return null
}

export interface PivotResult {
  columns: string[]
  rows: unknown[][]
}

interface PivotState {
  rows: string[]
  columns: string[]
  indicators: PivotIndicator[]
  calculatedIndicators: CalculatedIndicator[]
  filters: FilterRule[]
  sort: SortRule | null
  totals: TotalsConfig
  resultData: PivotResult | null
  isExecuting: boolean
  error: string | null
  lastSQL: string | null

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
  setResultData: (data: PivotResult | null) => void
  setExecuting: (v: boolean) => void
  setError: (error: string | null) => void
  setLastSQL: (sql: string | null) => void
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
  resultData: null as PivotResult | null,
  isExecuting: false,
  error: null as string | null,
  lastSQL: null as string | null,
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

export const usePivotStore = create<PivotState>()(
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
        const allKeys = [
          ...get().indicators.map((i) => i.key),
          ...get().calculatedIndicators.map((c) => c.key),
        ]
        const validation = validate(indicator.logic, allKeys)
        if (!validation.valid) {
          set({ error: validation.errors.join("; ") })
          return
        }
        set((s) => ({
          calculatedIndicators: [...s.calculatedIndicators, indicator],
          error: null,
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
      setResultData: (data) => set({ resultData: data }),
      setExecuting: (v) => set({ isExecuting: v }),
      setError: (error) => set({ error }),
      setLastSQL: (sql) => set({ lastSQL: sql }),

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
          resultData: null,
          error: null,
          lastSQL: null,
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
