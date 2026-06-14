import { describe, expect, it } from "vitest"
import { buildNextPivotIndicator } from "../pivot-sql"

describe("buildNextPivotIndicator", () => {
  it("同一字段再次添加为不同聚合方式", () => {
    const first = buildNextPivotIndicator("sales", "销售额", [])
    const second = buildNextPivotIndicator("sales", "销售额", [first])

    expect(first).toMatchObject({ key: "sales-SUM", field: "sales", title: "sales-SUM", aggregation: "SUM", comment: "销售额" })
    expect(second).toMatchObject({ key: "sales-AVG", field: "sales", title: "sales-AVG", aggregation: "AVG", comment: "销售额" })
  })

  it("非数字字段默认使用 COUNT", () => {
    const indicator = buildNextPivotIndicator("category", "category", [], "String")
    expect(indicator).toMatchObject({ key: "category-COUNT", aggregation: "COUNT" })
  })

  it("非数字字段添加两次用 DISTINCT_COUNT", () => {
    const first = buildNextPivotIndicator("name", "name", [], "String")
    const second = buildNextPivotIndicator("name", "name", [first], "String")
    expect(first).toMatchObject({ aggregation: "COUNT" })
    expect(second).toMatchObject({ aggregation: "DISTINCT_COUNT" })
  })
})
