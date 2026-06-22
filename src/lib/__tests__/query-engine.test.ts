import { afterEach, describe, expect, it, vi } from "vitest"
import { QueryEngineImpl } from "../query-engine"
import type { QueryResult } from "../types"

const mockResult: QueryResult = {
  columns: ["a", "b"],
  rows: [[1, 2], [3, 4]],
  stats: { elapsed: 0.1, rowsRead: 2, bytesRead: 100 },
}

afterEach(() => {
  vi.restoreAllMocks()
})

function mockFetchSuccess() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockResult),
  }) as unknown as typeof fetch
}

describe("QueryEngineImpl", () => {
  it("执行查询并返回结果", async () => {
    mockFetchSuccess()
    const engine = new QueryEngineImpl()

    const result = await engine.execute("SELECT 1")
    expect(result).toEqual(mockResult)
    expect(global.fetch).toHaveBeenCalledWith("/api/query", expect.objectContaining({ method: "POST" }))
  })

  it("传递 database 和 signal 给 fetch", async () => {
    mockFetchSuccess()
    const engine = new QueryEngineImpl()
    const controller = new AbortController()

    await engine.execute("SELECT 1", "mydb", controller.signal)
    expect(global.fetch).toHaveBeenCalledWith("/api/query", expect.objectContaining({
      body: JSON.stringify({ sql: "SELECT 1", database: "mydb" }),
      signal: controller.signal,
    }))
  })

  it("AbortError 返回 null", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      throw new DOMException("aborted", "AbortError")
    }) as unknown as typeof fetch
    const engine = new QueryEngineImpl()

    const result = await engine.execute("SELECT 1")
    expect(result).toBeNull()
  })

  it("非中止错误正常抛出", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Server error")) as unknown as typeof fetch
    const engine = new QueryEngineImpl()

    await expect(engine.execute("SELECT 1")).rejects.toThrow("Server error")
  })

  it("cancel 是 no-op（signal 由调用方持有）", () => {
    const engine = new QueryEngineImpl()
    expect(() => engine.cancel()).not.toThrow()
  })
})
