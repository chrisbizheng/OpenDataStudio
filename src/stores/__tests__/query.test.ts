import { describe, expect, it } from "vitest"
import { getFilteredRows } from "../query"

describe("getFilteredRows", () => {
  it("空搜索时保留原始行引用", () => {
    const rows = [["华东", 10], ["华南", 20]]

    expect(getFilteredRows(rows, "")).toBe(rows)
    expect(getFilteredRows(rows, "   ")).toBe(rows)
  })
})
