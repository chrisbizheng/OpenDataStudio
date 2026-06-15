import { describe, it, expect } from "vitest"
import { CHART_TYPE_OPTIONS } from "@/lib/chart-constants"

describe("CHART_TYPE_OPTIONS", () => {
  it("has 9 chart types", () => {
    expect(CHART_TYPE_OPTIONS).toHaveLength(9)
  })

  it("includes bar and line as first entries", () => {
    expect(CHART_TYPE_OPTIONS[0].value).toBe("bar")
    expect(CHART_TYPE_OPTIONS[1].value).toBe("line")
  })

  it("includes composed as last entry", () => {
    expect(CHART_TYPE_OPTIONS[CHART_TYPE_OPTIONS.length - 1].value).toBe("composed")
  })

  it("each option has value and i18n key", () => {
    for (const opt of CHART_TYPE_OPTIONS) {
      expect(opt.value).toBeTruthy()
      expect(opt.key).toMatch(/^dashboard\.chart_type_/)
    }
  })
})
