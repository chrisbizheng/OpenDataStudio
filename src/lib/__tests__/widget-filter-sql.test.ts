import { describe, it, expect } from "vitest"
import { buildFilteredSql } from "@/lib/widget-filter-sql"
import type { DashboardFilter } from "@/stores/dashboards"

describe("buildFilteredSql", () => {
  const baseSql = "SELECT * FROM orders"

  it("returns base SQL when no filters", () => {
    expect(buildFilteredSql(baseSql, [])).toBe(baseSql)
  })

  it("adds WHERE clause for single filter", () => {
    const filters: DashboardFilter[] = [
      { id: "1", column: "status", value: "active" },
    ]
    const result = buildFilteredSql(baseSql, filters)
    expect(result).toContain("WHERE")
    expect(result).toContain("`status` = 'active'")
  })

  it("joins multiple filters with AND", () => {
    const filters: DashboardFilter[] = [
      { id: "1", column: "status", value: "active" },
      { id: "2", column: "region", value: "US" },
    ]
    const result = buildFilteredSql(baseSql, filters)
    expect(result).toContain("`status` = 'active'")
    expect(result).toContain("`region` = 'US'")
    expect(result).toContain("AND")
  })

  it("rejects SQL injection in column name", () => {
    const filters: DashboardFilter[] = [
      { id: "1", column: "col'; DROP TABLE orders;--", value: "x" },
    ]
    const result = buildFilteredSql(baseSql, filters)
    expect(result).toBe(baseSql)
  })

  it("escapes single quotes in values using double-quote escaping", () => {
    const filters: DashboardFilter[] = [
      { id: "1", column: "status", value: "test'value" },
    ]
    const result = buildFilteredSql(baseSql, filters)
    expect(result).toContain("'test''value'")
  })

  it("filters out empty column/value", () => {
    const filters: DashboardFilter[] = [
      { id: "1", column: "", value: "active" },
      { id: "2", column: "status", value: "" },
      { id: "3", column: "region", value: "US" },
    ]
    const result = buildFilteredSql(baseSql, filters)
    expect(result).toContain("`region` = 'US'")
    expect(result).not.toContain("``")
    expect(result).not.toContain("= ''")
  })

  it("escapes backslashes in values", () => {
    const filters: DashboardFilter[] = [
      { id: "1", column: "path", value: "C:\\Users" },
    ]
    const result = buildFilteredSql(baseSql, filters)
    // Each backslash in the input should be doubled in the SQL
    const betweenQuotes = result.match(/= '(.*?)'/)?.[1] ?? ""
    expect(betweenQuotes).toBe("C:\\\\Users")
  })
})
