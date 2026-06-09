import { describe, expect, it } from "vitest"
import { buildNextResultWindowSql, inferStableOrder } from "../stable-result-order"

describe("inferStableOrder", () => {
  it("优先使用时间字段倒序形成稳定结果顺序", () => {
    expect(
      inferStableOrder([
        { name: "region", type: "String" },
        { name: "event_time", type: "DateTime" },
      ])
    ).toEqual({ field: "event_time", direction: "DESC" })
  })

  it("没有时间字段时使用 id 字段升序形成稳定结果顺序", () => {
    expect(
      inferStableOrder([
        { name: "region", type: "String" },
        { name: "order_id", type: "UInt64" },
      ])
    ).toEqual({ field: "order_id", direction: "ASC" })
  })

  it("加载下一个结果窗口时保留稳定结果顺序", () => {
    expect(
      buildNextResultWindowSql("analytics", "orders", { field: "event_time", direction: "DESC" }, 1000)
    ).toBe("SELECT * FROM `analytics`.`orders` ORDER BY `event_time` DESC LIMIT 1000 OFFSET 1000")
  })
})
