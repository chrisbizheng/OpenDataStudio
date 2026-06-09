import { describe, it, expect } from "vitest"
import { buildPivotRecords, filterAndSortPivotData } from "../pivot-client-data"

describe("filterAndSortPivotData", () => {
  it("无搜索和排序时保留原始数据引用，避免不必要复制", () => {
    const data = {
      columns: ["region", "sales"],
      rows: [["华东", 10], ["华南", 20]],
    }

    const result = filterAndSortPivotData(data, "", null, null)

    expect(result).toBe(data)
    expect(result.rows).toBe(data.rows)
  })

  it("搜索时只返回匹配行且不截断结果", () => {
    const data = {
      columns: ["region", "sales"],
      rows: [["华东", 10], ["华南", 20], ["华北", 30]],
    }

    const result = filterAndSortPivotData(data, "华", null, null)

    expect(result.rows).toHaveLength(3)
  })

  it("按数字列排序时不修改原始行顺序", () => {
    const data = {
      columns: ["region", "sales"],
      rows: [["华东", 10], ["华南", 30], ["华北", 20]],
    }

    const result = filterAndSortPivotData(data, "", "sales", "desc")

    expect(result.rows).toEqual([["华南", 30], ["华北", 20], ["华东", 10]])
    expect(data.rows).toEqual([["华东", 10], ["华南", 30], ["华北", 20]])
  })
})

describe("buildPivotRecords", () => {
  it("将二维数组转换为 VTable records", () => {
    const records = buildPivotRecords({
      columns: ["region", "sales"],
      rows: [["华东", 10]],
    })

    expect(records).toEqual([{ region: "华东", sales: 10 }])
  })
})
