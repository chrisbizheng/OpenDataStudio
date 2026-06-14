import { describe, expect, it, vi, beforeEach } from "vitest"
import { parseLlmConfigFromHeader, buildLlmRequest, callLlm } from "../llm-client"

function mockRequest(headerValue: string | null): Request {
  return {
    headers: new Headers(
      headerValue ? { "x-llm-config": headerValue } : {}
    ),
  } as Request
}

describe("parseLlmConfigFromHeader", () => {
  it("解析有效的 base64 编码的 LLM 配置", () => {
    const config = {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
    }
    const encoded = btoa(JSON.stringify(config))
    const req = mockRequest(encoded)
    expect(parseLlmConfigFromHeader(req as never)).toEqual(config)
  })

  it("头部缺失时返回 null", () => {
    const req = mockRequest(null)
    expect(parseLlmConfigFromHeader(req as never)).toBeNull()
  })

  it("无效 base64 时返回 null", () => {
    const req = mockRequest("not-valid-base64!!!")
    expect(parseLlmConfigFromHeader(req as never)).toBeNull()
  })

  it("无效 JSON 时返回 null", () => {
    const encoded = btoa("{invalid json")
    const req = mockRequest(encoded)
    expect(parseLlmConfigFromHeader(req as never)).toBeNull()
  })
})

describe("buildLlmRequest", () => {
  it("构造正确的 API URL 和头（非 ollama）", () => {
    const config = {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
    }
    const result = buildLlmRequest(config)
    expect(result.apiUrl).toBe("https://api.openai.com/v1/chat/completions")
    expect(result.headers["Content-Type"]).toBe("application/json")
    expect(result.headers["Authorization"]).toBe("Bearer sk-test")
  })

  it("对 ollama 提供者省略 Authorization 头", () => {
    const config = {
      provider: "ollama",
      apiKey: "",
      baseUrl: "http://localhost:11434/v1",
      model: "llama3",
    }
    const result = buildLlmRequest(config)
    expect(result.apiUrl).toBe("http://localhost:11434/v1/chat/completions")
    expect(result.headers["Authorization"]).toBeUndefined()
  })

  it("未提供 baseUrl 时使用默认的 OpenAI URL", () => {
    const config = {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "",  // empty or missing
      model: "gpt-4o",
    }
    const result = buildLlmRequest(config)
    expect(result.apiUrl).toBe("https://api.openai.com/v1/chat/completions")
  })

  it("baseUrl 末尾斜杠被正确去除", () => {
    const config = {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1/",
      model: "gpt-4o",
    }
    const result = buildLlmRequest(config)
    expect(result.apiUrl).toBe("https://api.openai.com/v1/chat/completions")
  })
})

describe("callLlm", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("发送请求并返回消息内容", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Hello, world!" } }],
      }),
    } as unknown as Response)

    const config = {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
    }
    const result = await callLlm(config, [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hi" },
    ])

    expect(result).toBe("Hello, world!")
    expect(fetch).toHaveBeenCalledOnce()
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(fetchCall[0]).toBe("https://api.openai.com/v1/chat/completions")
    const body = JSON.parse(fetchCall[1].body)
    expect(body.model).toBe("gpt-4o")
    expect(body.messages).toHaveLength(2)
    expect(body.temperature).toBe(0.3)
  })

  it("LLM 返回非 ok 状态时抛出错误", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Invalid API key" } }),
    } as unknown as Response)

    const config = {
      provider: "openai",
      apiKey: "bad-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
    }

    await expect(
      callLlm(config, [{ role: "user", content: "Hi" }])
    ).rejects.toThrow("Invalid API key")
  })

  it("LLM 返回非 ok 状态且无法解析错误正文时抛出包含状态码的错误", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json")
      },
    } as unknown as Response)

    const config = {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "",
      model: "gpt-4o",
    }

    await expect(
      callLlm(config, [{ role: "user", content: "Hi" }])
    ).rejects.toThrow("HTTP 500")
  })

  it("choices 为空时返回空字符串", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
    } as unknown as Response)

    const config = {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "",
      model: "gpt-4o",
    }
    const result = await callLlm(config, [
      { role: "user", content: "Hi" },
    ])
    expect(result).toBe("")
  })

  it("传递自定义 temperature", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
      }),
    } as unknown as Response)

    const config = {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "",
      model: "gpt-4o",
    }
    await callLlm(config, [{ role: "user", content: "Hi" }], {
      temperature: 0.9,
    })

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
    )
    expect(body.temperature).toBe(0.9)
  })

  it("传递自定义 model 会覆盖 config.model", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
      }),
    } as unknown as Response)

    const config = {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "",
      model: "gpt-4o",
    }
    await callLlm(config, [{ role: "user", content: "Hi" }], {
      model: "gpt-4-turbo",
    })

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
    )
    expect(body.model).toBe("gpt-4-turbo")
  })
})
