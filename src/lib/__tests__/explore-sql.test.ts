import { describe, it, expect } from "vitest"
import { buildExploreSQL, timeRangeToWhere } from "../explore-sql"
import type { ExploreConfig, DatasetRef } from "../metric-types"

describe("buildExploreSQL", () => {
  it("物理表 + SimpleMetric + 普通维度", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [{ column: "region", type: "categorical" }],
      rowLimit: 100,
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).toContain("SUM(`revenue`) AS `m1`")
    expect(sql).toContain("FROM `mydb`.`sales`")
    expect(sql).toContain("GROUP BY `region`")
    expect(sql).toContain("LIMIT 100")
  })

  it("COUNT_DISTINCT 聚合", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "user_id", aggregation: "COUNT_DISTINCT", label: "用户数" }],
      dimensions: [{ column: "region", type: "categorical" }],
      rowLimit: 100,
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).toContain("COUNT(DISTINCT `user_id`) AS `m1`")
  })

  it("时间维度 + 粒度", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [{ column: "order_date", type: "temporal", timeGranularity: "month" }],
      rowLimit: 100,
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).toContain("toStartOfMonth(`order_date`) AS `order_date`")
    expect(sql).toContain("GROUP BY toStartOfMonth(`order_date`)")
  })

  it("时间范围 Last 7 days", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [{ column: "order_date", type: "temporal", timeGranularity: "day" }],
      timeConfig: { timeColumn: "order_date", granularity: "day", timeRange: "Last 7 days" },
      rowLimit: 100,
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).toContain("`order_date` >= today() - INTERVAL 7 DAY")
  })

  it("时间范围 Last quarter（用 INTERVAL 3 MONTH）", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [{ column: "order_date", type: "temporal", timeGranularity: "day" }],
      timeConfig: { timeColumn: "order_date", granularity: "day", timeRange: "Last quarter" },
      rowLimit: 100,
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).toContain("`order_date` >= toStartOfQuarter(today()) - INTERVAL 3 MONTH")
  })

  it("时间范围 Custom", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [{ column: "order_date", type: "temporal", timeGranularity: "day" }],
      timeConfig: {
        timeColumn: "order_date",
        granularity: "day",
        timeRange: "Custom",
        customRange: { from: "2024-01-01", to: "2024-12-31" },
      },
      rowLimit: 100,
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).toContain("`order_date` >= '2024-01-01'")
    expect(sql).toContain("`order_date` <= '2024-12-31'")
  })

  it("No filter 无 WHERE", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [{ column: "region", type: "categorical" }],
      timeConfig: { timeColumn: "order_date", granularity: "day", timeRange: "No filter" },
      rowLimit: 100,
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).not.toContain("WHERE")
  })

  it("虚拟表 dataset", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [{ column: "region", type: "categorical" }],
      rowLimit: 100,
    }
    const dataset: DatasetRef = {
      id: "ds1", name: "virtual_sales", type: "virtual",
      sql: "SELECT * FROM mydb.sales WHERE qty > 0",
    }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).toContain("FROM (SELECT * FROM mydb.sales WHERE qty > 0) AS __virtual_dataset")
  })

  it("多 metric 多 dimension", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [
        { id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" },
        { id: "m2", type: "simple", column: "price", aggregation: "AVG", label: "均价" },
      ],
      dimensions: [
        { column: "region", type: "categorical" },
        { column: "order_date", type: "temporal", timeGranularity: "month" },
      ],
      rowLimit: 100,
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).toContain("SUM(`revenue`) AS `m1`")
    expect(sql).toContain("AVG(`price`) AS `m2`")
    expect(sql).toContain("toStartOfMonth(`order_date`) AS `order_date`")
    expect(sql).toContain("`region` AS `region`")
    expect(sql).toContain("GROUP BY `region`, toStartOfMonth(`order_date`)")
  })

  it("ORDER BY 默认时间列", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [{ column: "order_date", type: "temporal", timeGranularity: "day" }],
      timeConfig: { timeColumn: "order_date", granularity: "day", timeRange: "Last 7 days" },
      rowLimit: 100,
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).toContain("ORDER BY `order_date` ASC")
  })

  it("CustomSqlMetric", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{
        id: "m1", type: "custom_sql", label: "ARPU",
        sqlExpression: "SUM(revenue)/COUNT(DISTINCT user_id)",
      }],
      dimensions: [{ column: "region", type: "categorical" }],
      rowLimit: 100,
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).toContain("(SUM(revenue)/COUNT(DISTINCT user_id)) AS `m1`")
  })

  it("rolling window AVG windowSize 7", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [{ column: "order_date", type: "temporal", timeGranularity: "day" }],
      timeConfig: { timeColumn: "order_date", granularity: "day", timeRange: "Last 30 days" },
      rowLimit: 100,
      analytics: {
        rollingWindow: { enabled: true, windowSize: 7, function: "AVG", metricIds: ["m1"] },
      },
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    // Has subquery wrapper
    expect(sql).toContain("FROM (")
    expect(sql).toContain(") AS __base")
    // Inner has SELECT + FROM + WHERE + GROUP BY
    expect(sql).toContain("SUM(`revenue`) AS `m1`")
    expect(sql).toContain("FROM `mydb`.`sales`")
    expect(sql).toContain("GROUP BY toStartOfDay(`order_date`)")
    // Outer has rolling window column
    expect(sql).toContain("AVG(`m1`) OVER (ORDER BY `order_date` ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS `m1_rolling_7`")
    // ORDER BY and LIMIT on outer
    const outerMatch = sql.match(/\) AS __base\nORDER BY/)
    expect(outerMatch).not.toBeNull()
    expect(sql).toContain("LIMIT 100")
  })

  it("rolling window disabled", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [{ column: "order_date", type: "temporal", timeGranularity: "day" }],
      rowLimit: 100,
      analytics: {
        rollingWindow: { enabled: false, windowSize: 7, function: "AVG", metricIds: ["m1"] },
      },
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    // No subquery wrapper
    expect(sql).not.toContain("FROM (")
    expect(sql).not.toContain("__base")
    expect(sql).not.toContain("OVER (")
  })

  it("rolling window empty metricIds", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [{ column: "order_date", type: "temporal", timeGranularity: "day" }],
      rowLimit: 100,
      analytics: {
        rollingWindow: { enabled: true, windowSize: 7, function: "AVG", metricIds: [] },
      },
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).not.toContain("FROM (")
    expect(sql).not.toContain("OVER (")
  })

  it("rolling window SUM windowSize 3", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [{ column: "order_date", type: "temporal", timeGranularity: "day" }],
      timeConfig: { timeColumn: "order_date", granularity: "day", timeRange: "Last 30 days" },
      rowLimit: 100,
      analytics: {
        rollingWindow: { enabled: true, windowSize: 3, function: "SUM", metricIds: ["m1"] },
      },
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).toContain("SUM(`m1`) OVER (ORDER BY `order_date` ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS `m1_rolling_3`")
  })

  it("rolling window no dimensions ignored", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [],
      rowLimit: 100,
      analytics: {
        rollingWindow: { enabled: true, windowSize: 7, function: "AVG", metricIds: ["m1"] },
      },
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).not.toContain("FROM (")
    expect(sql).not.toContain("OVER (")
  })

  it("无 dimension 无 GROUP BY", () => {
    const config: ExploreConfig = {
      datasetId: "ds1",
      metrics: [{ id: "m1", type: "simple", column: "revenue", aggregation: "SUM", label: "收入" }],
      dimensions: [],
      rowLimit: 100,
    }
    const dataset: DatasetRef = { id: "ds1", name: "sales", type: "physical", database: "mydb", table: "sales" }
    const sql = buildExploreSQL(config, dataset)
    expect(sql).not.toContain("GROUP BY")
  })
})

describe("timeRangeToWhere", () => {
  it("No filter 返回 null", () => {
    expect(timeRangeToWhere("col", "No filter")).toBeNull()
  })

  it("Last 7 days", () => {
    expect(timeRangeToWhere("order_date", "Last 7 days")).toBe(
      "`order_date` >= today() - INTERVAL 7 DAY"
    )
  })

  it("Last quarter", () => {
    expect(timeRangeToWhere("order_date", "Last quarter")).toBe(
      "`order_date` >= toStartOfQuarter(today()) - INTERVAL 3 MONTH"
    )
  })

  it("Custom 需要 customRange", () => {
    expect(timeRangeToWhere("order_date", "Custom")).toBeNull()
    expect(timeRangeToWhere("order_date", "Custom", { from: "2024-01-01", to: "2024-12-31" })).toBe(
      "`order_date` >= '2024-01-01' AND `order_date` <= '2024-12-31'"
    )
  })
})
