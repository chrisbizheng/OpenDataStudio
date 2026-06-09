import { describe, expect, it } from "vitest"
import { t } from "../i18n"

describe("i18n", () => {
  it("说明搜索只作用于结果窗口", () => {
    expect(t("grid.window_search", "zh")).toBe("窗口搜索")
    expect(t("grid.window_search", "en")).toBe("Window search")
  })
})
