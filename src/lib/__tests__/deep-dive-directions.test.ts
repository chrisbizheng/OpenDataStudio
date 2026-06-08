import { describe, expect, it } from "vitest"
import { suggestDeepDiveDirections } from "../deep-dive-directions"

describe("suggestDeepDiveDirections", () => {
  it("优先推荐按额外维度下钻当前点击节点", () => {
    const directions = suggestDeepDiveDirections({
      item: {
        key: "北京",
        value: 12345,
        row: { city: "北京", sales: 12345 },
        seriesName: "sales",
      },
      visualizationConfig: { type: "bar", xKey: "city", yKey: "sales" },
      columns: ["city", "sales"],
      rowCount: 10,
      schema: [
        { name: "city", type: "String" },
        { name: "channel", type: "String" },
        { name: "sales", type: "Float64" },
      ],
      lang: "zh",
    })

    expect(directions[0].label).toContain("下钻")
    expect(directions[0].prompt).toContain("city = '北京'")
    expect(directions[0].prompt).toContain("channel")
    expect(directions[0].prompt).toContain("sales")
  })

  it("按下钻、对比、趋势、明细顺序返回最多四个方向", () => {
    const directions = suggestDeepDiveDirections({
      item: {
        key: "北京",
        value: 12345,
        row: { city: "北京", sales: 12345 },
      },
      visualizationConfig: { type: "bar", xKey: "city", yKey: "sales" },
      columns: ["city", "sales"],
      rowCount: 10,
      schema: [
        { name: "city", type: "String" },
        { name: "channel", type: "LowCardinality(String)" },
        { name: "order_date", type: "Date" },
        { name: "sales", type: "Float64" },
        { name: "profit", type: "Float64" },
      ],
      lang: "zh",
    })

    expect(directions).toHaveLength(4)
    expect(directions.map((d) => d.label)).toEqual([
      "下钻 北京 的 channel 构成",
      "对比 北京 与其他 city",
      "查看 北京 的 sales 时间趋势",
      "查询 北京 的明细",
    ])
  })

  it("主方向不足时按占比、关联、异常补位", () => {
    const directions = suggestDeepDiveDirections({
      item: {
        key: "北京",
        value: 12345,
        row: { city: "北京", sales: 12345 },
      },
      visualizationConfig: { type: "bar", xKey: "city", yKey: "sales" },
      columns: ["city", "sales"],
      rowCount: 1,
      schema: [
        { name: "city", type: "String" },
        { name: "sales", type: "Float64" },
        { name: "profit", type: "Float64" },
      ],
      lang: "zh",
    })

    expect(directions.map((d) => d.label)).toEqual([
      "查询 北京 的明细",
      "分析 北京 的占比",
      "分析 sales 与 profit 关系",
      "找出 sales 异常值",
    ])
  })

  it("英文界面输出英文方向并在 schema 为空时仍返回明细", () => {
    const directions = suggestDeepDiveDirections({
      item: {
        key: "London",
        value: 42,
        row: { city: "London", sales: 42 },
      },
      visualizationConfig: { type: "bar", xKey: "city", yKey: "sales" },
      columns: ["city", "sales"],
      schema: [],
      lang: "en",
    })

    expect(directions).toHaveLength(1)
    expect(directions[0].label).toBe("Query details for London")
    expect(directions[0].prompt).toContain("city = 'London'")
    expect(directions[0].prompt).toContain("sales")
  })
})
