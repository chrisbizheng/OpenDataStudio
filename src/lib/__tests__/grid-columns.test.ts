import { describe, expect, it } from "vitest"
import { buildGridColumns } from "../grid-columns"

describe("buildGridColumns", () => {
  it("按查询结果列顺序附加 schema 元信息", () => {
    expect(
      buildGridColumns(["amount", "region"], [
        { name: "region", type: "String", comment: "区域" },
        { name: "amount", type: "Decimal(10, 2)", comment: "金额" },
      ])
    ).toEqual([
      { name: "amount", type: "Decimal(10, 2)", comment: "金额" },
      { name: "region", type: "String", comment: "区域" },
    ])
  })
})
