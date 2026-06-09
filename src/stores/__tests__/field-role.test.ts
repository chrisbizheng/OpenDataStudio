import { describe, it, expect, beforeEach } from "vitest"
import { useFieldRoleStore } from "../field-role"

describe("useFieldRoleStore", () => {
  beforeEach(() => {
    useFieldRoleStore.setState({ overrides: {} })
  })

  it("保存并清除字段角色覆盖", () => {
    const store = useFieldRoleStore.getState()

    store.setOverride("db", "table", "amount", "dimension")
    expect(useFieldRoleStore.getState().getOverride("db", "table", "amount")).toBe("dimension")

    useFieldRoleStore.getState().clearOverride("db", "table", "amount")
    expect(useFieldRoleStore.getState().getOverride("db", "table", "amount")).toBeUndefined()
  })
})
