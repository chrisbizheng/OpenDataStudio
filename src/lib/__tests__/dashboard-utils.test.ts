import { describe, it, expect } from "vitest"
import { toRGLLayout } from "@/lib/dashboard-utils"
import type { WidgetLayout } from "@/stores/dashboards"

describe("toRGLLayout", () => {
  it("maps WidgetLayout to react-grid-layout Layout", () => {
    const layouts: WidgetLayout[] = [
      { i: "w1", x: 0, y: 0, w: 6, h: 4 },
    ]
    const result = toRGLLayout(layouts)
    expect(result).toEqual([
      { i: "w1", x: 0, y: 0, w: 6, h: 4 },
    ])
  })

  it("includes minW and minH when present", () => {
    const layouts: WidgetLayout[] = [
      { i: "w1", x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 2 },
    ]
    const result = toRGLLayout(layouts)
    expect(result[0]).toHaveProperty("minW", 3)
    expect(result[0]).toHaveProperty("minH", 2)
  })

  it("omits minW/minH when absent", () => {
    const layouts: WidgetLayout[] = [
      { i: "w1", x: 0, y: 0, w: 6, h: 4 },
    ]
    const result = toRGLLayout(layouts)
    expect(result[0]).not.toHaveProperty("minW")
    expect(result[0]).not.toHaveProperty("minH")
  })

  it("handles empty array", () => {
    expect(toRGLLayout([])).toEqual([])
  })
})
