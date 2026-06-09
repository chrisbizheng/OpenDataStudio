import { describe, expect, it } from "vitest"
import { shouldLoadNextResultWindow } from "../incremental-loading"

describe("shouldLoadNextResultWindow", () => {
  it("接近结果窗口底部时触发增量加载", () => {
    expect(
      shouldLoadNextResultWindow({
        scrollTop: 940,
        clientHeight: 100,
        scrollHeight: 1100,
      })
    ).toBe(true)
  })
})
