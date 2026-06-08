import { describe, expect, it } from "vitest"
import { getChartNodeContext } from "../chart-node-context"

describe("getChartNodeContext", () => {
  it("从点击行中提取维度字段并排除度量字段", () => {
    const context = getChartNodeContext({
      item: {
        key: "北京",
        value: 12345,
        row: { city: "北京", channel: "线上", sales: 12345 },
      },
      visualization: {
        type: "bar",
        config: { xKey: "city", yKey: "sales" },
      },
      lang: "zh",
    })

    expect(context.dimensions).toEqual([
      ["city", "北京"],
      ["channel", "线上"],
    ])
    expect(context.metricLabel).toBe("sales")
    expect(context.metricValue).toBe("12,345")
  })

  it("多 series 点击优先显示被点击的 seriesName", () => {
    const context = getChartNodeContext({
      item: {
        key: "北京",
        value: 3200,
        row: { city: "北京", sales: 12345, profit: 3200 },
        seriesName: "利润",
      },
      visualization: {
        type: "composed",
        config: {
          xKey: "city",
          series: [
            { yKey: "sales", label: "销售额" },
            { yKey: "profit", label: "利润" },
          ],
        },
      },
      lang: "zh",
    })

    expect(context.dimensions).toEqual([["city", "北京"]])
    expect(context.metricLabel).toBe("利润")
    expect(context.metricValue).toBe("3,200")
  })

  it("行数据缺失维度时回退到 xKey 和 key", () => {
    const context = getChartNodeContext({
      item: {
        key: "北京",
        value: 12345,
        row: { sales: 12345 },
      },
      visualization: {
        type: "bar",
        config: { xKey: "city", yKey: "sales" },
      },
      lang: "zh",
    })

    expect(context.dimensions).toEqual([["city", "北京"]])
  })
})
