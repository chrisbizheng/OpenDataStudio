import { describe, it, expect } from "vitest"
import { migrateIndicatorKey } from "../migrate-pivot-store"

describe("migrateIndicatorKey", () => {
  it("迁移 sales_sum → sales-SUM", () => {
    expect(migrateIndicatorKey("sales_sum")).toBe("sales-SUM")
  })

  it("迁移 cost_avg → cost-AVG", () => {
    expect(migrateIndicatorKey("cost_avg")).toBe("cost-AVG")
  })

  it("迁移 id_count → id-COUNT", () => {
    expect(migrateIndicatorKey("id_count")).toBe("id-COUNT")
  })

  it("迁移 price_min → price-MIN", () => {
    expect(migrateIndicatorKey("price_min")).toBe("price-MIN")
  })

  it("迁移 price_max → price-MAX", () => {
    expect(migrateIndicatorKey("price_max")).toBe("price-MAX")
  })

  it("迁移 uid_distinct_count → uid-DISTINCT_COUNT", () => {
    expect(migrateIndicatorKey("uid_distinct_count")).toBe("uid-DISTINCT_COUNT")
  })

  it("已经是新格式的 key 不迁移", () => {
    expect(migrateIndicatorKey("sales-SUM")).toBeNull()
  })

  it("不含聚合后缀的 key 不迁移", () => {
    expect(migrateIndicatorKey("profit_rate")).toBeNull()
  })

  it("空 key 不迁移", () => {
    expect(migrateIndicatorKey("")).toBeNull()
  })

  it("仅后缀无前缀不迁移", () => {
    expect(migrateIndicatorKey("_sum")).toBeNull()
  })
})
