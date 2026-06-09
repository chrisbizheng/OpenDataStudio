import { describe, it, expect, beforeEach } from "vitest"
import { usePivotStore } from "../pivot"

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
