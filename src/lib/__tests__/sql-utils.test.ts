import { describe, expect, it } from "vitest"
import { escapeField, validateDirection, escapeValue, escapeLikeValue } from "../sql-utils"

describe("escapeField", () => {
  it("wraps name in backticks", () => {
    expect(escapeField("name")).toBe("`name`")
  })

  it("escapes embedded backticks", () => {
    expect(escapeField("na`me")).toBe("`na``me`")
  })
})

describe("validateDirection", () => {
  it("accepts ASC", () => {
    expect(validateDirection("ASC")).toBe("ASC")
  })

  it("accepts DESC", () => {
    expect(validateDirection("DESC")).toBe("DESC")
  })

  it("accepts lowercase", () => {
    expect(validateDirection("asc")).toBe("ASC")
  })

  it("rejects invalid direction", () => {
    expect(() => validateDirection("INVALID")).toThrow("Invalid SQL direction")
  })

  it("rejects SQL injection", () => {
    expect(() => validateDirection("ASC; DROP TABLE")).toThrow("Invalid SQL direction")
  })
})

describe("escapeValue", () => {
  it("wraps string in single quotes", () => {
    expect(escapeValue("hello")).toBe("'hello'")
  })

  it("escapes embedded single quotes", () => {
    expect(escapeValue("it's")).toBe("'it''s'")
  })

  it("handles numbers", () => {
    expect(escapeValue(42)).toBe("'42'")
  })

  it("handles null", () => {
    expect(escapeValue(null)).toBe("''")
  })

  it("handles undefined", () => {
    expect(escapeValue(undefined)).toBe("''")
  })
})

describe("escapeLikeValue", () => {
  it("escapes percent sign", () => {
    expect(escapeLikeValue("100%")).toBe("'100\\%'")
  })

  it("escapes underscore", () => {
    expect(escapeLikeValue("a_b")).toBe("'a\\_b'")
  })

  it("escapes backslash", () => {
    expect(escapeLikeValue("a\\b")).toBe("'a\\\\b'")
  })

  it("escapes single quotes", () => {
    expect(escapeLikeValue("it's")).toBe("'it''s'")
  })
})
