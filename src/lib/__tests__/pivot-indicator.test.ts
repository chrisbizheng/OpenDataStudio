import { describe, expect, it } from "vitest"
import { buildNextPivotIndicator } from "../pivot-indicator"

describe("buildNextPivotIndicator", () => {
  it("同一字段再次添加为不同聚合方式", () => {
    const first = buildNextPivotIndicator("sales", "销售额", [])
    const second = buildNextPivotIndicator("sales", "销售额", [first])

    expect(first).toMatchObject({ key: "sales_sum", field: "sales", title: "sales.[SUM]", aggregation: "SUM" })
    expect(second).toMatchObject({ key: "sales_avg", field: "sales", title: "sales.[AVG]", aggregation: "AVG" })
  })
})
