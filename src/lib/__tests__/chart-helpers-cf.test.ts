import { describe, it, expect } from "vitest"
import { evaluateConditionalFormatting } from "@/lib/chart-helpers"
import type { ConditionalFormattingRule } from "@/lib/chart-types"

const chartData = [
  { name: "A", value: 10 },
  { name: "B", value: 25 },
  { name: "C", value: 5 },
  { name: "D", value: null },
]

describe("evaluateConditionalFormatting", () => {
  it("no rules returns undefined", () => {
    const result = evaluateConditionalFormatting(
      { dataIndex: 0 },
      [],
      chartData,
      "name",
    )
    expect(result).toBeUndefined()
  })

  it("single rule > match returns color", () => {
    const rules: ConditionalFormattingRule[] = [
      { id: "1", column: "value", operator: ">", value: 15, color: "#ef4444" },
    ]
    const result = evaluateConditionalFormatting(
      { dataIndex: 1 },
      rules,
      chartData,
      "name",
    )
    expect(result).toBe("#ef4444")
  })

  it("single rule > no match returns undefined", () => {
    const rules: ConditionalFormattingRule[] = [
      { id: "1", column: "value", operator: ">", value: 15, color: "#ef4444" },
    ]
    const result = evaluateConditionalFormatting(
      { dataIndex: 0 },
      rules,
      chartData,
      "name",
    )
    expect(result).toBeUndefined()
  })

  it("multiple rules first match wins", () => {
    const rules: ConditionalFormattingRule[] = [
      { id: "1", column: "value", operator: ">", value: 20, color: "#ef4444" },
      { id: "2", column: "value", operator: ">", value: 5, color: "#f59e0b" },
    ]
    // dataIndex 1 has value 25, first rule matches (25 > 20)
    const result = evaluateConditionalFormatting(
      { dataIndex: 1 },
      rules,
      chartData,
      "name",
    )
    expect(result).toBe("#ef4444")
  })

  it("= operator match", () => {
    const rules: ConditionalFormattingRule[] = [
      { id: "1", column: "value", operator: "=", value: 10, color: "#22c55e" },
    ]
    const result = evaluateConditionalFormatting(
      { dataIndex: 0 },
      rules,
      chartData,
      "name",
    )
    expect(result).toBe("#22c55e")
  })

  it("!= operator no match when column value equals rule value", () => {
    const rules: ConditionalFormattingRule[] = [
      { id: "1", column: "value", operator: "!=", value: 10, color: "#ef4444" },
    ]
    // dataIndex 0 has value 10, which equals rule value, so != should not match
    const result = evaluateConditionalFormatting(
      { dataIndex: 0 },
      rules,
      chartData,
      "name",
    )
    expect(result).toBeUndefined()
  })

  it("invalid number in data returns undefined (NaN comparison false)", () => {
    const rules: ConditionalFormattingRule[] = [
      { id: "1", column: "value", operator: ">", value: 0, color: "#ef4444" },
    ]
    // dataIndex 3 has value null, Number(null) = 0, which is NOT > 0
    const result = evaluateConditionalFormatting(
      { dataIndex: 3 },
      rules,
      chartData,
      "name",
    )
    expect(result).toBeUndefined()
  })
})
