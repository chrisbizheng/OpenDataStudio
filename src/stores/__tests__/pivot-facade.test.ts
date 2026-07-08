import { describe, it, expect, beforeEach } from "vitest"
import { usePivotConfigStore } from "../pivot-config"
import { usePivotExecutionStore } from "../pivot-execution"
import { resetAllPivot, loadPivotConfig } from "../pivot-facade"

describe("pivot-facade", () => {
  beforeEach(() => {
    resetAllPivot()
  })

  it("resetAllPivot clears both stores", () => {
    usePivotConfigStore.getState().addRow("test")
    usePivotExecutionStore.getState().setResultData({ columns: ["a"], rows: [["b"]] })
    usePivotExecutionStore.getState().setError("err")
    resetAllPivot()
    expect(usePivotConfigStore.getState().rows).toEqual([])
    expect(usePivotExecutionStore.getState().resultData).toBeNull()
    expect(usePivotExecutionStore.getState().error).toBeNull()
  })

  it("loadPivotConfig loads config + clears result", () => {
    usePivotExecutionStore.getState().setResultData({ columns: ["a"], rows: [["b"]] })
    usePivotExecutionStore.getState().setError("old error")
    loadPivotConfig({
      rows: ["region"], columns: [], indicators: [], calculatedIndicators: [],
      filters: [], sort: undefined, totals: { row: { showGrandTotals: true, showSubTotals: false }, column: { showGrandTotals: true, showSubTotals: false } },
    })
    expect(usePivotConfigStore.getState().rows).toEqual(["region"])
    expect(usePivotExecutionStore.getState().resultData).toBeNull()
    expect(usePivotExecutionStore.getState().error).toBeNull()
  })
})
