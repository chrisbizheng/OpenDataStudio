import { describe, expect, it, vi, beforeEach } from "vitest"
import { buildAgentHeaders, fetchAgentDirections, fetchAgentQuestions } from "../agent-client"

vi.mock("../llm-client", () => ({
  buildLlmHeaders: vi.fn(),
}))

vi.mock("../client-logger", () => ({
  getTraceId: vi.fn(() => "mock-trace-id"),
}))

import { buildLlmHeaders } from "../llm-client"

beforeEach(() => {
  vi.restoreAllMocks()
  vi.mocked(buildLlmHeaders).mockReturnValue({ "x-llm-config": "bW9jay1jb25maWc=" })
})

describe("buildAgentHeaders", () => {
  it("组合 Content-Type、x-llm-config 和 x-trace-id", () => {
    const config = {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "",
      model: "gpt-4o",
    }
    const headers = buildAgentHeaders(config, "trace-123")
    expect(headers["Content-Type"]).toBe("application/json")
    expect(headers["x-llm-config"]).toBe("bW9jay1jb25maWc=")
    expect(headers["x-trace-id"]).toBe("trace-123")
  })
})

describe("fetchAgentDirections", () => {
  it("成功时返回解析后的方向数据", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        directions: [
          { label: "下钻", prompt: "SELECT ..." },
          { label: "对比", prompt: "SELECT ..." },
        ],
      }),
    } as Response)

    const result = await fetchAgentDirections(
      { provider: "openai", apiKey: "sk", baseUrl: "", model: "gpt-4o" },
      {
        context: { currentTable: "sales", schema: [], database: "db" },
        clicked: { key: "北京", value: 100, row: {} },
        visualization: { type: "bar", xKey: "city" },
        columns: ["city", "sales"],
        localDirections: [],
        lang: "zh",
      }
    )

    expect(result).toHaveLength(2)
    expect(result[0].label).toBe("下钻")
  })

  it("最多返回 4 个方向", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        directions: [
          { label: "a", prompt: "1" },
          { label: "b", prompt: "2" },
          { label: "c", prompt: "3" },
          { label: "d", prompt: "4" },
          { label: "e", prompt: "5" },
          { label: "f", prompt: "6" },
        ],
      }),
    } as Response)

    const result = await fetchAgentDirections(
      { provider: "openai", apiKey: "sk", baseUrl: "", model: "gpt-4o" },
      {
        context: { currentTable: null, schema: [], database: null },
        clicked: { key: "x", value: 0, row: {} },
        visualization: { type: "bar", xKey: "x" },
        columns: [],
        localDirections: [],
        lang: "en",
      }
    )

    expect(result).toHaveLength(4)
  })

  it("非 ok 状态时返回空数组", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)

    const result = await fetchAgentDirections(
      { provider: "openai", apiKey: "sk", baseUrl: "", model: "gpt-4o" },
      {
        context: { currentTable: null, schema: [], database: null },
        clicked: { key: "x", value: 0, row: {} },
        visualization: { type: "bar", xKey: "x" },
        columns: [],
        localDirections: [],
        lang: "en",
      }
    )

    expect(result).toEqual([])
  })
})

describe("fetchAgentQuestions", () => {
  it("成功时返回解析后的问题", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: ["问题1", "问题2", "问题3"],
      }),
    } as Response)

    const result = await fetchAgentQuestions(
      { provider: "openai", apiKey: "sk", baseUrl: "", model: "gpt-4o" },
      {
        context: { currentTable: null, schema: [], database: null },
        localQuestions: [],
        lang: "zh",
      }
    )

    expect(result).toHaveLength(3)
  })

  it("最多返回 5 个问题", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: ["1", "2", "3", "4", "5", "6", "7"],
      }),
    } as Response)

    const result = await fetchAgentQuestions(
      { provider: "openai", apiKey: "sk", baseUrl: "", model: "gpt-4o" },
      {
        context: { currentTable: null, schema: [], database: null },
        localQuestions: [],
        lang: "en",
      }
    )

    expect(result).toHaveLength(5)
  })

  it("非 ok 状态时返回空数组", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)

    const result = await fetchAgentQuestions(
      { provider: "openai", apiKey: "sk", baseUrl: "", model: "gpt-4o" },
      {
        context: { currentTable: null, schema: [], database: null },
        localQuestions: [],
        lang: "en",
      }
    )

    expect(result).toEqual([])
  })

  it("网络错误时抛出异常", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"))

    await expect(
      fetchAgentQuestions(
        { provider: "openai", apiKey: "sk", baseUrl: "", model: "gpt-4o" },
        {
          context: { currentTable: null, schema: [], database: null },
          localQuestions: [],
          lang: "en",
        }
      )
    ).rejects.toThrow("Network error")
  })
})
