import { describe, it, expect } from "vitest"
import { resolveDrop } from "../pivot-dnd"

describe("resolveDrop", () => {
  it("允许维度字段拖入行维度区", () => {
    expect(resolveDrop({ source: "schema", field: "region", role: "dimension" }, "rows")).toEqual({
      type: "add-row",
      field: "region",
    })
  })

  it("拒绝维度字段拖入指标区", () => {
    expect(resolveDrop({ source: "schema", field: "region", role: "dimension" }, "indicators")).toBeNull()
  })
})
