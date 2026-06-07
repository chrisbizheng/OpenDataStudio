import { describe, it, expect } from "vitest"
import {
  extractDependencies,
  validate,
  toSQL,
  parse,
} from "../expression"

describe("extractDependencies", () => {
  it("从表达式中提取 [[key]] 引用", () => {
    const deps = extractDependencies("[[profit_sum]] / [[sales_sum]]")
    expect(deps).toEqual(["profit_sum", "sales_sum"])
  })

  it("去重相同的引用", () => {
    const deps = extractDependencies("[[a]] + [[a]] + [[b]]")
    expect(deps).toEqual(["a", "b"])
  })

  it("无引用时返回空数组", () => {
    const deps = extractDependencies("1 + 2")
    expect(deps).toEqual([])
  })

  it("处理带空格的 key", () => {
    const deps = extractDependencies("[[ my_key ]]")
    expect(deps).toEqual(["my_key"])
  })

  it("处理多个不同指标", () => {
    const deps = extractDependencies("([[a]] - [[b]]) / [[c]]")
    expect(deps).toEqual(["a", "b", "c"])
  })
})

describe("validate", () => {
  const available = ["sales_sum", "profit_sum", "cost_sum"]

  it("有效表达式返回 valid: true", () => {
    const result = validate("[[sales_sum]] - [[cost_sum]]", available)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("引用不存在的指标返回错误", () => {
    const result = validate("[[unknown]] / [[sales_sum]]", available)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("unknown")
  })

  it("多个无效引用都报告", () => {
    const result = validate("[[x]] + [[y]]", available)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(2)
  })

  it("纯数字表达式无指标引用但有运算符时不报错", () => {
    const result = validate("100 * 0.1", available)
    expect(result.valid).toBe(true)
  })

  it("纯运算符表达式不算错误", () => {
    const result = validate("1 + 2", available)
    // 纯运算符没有引用但有运算符，不算错误
    expect(result.valid).toBe(true)
  })
})

describe("toSQL", () => {
  const indicatorMap: Record<string, string> = {
    sales_sum: "SUM(`sales`)",
    profit_sum: "SUM(`profit`)",
    cost_sum: "SUM(`cost`)",
  }

  it("将 [[key]] 替换为 SQL 聚合表达式，除法自动注入 NULLIF", () => {
    const sql = toSQL("[[profit_sum]] / [[sales_sum]]", indicatorMap)
    expect(sql).toContain("(SUM(`profit`))")
    expect(sql).toContain("NULLIF")
    expect(sql).toContain(", 0)")
  })

  it("自动注入 NULLIF 防止除零", () => {
    const sql = toSQL("[[profit_sum]] / [[sales_sum]]", indicatorMap)
    expect(sql).toContain("NULLIF")
    expect(sql).toContain(", 0)")
  })

  it("非除法不注入 NULLIF", () => {
    const sql = toSQL("[[sales_sum]] + [[cost_sum]]", indicatorMap)
    expect(sql).not.toContain("NULLIF")
  })

  it("缺失的指标生成注释", () => {
    const sql = toSQL("[[missing_key]]", indicatorMap)
    expect(sql).toContain("/* missing: missing_key */")
  })

  it("复合表达式正确转换", () => {
    const sql = toSQL("([[sales_sum]] - [[cost_sum]]) / [[sales_sum]]", indicatorMap)
    expect(sql).toContain("(SUM(`sales`))")
    expect(sql).toContain("(SUM(`cost`))")
    expect(sql).toContain("NULLIF")
  })
})

describe("parse", () => {
  it("返回完整解析结果", () => {
    const map: Record<string, string> = {
      a: "SUM(`a`)",
      b: "SUM(`b`)",
    }
    const result = parse("[[a]] / [[b]]", map)
    expect(result.raw).toBe("[[a]] / [[b]]")
    expect(result.refs).toEqual(["a", "b"])
    expect(result.sql).toContain("SUM(`a`)")
    expect(result.sql).toContain("NULLIF")
  })
})
