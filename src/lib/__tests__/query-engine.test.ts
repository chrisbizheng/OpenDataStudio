import { describe, expect, it, vi } from "vitest"
import { QueryEngineImpl } from "../query-engine"
import type { QueryPort } from "../query-engine"
import type { QueryResult } from "../types"

const mockResult: QueryResult = {
  columns: ["a", "b"],
  rows: [[1, 2], [3, 4]],
  stats: { elapsed: 0.1, rowsRead: 2, bytesRead: 100 },
}

function createMockPort(overrides?: Partial<QueryPort>): QueryPort {
  return {
    execute: vi.fn().mockResolvedValue(mockResult),
    ...overrides,
  }
}

describe("QueryEngineImpl", () => {
  it("执行查询并返回结果", async () => {
    const port = createMockPort()
    const engine = new QueryEngineImpl(port)

    const result = await engine.execute("SELECT 1")
    expect(result).toEqual(mockResult)
    expect(port.execute).toHaveBeenCalledWith("SELECT 1", undefined, expect.any(AbortSignal))
  })

  it("执行查询时传递 database 参数", async () => {
    const port = createMockPort()
    const engine = new QueryEngineImpl(port)

    await engine.execute("SELECT 1", "mydb")
    expect(port.execute).toHaveBeenCalledWith("SELECT 1", "mydb", expect.any(AbortSignal))
  })

  it("新查询自动取消前一次请求", async () => {
    let callCount = 0
    const port = createMockPort({
      execute: vi.fn().mockImplementation((_sql, _db, signal) => {
        callCount++
        return new Promise<QueryResult>((resolve, reject) => {
          const onAbort = () => {
            reject(new DOMException("The operation was aborted", "AbortError"))
          }
          if (signal?.aborted) {
            onAbort()
            return
          }
          signal?.addEventListener("abort", onAbort, { once: true })
          if (callCount === 1) return
          resolve(mockResult)
        })
      }),
    })
    const engine = new QueryEngineImpl(port)

    const firstCall = engine.execute("SELECT 1")
    const secondCall = engine.execute("SELECT 2")

    const firstResult = await firstCall.catch(() => null)
    const secondResult = await secondCall

    expect(firstResult).toBeNull()
    expect(secondResult).toEqual(mockResult)
  })

  it("cancel 取消当前请求", async () => {
    const port = createMockPort({
      execute: vi.fn().mockImplementation((_sql, _db, signal) => {
        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted", "AbortError"))
          })
        })
      }),
    })
    const engine = new QueryEngineImpl(port)

    const promise = engine.execute("SELECT 1")
    engine.cancel()

    const result = await promise
    expect(result).toBeNull()
  })

  it("非中止错误正常抛出", async () => {
    const port = createMockPort({
      execute: vi.fn().mockRejectedValue(new Error("Server error")),
    })
    const engine = new QueryEngineImpl(port)

    await expect(engine.execute("SELECT 1")).rejects.toThrow("Server error")
  })
})
