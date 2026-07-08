import { create } from "zustand"
import type { PivotResult } from "./pivot-config"

interface PivotExecutionState {
  isExecuting: boolean
  resultData: PivotResult | null
  error: string | null
  lastSQL: string | null
  setExecuting: (v: boolean) => void
  setResultData: (data: PivotResult | null) => void
  setError: (error: string | null) => void
  setLastSQL: (sql: string | null) => void
  reset: () => void
  clearResult: () => void
}

const initialExecutionState = {
  isExecuting: false,
  resultData: null as PivotResult | null,
  error: null as string | null,
  lastSQL: null as string | null,
}

export const usePivotExecutionStore = create<PivotExecutionState>()((set) => ({
  ...initialExecutionState,
  setExecuting: (v) => set({ isExecuting: v }),
  setResultData: (data) => set({ resultData: data }),
  setError: (error) => set({ error }),
  setLastSQL: (sql) => set({ lastSQL: sql }),
  reset: () => set(initialExecutionState),
  clearResult: () => set({ resultData: null, error: null, lastSQL: null }),
}))
