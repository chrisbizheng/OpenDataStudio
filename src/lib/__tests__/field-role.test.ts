import { describe, it, expect } from "vitest"
import { createFieldRoleKey, getFieldRole, getNextFieldRole, parseFieldRoleKey } from "../field-role"

describe("getFieldRole", () => {
  it("根据字段类型推断默认字段角色", () => {
    expect(getFieldRole("String")?.role).toBe("dimension")
    expect(getFieldRole("Int64")?.role).toBe("indicator")
    expect(getFieldRole("Array(String)")).toBeNull()
  })

  it("用户角色覆盖优先于默认角色", () => {
    expect(getFieldRole("String", "indicator")).toEqual({
      role: "indicator",
      defaultRole: "dimension",
      isOverridden: true,
    })
  })

  it("字段角色键支持包含点号的库表列名", () => {
    const key = createFieldRoleKey("db.prod", "sales.fact", "order.amount")

    expect(parseFieldRoleKey(key)).toEqual({
      database: "db.prod",
      table: "sales.fact",
      column: "order.amount",
    })
  })

  it("字段角色徽章单击时在维度和指标之间切换", () => {
    expect(getNextFieldRole("dimension")).toBe("indicator")
    expect(getNextFieldRole("indicator")).toBe("dimension")
  })
})
