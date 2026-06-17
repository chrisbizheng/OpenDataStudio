import { describe, it, expect } from "vitest"
import { toSQL, extractDependencies, validate, cloneNode, astToSummary } from "../expression"
import type { ExpressionNode } from "../ast-types"

describe("toSQL", () => {
  const refSQLMap: Record<string, string> = {
    sales_sum: "SUM(`sales`)",
    profit_sum: "SUM(`profit`)",
    cost_sum: "SUM(`cost`)",
  }

  it("ref 节点展开为引用指标的 SQL", () => {
    const node: ExpressionNode = { type: "ref", key: "sales_sum" }
    expect(toSQL(node, refSQLMap)).toBe("(SUM(`sales`))")
  })

  it("field 节点输出反引号包裹的字段名", () => {
    const node: ExpressionNode = { type: "field", name: "clicks" }
    expect(toSQL(node, refSQLMap)).toBe("`clicks`")
  })

  it("field 节点 useAnyValue=true 生成 ANY_VALUE(field)", () => {
    const node: ExpressionNode = { type: "field", name: "clicks" }
    expect(toSQL(node, refSQLMap, { useAnyValue: true })).toBe("ANY_VALUE(`clicks`)")
  })

  it("literal 数字节点直接输出", () => {
    const node: ExpressionNode = { type: "literal", value: 0, dataType: "Int64" }
    expect(toSQL(node, refSQLMap)).toBe("0")
  })

  it("literal 字符串节点加引号输出", () => {
    const node: ExpressionNode = { type: "literal", value: "active", dataType: "String" }
    expect(toSQL(node, refSQLMap)).toBe("'active'")
  })

  it("literal 字符串含单引号时转义", () => {
    const node: ExpressionNode = { type: "literal", value: "O'Brien", dataType: "String" }
    expect(toSQL(node, refSQLMap)).toBe("'O''Brien'")
  })

  it("call 节点生成函数调用 SQL", () => {
    const node: ExpressionNode = {
      type: "call",
      func: "if",
      args: [
        { type: "call", func: "greater", args: [
          { type: "ref", key: "sales_sum" },
          { type: "literal", value: 0, dataType: "Int64" },
        ]},
        { type: "call", func: "divide", args: [
          { type: "ref", key: "profit_sum" },
          { type: "ref", key: "sales_sum" },
        ]},
        { type: "literal", value: 0, dataType: "Int64" },
      ],
    }
    const sql = toSQL(node, refSQLMap)
    expect(sql).toContain("if(")
    expect(sql).toContain("greater(")
    expect(sql).toContain("(SUM(`profit`))")
    expect(sql).toContain("NULLIF")
  })

  it("divide 自动对分母注入 NULLIF 防除零", () => {
    const node: ExpressionNode = {
      type: "call",
      func: "divide",
      args: [
        { type: "ref", key: "profit_sum" },
        { type: "ref", key: "sales_sum" },
      ],
    }
    const sql = toSQL(node, refSQLMap)
    expect(sql).toBe("divide((SUM(`profit`)), NULLIF((SUM(`sales`)), 0))")
  })

  it("非 divide 的 call 不注入 NULLIF", () => {
    const node: ExpressionNode = {
      type: "call",
      func: "plus",
      args: [
        { type: "ref", key: "sales_sum" },
        { type: "ref", key: "cost_sum" },
      ],
    }
    const sql = toSQL(node, refSQLMap)
    expect(sql).not.toContain("NULLIF")
    expect(sql).toBe("plus((SUM(`sales`)), (SUM(`cost`)))")
  })

  it("agg 节点默认生成普通聚合函数（无 OVER）", () => {
    const node: ExpressionNode = { type: "agg", func: "SUM", field: "sales" }
    expect(toSQL(node, refSQLMap)).toBe("SUM(`sales`)")
  })

  it("agg 节点 useWindow=true 生成窗口函数 OVER()", () => {
    const node: ExpressionNode = { type: "agg", func: "SUM", field: "sales" }
    expect(toSQL(node, refSQLMap, { useWindow: true })).toBe("SUM(`sales`) OVER()")
  })

  it("agg COUNT_DISTINCT useWindow=true 生成 COUNT(DISTINCT field) OVER()", () => {
    const node: ExpressionNode = { type: "agg", func: "COUNT_DISTINCT", field: "user_id" }
    expect(toSQL(node, refSQLMap, { useWindow: true })).toBe("COUNT(DISTINCT `user_id`) OVER()")
  })

  it("agg COUNT DISTINCT 默认生成 COUNT(DISTINCT field)", () => {
    const node: ExpressionNode = { type: "agg", func: "COUNT_DISTINCT", field: "user_id" }
    expect(toSQL(node, refSQLMap)).toBe("COUNT(DISTINCT `user_id`)")
  })

  it("agg 节点在 call 内 useWindow=true 时递归生效", () => {
    const node: ExpressionNode = {
      type: "call",
      func: "divide",
      args: [
        { type: "ref", key: "sales_sum" },
        { type: "agg", func: "SUM", field: "sales" },
      ],
    }
    const sql = toSQL(node, refSQLMap, { useWindow: true })
    expect(sql).toContain("SUM(`sales`) OVER()")
  })

  it("ref 引用不存在的 key 生成注释", () => {
    const node: ExpressionNode = { type: "ref", key: "missing" }
    const sql = toSQL(node, refSQLMap)
    expect(sql).toContain("/* missing: missing */")
  })

  it("深层嵌套表达式递归生成", () => {
    const node: ExpressionNode = {
      type: "call",
      func: "round",
      args: [
        { type: "call", func: "divide", args: [
          { type: "ref", key: "profit_sum" },
          { type: "ref", key: "sales_sum" },
        ]},
        { type: "literal", value: 4, dataType: "Int64" },
      ],
    }
    const sql = toSQL(node, refSQLMap)
    expect(sql).toContain("round(")
    expect(sql).toContain("divide(")
    expect(sql).toContain("NULLIF")
    expect(sql).toContain("4")
  })
})

describe("extractDependencies", () => {
  it("从 AST 中提取所有 ref 依赖", () => {
    const node: ExpressionNode = {
      type: "call", func: "divide", args: [
        { type: "ref", key: "profit_sum" },
        { type: "ref", key: "sales_sum" },
      ],
    }
    expect(extractDependencies(node)).toEqual(["profit_sum", "sales_sum"])
  })

  it("去重相同的 ref", () => {
    const node: ExpressionNode = {
      type: "call", func: "plus", args: [
        { type: "ref", key: "a" },
        { type: "ref", key: "a" },
      ],
    }
    expect(extractDependencies(node)).toEqual(["a"])
  })

  it("深层嵌套中提取 ref", () => {
    const node: ExpressionNode = {
      type: "call", func: "if", args: [
        { type: "call", func: "greater", args: [
          { type: "ref", key: "views" },
          { type: "literal", value: 0, dataType: "Int64" },
        ]},
        { type: "ref", key: "clicks" },
        { type: "literal", value: 0, dataType: "Int64" },
      ],
    }
    expect(extractDependencies(node)).toEqual(["views", "clicks"])
  })

  it("无 ref 时返回空数组", () => {
    const node: ExpressionNode = {
      type: "call", func: "plus", args: [
        { type: "literal", value: 1, dataType: "Int64" },
        { type: "literal", value: 2, dataType: "Int64" },
      ],
    }
    expect(extractDependencies(node)).toEqual([])
  })

  it("agg 节点无 ref 依赖", () => {
    const node: ExpressionNode = { type: "agg", func: "SUM", field: "revenue" }
    expect(extractDependencies(node)).toEqual([])
  })
})

describe("validate", () => {
  const availableKeys = ["sales_sum", "profit_sum", "cost_sum"]
  const availableFields = ["sales", "profit", "cost", "user_id"]

  it("合法 AST 校验通过", () => {
    const node: ExpressionNode = {
      type: "call", func: "minus", args: [
        { type: "ref", key: "sales_sum" },
        { type: "ref", key: "cost_sum" },
      ],
    }
    const result = validate(node, availableKeys)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("引用不存在的指标返回错误", () => {
    const node: ExpressionNode = { type: "ref", key: "unknown" }
    const result = validate(node, availableKeys)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain("unknown")
  })

  it("agg 引用不存在的字段返回错误", () => {
    const node: ExpressionNode = { type: "agg", func: "SUM", field: "missing" }
    const result = validate(node, availableKeys, availableFields)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain("missing")
  })

  it("不提供 availableFields 时不校验 agg 字段", () => {
    const node: ExpressionNode = { type: "agg", func: "SUM", field: "anything" }
    const result = validate(node, availableKeys)
    expect(result.valid).toBe(true)
  })

  it("深层嵌套中的无效 ref 也被检测", () => {
    const node: ExpressionNode = {
      type: "call", func: "if", args: [
        { type: "call", func: "greater", args: [
          { type: "ref", key: "bad_key" },
          { type: "literal", value: 0, dataType: "Int64" },
        ]},
        { type: "ref", key: "sales_sum" },
        { type: "literal", value: 0, dataType: "Int64" },
      ],
    }
    const result = validate(node, availableKeys)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
  })
})

describe("cloneNode", () => {
  it("深拷贝后修改不影响原节点", () => {
    const original: ExpressionNode = {
      type: "call",
      func: "plus",
      args: [
        { type: "ref", key: "a" },
        { type: "literal", value: 1, dataType: "Int64" },
      ],
    }
    const cloned = cloneNode(original)
    expect(cloned).toEqual(original)
    if (cloned.type === "call") {
      cloned.args[0] = { type: "ref", key: "b" }
    }
    if (original.type === "call") {
      expect(original.args[0]).toEqual({ type: "ref", key: "a" })
    }
    if (cloned.type === "call") {
      expect(cloned.args[0]).toEqual({ type: "ref", key: "b" })
    }
  })

  it("深拷贝 ref 节点", () => {
    const node: ExpressionNode = { type: "ref", key: "sales_sum" }
    const cloned = cloneNode(node)
    expect(cloned).toEqual(node)
    ;(cloned as Extract<ExpressionNode, { type: "ref" }>).key = "modified"
    expect(node).toEqual({ type: "ref", key: "sales_sum" })
  })
})

describe("astToSummary", () => {
  it("ref 节点生成 @key", () => {
    const node: ExpressionNode = { type: "ref", key: "sales_sum" }
    expect(astToSummary(node)).toBe("@sales_sum")
  })

  it("field 节点生成字段名", () => {
    const node: ExpressionNode = { type: "field", name: "clicks" }
    expect(astToSummary(node)).toBe("clicks")
  })

  it("literal 节点生成字符串形式", () => {
    const node: ExpressionNode = { type: "literal", value: 42, dataType: "Int64" }
    expect(astToSummary(node)).toBe("42")
  })

  it("二元运算 call 生成中缀表达式", () => {
    const node: ExpressionNode = {
      type: "call",
      func: "minus",
      args: [
        { type: "ref", key: "a" },
        { type: "ref", key: "b" },
      ],
    }
    expect(astToSummary(node)).toBe("@a - @b")
  })

  it("非二元 call 生成函数调用形式", () => {
    const node: ExpressionNode = {
      type: "call",
      func: "if",
      args: [
        { type: "literal", value: 1, dataType: "Int64" },
        { type: "ref", key: "a" },
        { type: "ref", key: "b" },
      ],
    }
    expect(astToSummary(node)).toBe("if(1, @a, @b)")
  })

  it("agg 节点生成聚合描述", () => {
    const node: ExpressionNode = { type: "agg", func: "SUM", field: "sales" }
    expect(astToSummary(node)).toBe("SUM(sales)")
  })

  it("agg COUNT_DISTINCT 生成完整描述", () => {
    const node: ExpressionNode = { type: "agg", func: "COUNT_DISTINCT", field: "user_id" }
    expect(astToSummary(node)).toBe("COUNT(DISTINCT user_id)")
  })
})
