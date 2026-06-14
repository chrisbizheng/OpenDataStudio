import { describe, it, expect } from "vitest"
import { buildDistinctFilterValuesSQL, toggleFilterValue } from "../pivot-sql"

describe("pivot filter values", () => {
  it("为字段筛选值生成去重查询", () => {
    expect(buildDistinctFilterValuesSQL("db", "sales", "region")).toBe(
      "SELECT DISTINCT `region` AS `value`\nFROM `db`.`sales`\nWHERE `region` IS NOT NULL\nORDER BY `region`\nLIMIT 200"
    )
  })

  it("切换筛选值", () => {
    expect(toggleFilterValue(["华东"], "华南")).toEqual(["华东", "华南"])
    expect(toggleFilterValue(["华东", "华南"], "华东")).toEqual(["华南"])
  })
})
