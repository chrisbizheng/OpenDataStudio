import { describe, it, expect, beforeEach } from "vitest"
import { usePivotStore } from "../pivot"
import { buildPivotIndicatorTitle } from "@/lib/pivot-client-utils"

describe("usePivotStore", () => {
  beforeEach(() => {
    usePivotStore.getState().reset()
  })

  it("相同指标 key 不会重复添加", () => {
    const indicator = { key: "sales_sum", field: "sales", title: "sales", aggregation: "SUM" as const }

    usePivotStore.getState().addIndicator(indicator)
    usePivotStore.getState().addIndicator(indicator)

    expect(usePivotStore.getState().indicators).toEqual([indicator])
  })

  it("修改聚合后更新 key 和 title，允许同字段再添加", () => {
    usePivotStore.getState().addIndicator({ key: "sales-SUM", field: "sales", title: "sales-SUM", aggregation: "SUM" as const })
    expect(usePivotStore.getState().indicators).toHaveLength(1)

    const newKey = buildPivotIndicatorTitle("sales", "AVG")
    usePivotStore.getState().updateIndicator("sales-SUM", { aggregation: "AVG" as const, key: newKey, title: newKey })
    expect(usePivotStore.getState().indicators[0].key).toBe("sales-AVG")
    expect(usePivotStore.getState().indicators[0].aggregation).toBe("AVG")

    usePivotStore.getState().addIndicator({ key: "sales-SUM", field: "sales", title: "sales-SUM", aggregation: "SUM" as const })
    expect(usePivotStore.getState().indicators).toHaveLength(2)
    expect(usePivotStore.getState().indicators.map((i) => i.key).sort()).toEqual(["sales-AVG", "sales-SUM"])
  })

  it("添加和更新筛选器", () => {
    usePivotStore.getState().addFilter({ field: "region", op: "IN", value: ["华东"] })
    expect(usePivotStore.getState().filters).toEqual([
      { field: "region", op: "IN", value: ["华东"] },
    ])

    usePivotStore.getState().updateFilter("region", { op: "=", value: "华南" })
    expect(usePivotStore.getState().filters).toEqual([
      { field: "region", op: "=", value: "华南" },
    ])
  })
})
