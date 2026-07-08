import { describe, it, expect } from "vitest"
import { toPivotHistoryItem, toSqlHistoryItem } from "../history-items"

describe("history items", () => {
  it("把 SQL 历史转换为统一历史项", () => {
    expect(
      toSqlHistoryItem({
        id: "1",
        sql: "SELECT 1",
        timestamp: 1000,
        tableName: "orders",
        rowCount: 10,
        executionTime: 0.12,
      })
    ).toEqual({
      id: "1",
      title: "SELECT 1",
      meta: ["orders", "10 行", "0.12s"],
      timestamp: 1000,
    })
  })

  it("把透视历史转换为统一历史项", () => {
    const entry: Parameters<typeof toPivotHistoryItem>[0] = {
      id: "2",
      tableName: "sales",
      timestamp: 2000,
      rowCount: 500,
      config: {
        rows: ["region"],
        columns: [],
        indicators: [{ key: "s", field: "sales", title: "Sales", aggregation: "SUM" }],
        calculatedIndicators: [],
      },
    }
    expect(toPivotHistoryItem(entry)).toEqual({
      id: "2",
      title: "sales",
      meta: ["region × 1指标", "500行"],
      timestamp: 2000,
    })
  })
})
