import { describe, it, expect } from "vitest"
import {
  AGGREGATION_OPTIONS,
  aggregationShortLabel,
  formatLabel,
} from "../pivot-config-constants"

const mockT = (key: string): string => {
  const map: Record<string, string> = {
    "calc_ind.format_label_percent": "百分比 · {n}位",
    "calc_ind.format_label_currency": "货币 · {n}位",
    "calc_ind.format_label_number": "数字 · {n}位",
  }
  return map[key] ?? key
}

describe("AGGREGATION_OPTIONS", () => {
  it("contains 6 aggregation types", () => {
    expect(AGGREGATION_OPTIONS).toHaveLength(6)
  })

  it("has unique values", () => {
    const values = AGGREGATION_OPTIONS.map((o) => o.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it("includes SUM/AVG/COUNT/MIN/MAX/DISTINCT_COUNT", () => {
    const values = AGGREGATION_OPTIONS.map((o) => o.value)
    expect(values).toContain("SUM")
    expect(values).toContain("AVG")
    expect(values).toContain("COUNT")
    expect(values).toContain("MIN")
    expect(values).toContain("MAX")
    expect(values).toContain("DISTINCT_COUNT")
  })
})

describe("aggregationShortLabel", () => {
  it("returns short label for known aggregations", () => {
    expect(aggregationShortLabel("SUM")).toBe("SUM")
    expect(aggregationShortLabel("AVG")).toBe("AVG")
    expect(aggregationShortLabel("COUNT")).toBe("CNT")
    expect(aggregationShortLabel("MIN")).toBe("MIN")
    expect(aggregationShortLabel("MAX")).toBe("MAX")
    expect(aggregationShortLabel("DISTINCT_COUNT")).toBe("DCT")
  })

  it("returns input value as fallback for unknown aggregation", () => {
    expect(aggregationShortLabel("UNKNOWN" as never)).toBe("UNKNOWN")
  })
})

describe("formatLabel", () => {
  it("formats percent with default decimals", () => {
    expect(formatLabel({ format: "percent" }, mockT)).toBe("百分比 · 2位")
  })

  it("formats percent with custom decimals", () => {
    expect(formatLabel({ format: "percent", decimals: 0 }, mockT)).toBe("百分比 · 0位")
    expect(formatLabel({ format: "percent", decimals: 4 }, mockT)).toBe("百分比 · 4位")
  })

  it("formats currency with decimals", () => {
    expect(formatLabel({ format: "currency", decimals: 2 }, mockT)).toBe("货币 · 2位")
  })

  it("formats number with decimals", () => {
    expect(formatLabel({ format: "number", decimals: 3 }, mockT)).toBe("数字 · 3位")
  })

  it("defaults to number format when format missing", () => {
    expect(formatLabel({}, mockT)).toBe("数字 · 2位")
  })

  it("defaults to 2 decimals when decimals missing", () => {
    expect(formatLabel({ format: "currency" }, mockT)).toBe("货币 · 2位")
  })
})
