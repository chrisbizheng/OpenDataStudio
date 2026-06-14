import { describe, expect, it } from "vitest"
import { isMetricColumn } from "../column-utils"

describe("isMetricColumn", () => {
  it("以 sum_ 开头的列名被识别为指标", () => {
    expect(isMetricColumn("sum_sales")).toBe(true)
    expect(isMetricColumn("SUM_revenue")).toBe(true)
  })

  it("以 count_ 开头的列名被识别为指标", () => {
    expect(isMetricColumn("count_orders")).toBe(true)
    expect(isMetricColumn("Count")).toBe(true)
  })

  it("以 avg_ 开头的列名被识别为指标", () => {
    expect(isMetricColumn("avg_price")).toBe(true)
    expect(isMetricColumn("AVG_Value")).toBe(true)
  })

  it("以 total_ 开头的列名被识别为指标", () => {
    expect(isMetricColumn("total_amount")).toBe(true)
  })

  it("以 revenue 开头的列名被识别为指标", () => {
    expect(isMetricColumn("revenue")).toBe(true)
    expect(isMetricColumn("revenue_2024")).toBe(true)
  })

  it("以 sales 开头的列名被识别为指标", () => {
    expect(isMetricColumn("sales")).toBe(true)
  })

  it("以 amount 开头的列名被识别为指标", () => {
    expect(isMetricColumn("amount")).toBe(true)
  })

  it("以 pct 或 percent 开头的列名被识别为指标", () => {
    expect(isMetricColumn("pct_growth")).toBe(true)
    expect(isMetricColumn("percent_change")).toBe(true)
  })

  it("以 price 开头的列名被识别为指标", () => {
    expect(isMetricColumn("price")).toBe(true)
  })

  it("以 profit 开头的列名被识别为指标", () => {
    expect(isMetricColumn("profit_margin")).toBe(true)
  })

  it("关键字不在开头时返回 false", () => {
    expect(isMetricColumn("user_count")).toBe(false)
    expect(isMetricColumn("field_sales")).toBe(false)
    expect(isMetricColumn("product_revenue")).toBe(false)
  })

  it("非指标列名返回 false", () => {
    expect(isMetricColumn("user_id")).toBe(false)
    expect(isMetricColumn("name")).toBe(false)
    expect(isMetricColumn("city")).toBe(false)
    expect(isMetricColumn("order_date")).toBe(false)
    expect(isMetricColumn("category")).toBe(false)
  })

  it("空或 undefined 返回 false", () => {
    expect(isMetricColumn("")).toBe(false)
    expect(isMetricColumn(undefined)).toBe(false)
  })
})
