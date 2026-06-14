import { describe, it, expect } from "vitest"
import { migrateExpressionToAST, toSQL, extractDependencies } from "../expression"

describe("migrateExpressionToAST", () => {
  const indicatorKeyMap: Record<string, string> = {
    sales_sum: "SUM(`sales`)",
    profit_sum: "SUM(`profit`)",
    cost_sum: "SUM(`cost`)",
  }
  const schemaFields = ["sales", "profit", "cost", "clicks", "views"]

  it("空表达式返回 0 字面量，无错误", () => {
    const result = migrateExpressionToAST("", indicatorKeyMap)
    expect(result.node).toEqual({ type: "literal", value: 0, dataType: "Int64" })
    expect(result.errors).toEqual([])
  })

  it("单个 ref 引用迁移", () => {
    const result = migrateExpressionToAST("[[sales_sum]]", indicatorKeyMap)
    expect(result.node).toEqual({ type: "ref", key: "sales_sum" })
    expect(result.errors).toEqual([])
  })

  it("二元运算迁移（减法）", () => {
    const result = migrateExpressionToAST("[[sales_sum]] - [[cost_sum]]", indicatorKeyMap)
    expect(result.node.type).toBe("call")
    if (result.node.type === "call") {
      expect(result.node.func).toBe("minus")
      expect(result.node.args).toHaveLength(2)
      expect(result.node.args[0]).toEqual({ type: "ref", key: "sales_sum" })
      expect(result.node.args[1]).toEqual({ type: "ref", key: "cost_sum" })
    }
    expect(result.errors).toEqual([])
  })

  it("除法迁移", () => {
    const result = migrateExpressionToAST("[[profit_sum]] / [[sales_sum]]", indicatorKeyMap)
    expect(result.node.type).toBe("call")
    if (result.node.type === "call") {
      expect(result.node.func).toBe("divide")
    }
  })

  it("加法迁移", () => {
    const result = migrateExpressionToAST("[[sales_sum]] + [[cost_sum]]", indicatorKeyMap)
    expect(result.node.type).toBe("call")
    if (result.node.type === "call") {
      expect(result.node.func).toBe("plus")
    }
  })

  it("带括号的表达式迁移", () => {
    const result = migrateExpressionToAST("([[sales_sum]] - [[cost_sum]]) / [[sales_sum]]", indicatorKeyMap)
    expect(result.node.type).toBe("call")
    if (result.node.type === "call") {
      expect(result.node.func).toBe("divide")
      expect(result.node.args).toHaveLength(2)
      expect(result.node.args[0].type).toBe("call")
      expect(result.node.args[1]).toEqual({ type: "ref", key: "sales_sum" })
    }
  })

  it("内联聚合迁移为 agg 节点", () => {
    const result = migrateExpressionToAST("[[sales_sum]] / SUM(sales)", indicatorKeyMap, schemaFields)
    expect(result.node.type).toBe("call")
    if (result.node.type === "call") {
      expect(result.node.func).toBe("divide")
      expect(result.node.args[1].type).toBe("agg")
      if (result.node.args[1].type === "agg") {
        expect(result.node.args[1].func).toBe("SUM")
        expect(result.node.args[1].field).toBe("sales")
      }
    }
  })

  it("迁移后的 AST 可正确生成 SQL", () => {
    const result = migrateExpressionToAST("[[profit_sum]] / [[sales_sum]]", indicatorKeyMap, schemaFields)
    const sql = toSQL(result.node, indicatorKeyMap)
    expect(sql).toContain("divide(")
    expect(sql).toContain("NULLIF")
  })

  it("迁移后的 AST 可正确提取依赖", () => {
    const result = migrateExpressionToAST("[[sales_sum]] - [[cost_sum]]", indicatorKeyMap, schemaFields)
    const deps = extractDependencies(result.node)
    expect(deps).toEqual(["sales_sum", "cost_sum"])
  })

  it("无法识别的 token 记录到 errors", () => {
    const result = migrateExpressionToAST("[[sales_sum]] + foobar", indicatorKeyMap)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain("foobar")
  })

  it("多个无法识别 token 全部记录", () => {
    const result = migrateExpressionToAST("abc + def", indicatorKeyMap)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  it("schemaFields 中的 raw token 生成 field 节点", () => {
    const result = migrateExpressionToAST("clicks + views", indicatorKeyMap, schemaFields)
    expect(result.node.type).toBe("call")
    if (result.node.type === "call") {
      expect(result.node.func).toBe("plus")
      expect(result.node.args[0]).toEqual({ type: "field", name: "clicks" })
      expect(result.node.args[1]).toEqual({ type: "field", name: "views" })
    }
    expect(result.errors).toEqual([])
  })

  it("schemaFields 中的字段名在函数参数中生成 field 节点", () => {
    const result = migrateExpressionToAST("if(greater(clicks, 0), clicks, 0)", indicatorKeyMap, schemaFields)
    expect(result.node.type).toBe("call")
    if (result.node.type === "call") {
      expect(result.node.func).toBe("if")
    }
    expect(result.errors).toEqual([])
  })

  it("不在 schemaFields 中的 raw token 仍然记录错误", () => {
    const result = migrateExpressionToAST("unknown_field + clicks", indicatorKeyMap, schemaFields)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain("unknown_field")
  })
})
