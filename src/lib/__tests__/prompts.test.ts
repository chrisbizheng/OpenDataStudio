import { describe, expect, it } from "vitest"
import { buildChatSystemPrompt } from "../prompts/chat"
import { buildQuestionsSystemPrompt } from "../prompts/questions"
import { buildDirectionsSystemPrompt } from "../prompts/directions"
import { buildCalcIndicatorSystemPrompt } from "../prompts/calc-indicator"

describe("buildChatSystemPrompt", () => {
  const baseParams = {
    currentTable: "sales",
    database: "analytics",
    schema: [
      { name: "id", type: "UInt64" },
      { name: "amount", type: "Float64" },
    ],
  }

  it("英文版包含表名、数据库名和 schema", () => {
    const prompt = buildChatSystemPrompt("en", baseParams)
    expect(prompt).toContain("sales")
    expect(prompt).toContain("analytics")
    expect(prompt).toContain("id: UInt64")
    expect(prompt).toContain("amount: Float64")
    expect(prompt).toContain("Rules:")
  })

  it("中文版包含表名、数据库名和 schema", () => {
    const prompt = buildChatSystemPrompt("zh", baseParams)
    expect(prompt).toContain("sales")
    expect(prompt).toContain("analytics")
    expect(prompt).toContain("规则:")
  })

  it("空 schema 时不报错", () => {
    const prompt = buildChatSystemPrompt("en", { ...baseParams, schema: [] })
    expect(prompt).toContain("Schema: ")
  })

  it("表名缺失时使用 unknown", () => {
    const prompt = buildChatSystemPrompt("en", { ...baseParams, currentTable: null })
    expect(prompt).toContain("unknown")
  })

  it("两种语言返回不同内容", () => {
    const en = buildChatSystemPrompt("en", baseParams)
    const zh = buildChatSystemPrompt("zh", baseParams)
    expect(en).not.toBe(zh)
  })
})

describe("buildQuestionsSystemPrompt", () => {
  it("中文版包含问题推荐提示", () => {
    const prompt = buildQuestionsSystemPrompt("zh")
    expect(prompt).toContain("问题推荐")
    expect(prompt).toContain("questions")
  })

  it("英文版包含问题推荐提示", () => {
    const prompt = buildQuestionsSystemPrompt("en")
    expect(prompt).toContain("question recommendation")
    expect(prompt).toContain("questions")
  })

  it("两种语言返回不同内容", () => {
    expect(buildQuestionsSystemPrompt("zh")).not.toBe(buildQuestionsSystemPrompt("en"))
  })
})

describe("buildDirectionsSystemPrompt", () => {
  it("中文版包含深度分析方向提示", () => {
    const prompt = buildDirectionsSystemPrompt("zh")
    expect(prompt).toContain("深度分析")
    expect(prompt).toContain("directions")
  })

  it("英文版包含深度分析方向提示", () => {
    const prompt = buildDirectionsSystemPrompt("en")
    expect(prompt).toContain("deep-dive")
    expect(prompt).toContain("directions")
  })
})

describe("buildCalcIndicatorSystemPrompt", () => {
  const baseParams = {
    tableName: "orders",
    indicators: [
      { key: "revenue_sum", title: "收入", aggregation: "SUM", field: "revenue" },
      { key: "cost_sum", title: "成本", aggregation: "SUM", field: "cost" },
    ],
    schema: [
      { name: "revenue", type: "Float64" },
      { name: "cost", type: "Float64" },
    ],
  }

  it("中文版包含表名和指标列表", () => {
    const prompt = buildCalcIndicatorSystemPrompt("zh", baseParams)
    expect(prompt).toContain("orders")
    expect(prompt).toContain("revenue_sum")
    expect(prompt).toContain("cost_sum")
    expect(prompt).toContain("revenue (Float64)")
  })

  it("英文版包含表名和指标列表", () => {
    const prompt = buildCalcIndicatorSystemPrompt("en", baseParams)
    expect(prompt).toContain("orders")
    expect(prompt).toContain("revenue_sum")
    expect(prompt).toContain("Available fields")
  })

  it("空指标列表不报错", () => {
    const prompt = buildCalcIndicatorSystemPrompt("en", { ...baseParams, indicators: [] })
    expect(prompt).toContain("Current indicators:")
  })

  it("两种语言返回不同内容", () => {
    const en = buildCalcIndicatorSystemPrompt("en", baseParams)
    const zh = buildCalcIndicatorSystemPrompt("zh", baseParams)
    expect(en).not.toBe(zh)
  })
})
