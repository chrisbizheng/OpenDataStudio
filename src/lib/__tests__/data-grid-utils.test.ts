import { describe, it, expect } from "vitest"
import { textWidth, computeColumnWidths } from "../data-grid-utils"
import { formatType } from "../column-type-classifier"

describe("textWidth", () => {
  it("empty string returns base padding", () => {
    expect(textWidth("")).toBe(24)
  })

  it("ASCII characters use 8.5px each", () => {
    // "abc" = 3 × 8.5 + 24 = 49.5
    expect(textWidth("abc")).toBeCloseTo(49.5)
  })

  it("CJK characters use 12px each", () => {
    // "你好" = 2 × 12 + 24 = 48
    expect(textWidth("你好")).toBe(48)
  })

  it("mixed ASCII + CJK", () => {
    // "a你" = 8.5 + 12 + 24 = 44.5
    expect(textWidth("a你")).toBeCloseTo(44.5)
  })
})

describe("computeColumnWidths", () => {
  it("returns only row-number column width for empty columns", () => {
    expect(computeColumnWidths([], [], [])).toEqual([28])
  })

  it("computes widths for basic columns", () => {
    const cols = ["name", "age"]
    const rows: unknown[][] = [["Alice", 30], ["Bob", 25]]
    const gridCols = [
      { name: "name", type: "String" },
      { name: "age", type: "UInt8" },
    ]
    const widths = computeColumnWidths(cols, rows, gridCols)
    expect(widths).toHaveLength(3) // [rowNum, name, age]
    expect(widths[0]).toBe(28)
    // Each column should be within [64, 300]
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeGreaterThanOrEqual(64)
      expect(widths[i]).toBeLessThanOrEqual(300)
    }
  })

  it("clamps to minimum 64", () => {
    const cols = ["a"]
    const rows: unknown[][] = [[""]]
    const gridCols = [{ name: "a", type: "UInt8" }]
    const widths = computeColumnWidths(cols, rows, gridCols)
    expect(widths[1]).toBeGreaterThanOrEqual(64)
  })

  it("clamps to maximum 300", () => {
    const cols = ["a"]
    const longStr = "x".repeat(500)
    const rows: unknown[][] = [[longStr]]
    const gridCols = [{ name: "a", type: "String" }]
    const widths = computeColumnWidths(cols, rows, gridCols)
    expect(widths[1]).toBe(300)
  })

  it("uses only first 100 rows for width calculation", () => {
    const cols = ["a"]
    const shortRows = Array.from({ length: 100 }, () => ["x"])
    const longRows = [...shortRows, ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"]]
    const gridCols = [{ name: "a", type: "String" }]
    const widthsShort = computeColumnWidths(cols, shortRows, gridCols)
    const widthsLong = computeColumnWidths(cols, longRows, gridCols)
    // Row 101 should be ignored — widths identical
    expect(widthsShort).toEqual(widthsLong)
  })

  it("handles null/undefined cell values", () => {
    const cols = ["a"]
    const rows: unknown[][] = [[null], [undefined], [42]]
    const gridCols = [{ name: "a", type: "Nullable(UInt8)" }]
    const widths = computeColumnWidths(cols, rows, gridCols)
    expect(widths).toHaveLength(2)
    expect(widths[1]).toBeGreaterThanOrEqual(64)
  })

  it("includes type width in header when type present", () => {
    const cols = ["x"]
    const rows: unknown[][] = [[]]
    const gridColsWithLongType = [{ name: "x", type: "Array(String)" }]
    const gridColsNoType = [{ name: "x" }]
    const widthsWithType = computeColumnWidths(cols, rows, gridColsWithLongType)
    const widthsNoType = computeColumnWidths(cols, rows, gridColsNoType)
    // Type "Array(String)" via formatType should widen the header
    expect(widthsWithType[1]).toBeGreaterThanOrEqual(widthsNoType[1])
  })

  it("includes comment width in header when comment present", () => {
    const cols = ["x"]
    const rows: unknown[][] = [[]]
    const gridColsWithComment = [{ name: "x", type: "String", comment: "这是一个很长的列注释" }]
    const gridColsNoComment = [{ name: "x", type: "String" }]
    const widthsWithComment = computeColumnWidths(cols, rows, gridColsWithComment)
    const widthsNoComment = computeColumnWidths(cols, rows, gridColsNoComment)
    expect(widthsWithComment[1]).toBeGreaterThan(widthsNoComment[1])
  })
})
