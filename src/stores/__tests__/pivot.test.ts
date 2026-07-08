import { describe, it, expect, beforeEach } from "vitest"
import { usePivotConfigStore } from "../pivot-config"
import { resetAllPivot } from "../pivot-facade"
import { buildPivotIndicatorTitle } from "@/lib/pivot-client-utils"

describe("usePivotConfigStore", () => {
  beforeEach(() => {
    resetAllPivot()
  })

  it("相同指标 key 不会重复添加", () => {
    const indicator = { key: "sales_sum", field: "sales", title: "sales", aggregation: "SUM" as const }

    usePivotConfigStore.getState().addIndicator(indicator)
    usePivotConfigStore.getState().addIndicator(indicator)

    expect(usePivotConfigStore.getState().indicators).toEqual([indicator])
  })

  it("修改聚合后更新 key 和 title，允许同字段再添加", () => {
    usePivotConfigStore.getState().addIndicator({ key: "sales-SUM", field: "sales", title: "sales-SUM", aggregation: "SUM" as const })
    expect(usePivotConfigStore.getState().indicators).toHaveLength(1)

    const newKey = buildPivotIndicatorTitle("sales", "AVG")
    usePivotConfigStore.getState().updateIndicator("sales-SUM", { aggregation: "AVG" as const, key: newKey, title: newKey })
    expect(usePivotConfigStore.getState().indicators[0].key).toBe("sales-AVG")
    expect(usePivotConfigStore.getState().indicators[0].aggregation).toBe("AVG")

    usePivotConfigStore.getState().addIndicator({ key: "sales-SUM", field: "sales", title: "sales-SUM", aggregation: "SUM" as const })
    expect(usePivotConfigStore.getState().indicators).toHaveLength(2)
    expect(usePivotConfigStore.getState().indicators.map((i) => i.key).sort()).toEqual(["sales-AVG", "sales-SUM"])
  })

  it("添加和更新筛选器", () => {
    usePivotConfigStore.getState().addFilter({ field: "region", op: "IN", value: ["华东"] })
    expect(usePivotConfigStore.getState().filters).toEqual([
      { field: "region", op: "IN", value: ["华东"] },
    ])

    usePivotConfigStore.getState().updateFilter("region", { op: "=", value: "华南" })
    expect(usePivotConfigStore.getState().filters).toEqual([
      { field: "region", op: "=", value: "华南" },
    ])
  })
})
