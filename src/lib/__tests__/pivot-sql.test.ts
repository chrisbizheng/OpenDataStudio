import { describe, it, expect } from "vitest"
import {
  generatePivotSQL,
  getIndicatorSQLMap,
  type PivotConfig,
} from "../pivot-sql"

describe("getIndicatorSQLMap", () => {
  it("将指标映射为 SQL 聚合表达式", () => {
    const config: PivotConfig = {
      rows: [],
      columns: [],
      indicators: [
        { key: "sales_sum", field: "sales", title: "销售额", aggregation: "SUM" },
        { key: "count", field: "id", title: "数量", aggregation: "COUNT" },
      ],
      calculatedIndicators: [],
    }
    const map = getIndicatorSQLMap(config.indicators)
    expect(map["sales_sum"]).toBe("SUM(`sales`)")
    expect(map["count"]).toBe("COUNT(`id`)")
  })

  it("支持所有聚合类型", () => {
    const config: PivotConfig = {
      rows: [],
      columns: [],
      indicators: [
        { key: "a", field: "x", title: "", aggregation: "SUM" },
        { key: "b", field: "x", title: "", aggregation: "AVG" },
        { key: "c", field: "x", title: "", aggregation: "MIN" },
        { key: "d", field: "x", title: "", aggregation: "MAX" },
        { key: "e", field: "x", title: "", aggregation: "DISTINCT_COUNT" },
      ],
      calculatedIndicators: [],
    }
    const map = getIndicatorSQLMap(config.indicators)
    expect(map["a"]).toBe("SUM(`x`)")
    expect(map["b"]).toBe("AVG(`x`)")
    expect(map["c"]).toBe("MIN(`x`)")
    expect(map["d"]).toBe("MAX(`x`)")
    expect(map["e"]).toBe("COUNT(DISTINCT `x`)")
  })
})

describe("generatePivotSQL", () => {
  it("单指标单行维度生成正确的 GROUP BY", () => {
    const config: PivotConfig = {
      rows: ["region"],
      columns: [],
      indicators: [
        { key: "sales_sum", field: "sales", title: "销售额", aggregation: "SUM" },
      ],
      calculatedIndicators: [],
    }
    const sql = generatePivotSQL(config, "orders", "default")
    expect(sql).toContain("SELECT")
    expect(sql).toContain("`region`")
    expect(sql).toContain("SUM(`sales`)")
    expect(sql).toContain("AS `sales_sum`")
    expect(sql).toContain("FROM `default`.`orders`")
    expect(sql).toContain("GROUP BY `region`")
    expect(sql).toContain("ORDER BY `region`")
  })

  it("多行多列维度都包含在 GROUP BY 中", () => {
    const config: PivotConfig = {
      rows: ["region", "city"],
      columns: ["product", "category"],
      indicators: [
        { key: "sales_sum", field: "sales", title: "", aggregation: "SUM" },
      ],
      calculatedIndicators: [],
    }
    const sql = generatePivotSQL(config, "t", "db")
    expect(sql).toContain("GROUP BY `region`, `city`, `product`, `category`")
  })

  it("计算指标作为 SELECT 表达式", () => {
    const config: PivotConfig = {
      rows: ["region"],
      columns: [],
      indicators: [
        { key: "sales_sum", field: "sales", title: "", aggregation: "SUM" },
        { key: "cost_sum", field: "cost", title: "", aggregation: "SUM" },
      ],
      calculatedIndicators: [
        {
          key: "profit_rate",
          title: "利润率",
          logic: { type: "call", func: "divide", args: [
            { type: "call", func: "minus", args: [
              { type: "ref", key: "sales_sum" },
              { type: "ref", key: "cost_sum" },
            ]},
            { type: "ref", key: "sales_sum" },
          ]},
        },
      ],
    }
    const sql = generatePivotSQL(config, "t", "db")
    expect(sql).toContain("AS `profit_rate`")
    expect(sql).toContain("SUM(`sales`)")
    expect(sql).toContain("SUM(`cost`)")
  })

  it("链式计算指标按拓扑排序", () => {
    const config: PivotConfig = {
      rows: ["region"],
      columns: [],
      indicators: [
        { key: "a", field: "x", title: "", aggregation: "SUM" },
        { key: "b", field: "y", title: "", aggregation: "SUM" },
      ],
      calculatedIndicators: [
        {
          key: "c",
          title: "c",
          logic: { type: "call", func: "plus", args: [
            { type: "ref", key: "a" },
            { type: "ref", key: "b" },
          ]},
        },
        {
          key: "d",
          title: "d",
          logic: { type: "call", func: "multiply", args: [
            { type: "ref", key: "c" },
            { type: "literal", value: 2, dataType: "Int64" },
          ]},
        },
      ],
    }
    const sql = generatePivotSQL(config, "t", "db")
    const cPos = sql.indexOf("AS `c`")
    const dPos = sql.indexOf("AS `d`")
    expect(cPos).toBeLessThan(dPos)
  })

  it("过滤条件生成 WHERE 子句", () => {
    const config: PivotConfig = {
      rows: ["region"],
      columns: [],
      indicators: [
        { key: "s", field: "sales", title: "", aggregation: "SUM" },
      ],
      calculatedIndicators: [],
      filters: [{ field: "status", op: "=", value: "active" }],
    }
    const sql = generatePivotSQL(config, "t", "db")
    expect(sql).toContain("WHERE `status` = 'active'")
  })

  it("排序条件生成 ORDER BY", () => {
    const config: PivotConfig = {
      rows: ["region"],
      columns: [],
      indicators: [
        { key: "s", field: "sales", title: "", aggregation: "SUM" },
      ],
      calculatedIndicators: [],
      sort: { field: "s", direction: "desc" },
    }
    const sql = generatePivotSQL(config, "t", "db")
    expect(sql).toContain("ORDER BY `s` DESC")
  })

  it("默认不限制聚合结果行数，确保 pivot 数据完整", () => {
    const config: PivotConfig = {
      rows: ["user_id"],
      columns: [],
      indicators: [
        { key: "s", field: "sales", title: "", aggregation: "SUM" },
      ],
      calculatedIndicators: [],
    }
    const sql = generatePivotSQL(config, "t", "db")
    expect(sql).not.toContain("LIMIT")
  })

  it("允许显式限制 pivot 聚合结果行数", () => {
    const config: PivotConfig = {
      rows: ["region"],
      columns: [],
      indicators: [
        { key: "s", field: "sales", title: "", aggregation: "SUM" },
      ],
      calculatedIndicators: [],
      limit: 1000,
    }
    const sql = generatePivotSQL(config, "t", "db")
    expect(sql).toContain("LIMIT 1000")
  })

  it("无指标时生成空 SQL", () => {
    const config: PivotConfig = {
      rows: ["region"],
      columns: [],
      indicators: [],
      calculatedIndicators: [],
    }
    const sql = generatePivotSQL(config, "t", "db")
    expect(sql).not.toContain("SUM")
    expect(sql).not.toContain("AVG")
  })

  it("IN 过滤条件正确生成", () => {
    const config: PivotConfig = {
      rows: ["region"],
      columns: [],
      indicators: [
        { key: "s", field: "sales", title: "", aggregation: "SUM" },
      ],
      calculatedIndicators: [],
      filters: [{ field: "region", op: "IN", value: ["华东", "华南"] }],
    }
    const sql = generatePivotSQL(config, "t", "db")
    expect(sql).toContain("IN ('华东', '华南')")
  })

  it("BETWEEN 过滤条件正确生成", () => {
    const config: PivotConfig = {
      rows: ["region"],
      columns: [],
      indicators: [
        { key: "s", field: "sales", title: "", aggregation: "SUM" },
      ],
      calculatedIndicators: [],
      filters: [{ field: "sales", op: "BETWEEN", value: [10, 20] }],
    }
    const sql = generatePivotSQL(config, "t", "db")
    expect(sql).toContain("BETWEEN '10' AND '20'")
  })

  it("LIKE 过滤条件正确生成", () => {
    const config: PivotConfig = {
      rows: ["region"],
      columns: [],
      indicators: [
        { key: "s", field: "sales", title: "", aggregation: "SUM" },
      ],
      calculatedIndicators: [],
      filters: [{ field: "name", op: "LIKE", value: "%test%" }],
    }
    const sql = generatePivotSQL(config, "t", "db")
    expect(sql).toContain("LIKE '%test%'")
  })

  it("循环依赖的计算指标抛出错误", () => {
    const config: PivotConfig = {
      rows: ["region"],
      columns: [],
      indicators: [
        { key: "a", field: "x", title: "", aggregation: "SUM" },
      ],
      calculatedIndicators: [
        {
          key: "c1",
          title: "c1",
          logic: { type: "ref", key: "c2" },
        },
        {
          key: "c2",
          title: "c2",
          logic: { type: "ref", key: "c1" },
        },
      ],
    }
    expect(() => generatePivotSQL(config, "t", "db")).toThrow(/circular/i)
  })
})
