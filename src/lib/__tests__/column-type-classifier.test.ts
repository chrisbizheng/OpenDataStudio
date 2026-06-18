import { describe, expect, it } from "vitest"
import {
  isMetricColumn,
  createFieldRoleKey,
  parseFieldRoleKey,
  unwrapNullable,
  formatType,
  isDimensionType,
  isIndicatorType,
  isMetricByName,
  classifyColumnType,
  inferDefaultFieldRole,
  getNextFieldRole,
  getFieldRole,
  resolveFieldRole,
} from "../column-type-classifier"

describe("isMetricColumn", () => {
  it("以 sum_ 开头的列名被识别为指标", () => {
    expect(isMetricColumn("sum_sales")).toBe(true)
    expect(isMetricColumn("SUM_revenue")).toBe(true)
  })

  it("以 count_ 开头的列名被识别为指标", () => {
    expect(isMetricColumn("count_orders")).toBe(true)
    expect(isMetricColumn("Count")).toBe(true)
  })

  it("以 avg_ 开头的列名被识别为指标", () => {
    expect(isMetricColumn("avg_price")).toBe(true)
    expect(isMetricColumn("AVG_Value")).toBe(true)
  })

  it("以 total_ 开头的列名被识别为指标", () => {
    expect(isMetricColumn("total_amount")).toBe(true)
  })

  it("以 revenue 开头的列名被识别为指标", () => {
    expect(isMetricColumn("revenue")).toBe(true)
    expect(isMetricColumn("revenue_2024")).toBe(true)
  })

  it("以 sales 开头的列名被识别为指标", () => {
    expect(isMetricColumn("sales")).toBe(true)
  })

  it("以 amount 开头的列名被识别为指标", () => {
    expect(isMetricColumn("amount")).toBe(true)
  })

  it("以 pct 或 percent 开头的列名被识别为指标", () => {
    expect(isMetricColumn("pct_growth")).toBe(true)
    expect(isMetricColumn("percent_change")).toBe(true)
  })

  it("以 price 开头的列名被识别为指标", () => {
    expect(isMetricColumn("price")).toBe(true)
  })

  it("以 profit 开头的列名被识别为指标", () => {
    expect(isMetricColumn("profit_margin")).toBe(true)
  })

  it("关键字不在开头时返回 false", () => {
    expect(isMetricColumn("user_count")).toBe(false)
    expect(isMetricColumn("field_sales")).toBe(false)
    expect(isMetricColumn("product_revenue")).toBe(false)
  })

  it("非指标列名返回 false", () => {
    expect(isMetricColumn("user_id")).toBe(false)
    expect(isMetricColumn("name")).toBe(false)
    expect(isMetricColumn("city")).toBe(false)
    expect(isMetricColumn("order_date")).toBe(false)
    expect(isMetricColumn("category")).toBe(false)
  })

  it("空或 undefined 返回 false", () => {
    expect(isMetricColumn("")).toBe(false)
    expect(isMetricColumn(undefined)).toBe(false)
  })
})

describe("createFieldRoleKey + parseFieldRoleKey", () => {
  it("往返编码保持一致", () => {
    const key = createFieldRoleKey("default", "users", "name")
    expect(parseFieldRoleKey(key)).toEqual({
      database: "default",
      table: "users",
      column: "name",
    })
  })

  it("处理含特殊字符的字段名 (URL 编码)", () => {
    const key = createFieldRoleKey("db with space", "t/2", "col\u0000evil")
    expect(parseFieldRoleKey(key)).toEqual({
      database: "db with space",
      table: "t/2",
      column: "col\u0000evil",
    })
  })
})

describe("unwrapNullable", () => {
  it("剥离 Nullable 包装", () => {
    expect(unwrapNullable("Nullable(Int32)")).toBe("Int32")
    expect(unwrapNullable("Nullable(String)")).toBe("String")
  })

  it("非 Nullable 类型原样返回", () => {
    expect(unwrapNullable("Int32")).toBe("Int32")
    expect(unwrapNullable("Array(String)")).toBe("Array(String)")
  })
})

describe("formatType", () => {
  it("Nullable 转后缀 ?", () => {
    expect(formatType("Nullable(Int32)")).toBe("Int32?")
  })

  it("Decimal 与精度无关", () => {
    expect(formatType("Decimal(18, 4)")).toBe("Decimal")
  })

  it("DateTime/DateTime64 统一为 DateTime", () => {
    expect(formatType("DateTime")).toBe("DateTime")
    expect(formatType("DateTime64(3)")).toBe("DateTime")
    expect(formatType("DateTime('UTC')")).toBe("DateTime")
  })

  it("Array 转方括号", () => {
    expect(formatType("Array(String)")).toBe("[String]")
  })

  it("FixedString 显示为 String", () => {
    expect(formatType("FixedString(12)")).toBe("String")
  })

  it("LowCardinality 剥离", () => {
    expect(formatType("LowCardinality(String)")).toBe("String")
  })
})

describe("isDimensionType", () => {
  it("String/FixedString/LowCardinality/Date/DateTime/Bool/Enum 是维度", () => {
    expect(isDimensionType("String")).toBe(true)
    expect(isDimensionType("FixedString(8)")).toBe(true)
    expect(isDimensionType("LowCardinality(String)")).toBe(true)
    expect(isDimensionType("Date")).toBe(true)
    expect(isDimensionType("DateTime")).toBe(true)
    expect(isDimensionType("Bool")).toBe(true)
    expect(isDimensionType("Enum8('a' = 1)")).toBe(true)
  })

  it("Nullable 包装下仍识别", () => {
    expect(isDimensionType("Nullable(String)")).toBe(true)
  })

  it("数值类型不是维度", () => {
    expect(isDimensionType("Int32")).toBe(false)
    expect(isDimensionType("Float64")).toBe(false)
  })
})

describe("isIndicatorType", () => {
  it("Int/UInt/Float/Decimal 是指标", () => {
    expect(isIndicatorType("Int8")).toBe(true)
    expect(isIndicatorType("UInt32")).toBe(true)
    expect(isIndicatorType("Float64")).toBe(true)
    expect(isIndicatorType("Decimal(18, 4)")).toBe(true)
  })

  it("Nullable 包装下仍识别", () => {
    expect(isIndicatorType("Nullable(Float64)")).toBe(true)
  })

  it("字符串/日期不是指标", () => {
    expect(isIndicatorType("String")).toBe(false)
    expect(isIndicatorType("DateTime")).toBe(false)
  })
})

describe("isMetricByName", () => {
  it("名字含指标关键字 (任意位置) 返回 true", () => {
    expect(isMetricByName("user_count")).toBe(true)
    expect(isMetricByName("total_revenue")).toBe(true)
    expect(isMetricByName("MaxValue")).toBe(true)
  })

  it("无指标关键字返回 false", () => {
    expect(isMetricByName("name")).toBe(false)
    expect(isMetricByName("city")).toBe(false)
  })
})

describe("classifyColumnType", () => {
  it("数值类型为 indicator", () => {
    expect(classifyColumnType("Int32")).toBe("indicator")
    expect(classifyColumnType("Float64")).toBe("indicator")
    expect(classifyColumnType("Decimal(18, 4)")).toBe("indicator")
  })

  it("日期类型为 date", () => {
    expect(classifyColumnType("Date")).toBe("date")
    expect(classifyColumnType("DateTime")).toBe("date")
    expect(classifyColumnType("DateTime64(3)")).toBe("date")
  })

  it("Bool 为 boolean", () => {
    expect(classifyColumnType("Bool")).toBe("boolean")
  })

  it("Array 为 array", () => {
    expect(classifyColumnType("Array(String)")).toBe("array")
  })

  it("字符串系列为 dimension", () => {
    expect(classifyColumnType("String")).toBe("dimension")
    expect(classifyColumnType("FixedString(8)")).toBe("dimension")
    expect(classifyColumnType("LowCardinality(String)")).toBe("dimension")
    expect(classifyColumnType("Enum8('a' = 1)")).toBe("dimension")
  })

  it("Nullable 包装下保留分类", () => {
    expect(classifyColumnType("Nullable(Int32)")).toBe("indicator")
    expect(classifyColumnType("Nullable(String)")).toBe("dimension")
  })

  it("未知类型为 other", () => {
    expect(classifyColumnType("UUID")).toBe("other")
    expect(classifyColumnType("Tuple(Int32, String)")).toBe("other")
  })
})

describe("inferDefaultFieldRole", () => {
  it("维度类型默认为 dimension", () => {
    expect(inferDefaultFieldRole("String")).toBe("dimension")
    expect(inferDefaultFieldRole("DateTime")).toBe("dimension")
  })

  it("指标类型默认为 indicator", () => {
    expect(inferDefaultFieldRole("Int32")).toBe("indicator")
    expect(inferDefaultFieldRole("Decimal(18, 4)")).toBe("indicator")
  })

  it("非维度非指标类型返回 null", () => {
    expect(inferDefaultFieldRole("Array(String)")).toBe(null)
    expect(inferDefaultFieldRole("UUID")).toBe(null)
  })
})

describe("getNextFieldRole", () => {
  it("dimension 翻转为 indicator", () => {
    expect(getNextFieldRole("dimension")).toBe("indicator")
  })

  it("indicator 翻转为 dimension", () => {
    expect(getNextFieldRole("indicator")).toBe("dimension")
  })
})

describe("getFieldRole", () => {
  it("无 override 时使用默认角色", () => {
    expect(getFieldRole("String")).toEqual({
      role: "dimension",
      defaultRole: "dimension",
      isOverridden: false,
    })
  })

  it("override 覆盖默认角色", () => {
    expect(getFieldRole("String", "indicator")).toEqual({
      role: "indicator",
      defaultRole: "dimension",
      isOverridden: true,
    })
  })

  it("无法分类的类型返回 null", () => {
    expect(getFieldRole("UUID")).toBe(null)
  })
})

describe("resolveFieldRole", () => {
  const schema = [
    { name: "id", type: "UInt64" },
    { name: "name", type: "String" },
    { name: "age", type: "Int32" },
  ]

  it("schema 中找到字段并返回角色", () => {
    const result = resolveFieldRole("name", schema, {}, "db", "t")
    expect(result?.role).toBe("dimension")
    expect(result?.isOverridden).toBe(false)
  })

  it("override 生效", () => {
    const key = createFieldRoleKey("db", "t", "age")
    const result = resolveFieldRole("age", schema, { [key]: "dimension" }, "db", "t")
    expect(result?.role).toBe("dimension")
    expect(result?.defaultRole).toBe("indicator")
    expect(result?.isOverridden).toBe(true)
  })

  it("schema 中找不到字段返回 null", () => {
    expect(resolveFieldRole("missing", schema, {}, "db", "t")).toBe(null)
  })
})
