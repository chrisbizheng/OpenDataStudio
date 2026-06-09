import { describe, expect, it } from "vitest"
import { createGridFilter } from "../grid-filter"

describe("createGridFilter", () => {
  it("相同 rows 引用和搜索词重复过滤时复用结果引用", () => {
    const rows = [["华东", 10], ["华南", 20]]
    const filter = createGridFilter()

    const first = filter(rows, "华东")
    const second = filter(rows, "华东")

    expect(first).toEqual([["华东", 10]])
    expect(second).toBe(first)
  })
})
