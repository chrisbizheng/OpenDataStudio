import { create } from "zustand"
import { persist } from "zustand/middleware"
import { generatePivotSQL, type PivotConfig, type PivotIndicator, type CalculatedIndicator, type FilterRule, type SortRule, type TotalsConfig } from "@/lib/pivot-sql"
import { validate } from "@/lib/expression"
import { executeQuery } from "@/lib/api-client"

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
  setSort: (sort: SortRule | null) => void
  setTotals: (totals: TotalsConfig) => void
  executePivot: (tableName: string, database: string) => Promise<void>
  reset: () => void
  loadConfig: (config: PivotConfig) => void
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

type PivotStateSnapshot = typeof initialState

function validatePivotExecution(
  state: PivotStateSnapshot,
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

function buildPivotConfig(state: PivotStateSnapshot): PivotConfig {
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
        set((s) => ({
          indicators: [...s.indicators, indicator],
        })),

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
        const validation = validate(indicator.expression, allKeys)
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
      setSort: (sort) => set({ sort }),
      setTotals: (totals) => set({ totals }),

      executePivot: async (tableName, database) => {
        const state = get()
        const validationError = validatePivotExecution(state, tableName, database)
        if (validationError) {
          set({ error: validationError })
          return
        }

        set({ isExecuting: true, error: null })

        const config = buildPivotConfig(state)
        const sql = generatePivotSQL(config, tableName, database)

        try {
          const json = await executeQuery(sql, database)
          set({
            resultData: { columns: json.columns, rows: json.rows },
            isExecuting: false,
            error: null,
            lastSQL: sql,
          })
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : "网络错误",
            isExecuting: false,
            lastSQL: sql,
          })
        }
      },

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
    }
  )
)
