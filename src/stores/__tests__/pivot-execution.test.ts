import { describe, it, expect, beforeEach } from "vitest"
import { usePivotExecutionStore } from "../pivot-execution"

describe("pivot-execution store", () => {
  beforeEach(() => {
    usePivotExecutionStore.getState().reset()
  })

  it("initial state is empty", () => {
    const state = usePivotExecutionStore.getState()
    expect(state.isExecuting).toBe(false)
    expect(state.resultData).toBeNull()
    expect(state.error).toBeNull()
    expect(state.lastSQL).toBeNull()
  })

  it("setExecuting sets flag", () => {
    usePivotExecutionStore.getState().setExecuting(true)
    expect(usePivotExecutionStore.getState().isExecuting).toBe(true)
    usePivotExecutionStore.getState().setExecuting(false)
    expect(usePivotExecutionStore.getState().isExecuting).toBe(false)
  })

  it("setResultData sets result", () => {
    const data = { columns: ["a", "b"], rows: [[1, 2], [3, 4]] }
    usePivotExecutionStore.getState().setResultData(data)
    expect(usePivotExecutionStore.getState().resultData).toEqual(data)
  })

  it("setResultData accepts null", () => {
    usePivotExecutionStore.getState().setResultData({ columns: ["a"], rows: [["b"]] })
    usePivotExecutionStore.getState().setResultData(null)
    expect(usePivotExecutionStore.getState().resultData).toBeNull()
  })

  it("setError sets error", () => {
    usePivotExecutionStore.getState().setError("query failed")
    expect(usePivotExecutionStore.getState().error).toBe("query failed")
  })

  it("setError accepts null (clears error)", () => {
    usePivotExecutionStore.getState().setError("err")
    usePivotExecutionStore.getState().setError(null)
    expect(usePivotExecutionStore.getState().error).toBeNull()
  })

  it("setLastSQL sets SQL", () => {
    usePivotExecutionStore.getState().setLastSQL("SELECT 1")
    expect(usePivotExecutionStore.getState().lastSQL).toBe("SELECT 1")
  })

  it("reset clears all fields", () => {
    usePivotExecutionStore.getState().setExecuting(true)
    usePivotExecutionStore.getState().setResultData({ columns: ["a"], rows: [["b"]] })
    usePivotExecutionStore.getState().setError("err")
    usePivotExecutionStore.getState().setLastSQL("SELECT 1")

    usePivotExecutionStore.getState().reset()

    const state = usePivotExecutionStore.getState()
    expect(state.isExecuting).toBe(false)
    expect(state.resultData).toBeNull()
    expect(state.error).toBeNull()
    expect(state.lastSQL).toBeNull()
  })

  it("clearResult clears result/error/lastSQL but preserves isExecuting", () => {
    usePivotExecutionStore.getState().setExecuting(true)
    usePivotExecutionStore.getState().setResultData({ columns: ["a"], rows: [["b"]] })
    usePivotExecutionStore.getState().setError("err")
    usePivotExecutionStore.getState().setLastSQL("SELECT 1")

    usePivotExecutionStore.getState().clearResult()

    const state = usePivotExecutionStore.getState()
    expect(state.isExecuting).toBe(true) // preserved
    expect(state.resultData).toBeNull()
    expect(state.error).toBeNull()
    expect(state.lastSQL).toBeNull()
  })
})
