import { describe, it, expect } from "vitest"
import { getLocalRecommendations } from "../calc-recommendations"
import { toSQL } from "../calculated-indicator-expression"
import type { PivotIndicator, CalculatedIndicator } from "../pivot-sql"

const makeIndicator = (key: string, field: string, aggregation: PivotIndicator["aggregation"] = "SUM"): PivotIndicator => ({
  key,
  field,
  title: `${field}.[${aggregation}]`,
  aggregation,
})

describe("getLocalRecommendations", () => {
  it("有收入和成本时推荐利润", () => {
    const indicators = [makeIndicator("sales_sum", "sales"), makeIndicator("cost_sum", "cost")]
    const recs = getLocalRecommendations(indicators, [])
    const profit = recs.find((r) => r.key === "profit")
    expect(profit).toBeDefined()
    expect(profit!.logic.type).toBe("call")
  })

  it("有收入和成本时推荐利润率", () => {
    const indicators = [makeIndicator("sales_sum", "sales"), makeIndicator("cost_sum", "cost")]
    const recs = getLocalRecommendations(indicators, [])
    const profitRate = recs.find((r) => r.key === "profit_rate")
    expect(profitRate).toBeDefined()
    expect(profitRate!.format).toBe("percent")
  })

  it("有毛利时推荐毛利率", () => {
    const indicators = [makeIndicator("gross_profit_sum", "gross_profit"), makeIndicator("sales_sum", "sales")]
    const recs = getLocalRecommendations(indicators, [])
    const gm = recs.find((r) => r.key === "gross_margin")
    expect(gm).toBeDefined()
    expect(gm!.format).toBe("percent")
  })

  it("不推荐已存在的计算指标", () => {
    const indicators = [makeIndicator("sales_sum", "sales"), makeIndicator("cost_sum", "cost")]
    const existing: CalculatedIndicator[] = [{
      key: "profit", title: "利润",
      logic: { type: "call", func: "minus", args: [
        { type: "ref", key: "sales_sum" },
        { type: "ref", key: "cost_sum" },
      ]},
    }]
    const recs = getLocalRecommendations(indicators, existing)
    expect(recs.some((r) => r.key === "profit")).toBe(false)
  })

  it("无量级字段时不推荐占比", () => {
    const indicators = [makeIndicator("id_count", "id", "COUNT")]
    const recs = getLocalRecommendations(indicators, [])
    expect(recs.some((r) => r.key.includes("ratio"))).toBe(false)
  })

  it("有量级字段时推荐占比", () => {
    const indicators = [makeIndicator("sales_sum", "sales")]
    const recs = getLocalRecommendations(indicators, [])
    const ratio = recs.find((r) => r.key === "sales_ratio")
    expect(ratio).toBeDefined()
    expect(ratio!.format).toBe("percent")
    expect(ratio!.logic.type).toBe("call")
  })

  it("占比推荐中的 agg 节点在 useWindow=true 时生成 OVER()", () => {
    const indicators = [makeIndicator("sales_sum", "sales")]
    const recs = getLocalRecommendations(indicators, [])
    const ratio = recs.find((r) => r.key === "sales_ratio")!
    const refSQLMap = { sales_sum: "SUM(`sales`)" }
    const sql = toSQL(ratio.logic, refSQLMap, { useWindow: true })
    expect(sql).toContain("SUM(`sales`) OVER()")
  })
})
