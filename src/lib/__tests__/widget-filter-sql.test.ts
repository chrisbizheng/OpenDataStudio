import { describe, it, expect } from "vitest"
import { buildFilteredSql, buildFilterClause } from "@/lib/widget-filter-sql"
import type { DashboardFilter } from "@/stores/dashboards"

describe("buildFilterClause", () => {
  it("returns null for empty value with = operator", () => {
    expect(buildFilterClause({ id: "1", column: "c", value: "" })).toBeNull()
  })

  it("returns null for bad column name", () => {
    expect(buildFilterClause({ id: "1", column: "col; DROP", value: "x" })).toBeNull()
  })

  it("defaults to = when operator is undefined", () => {
    const r = buildFilterClause({ id: "1", column: "status", value: "active" })
    expect(r).toBe("`status` = 'active'")
  })

  it("builds != clause", () => {
    const r = buildFilterClause({ id: "1", column: "status", value: "active", operator: "!=" })
    expect(r).toBe("`status` != 'active'")
  })

  it("builds > clause", () => {
    const r = buildFilterClause({ id: "1", column: "amount", value: "100", operator: ">" })
    expect(r).toBe("`amount` > '100'")
  })

  it("builds < clause", () => {
    const r = buildFilterClause({ id: "1", column: "amount", value: "100", operator: "<" })
    expect(r).toBe("`amount` < '100'")
  })

  it("builds >= clause", () => {
    const r = buildFilterClause({ id: "1", column: "amount", value: "100", operator: ">=" })
    expect(r).toBe("`amount` >= '100'")
  })

  it("builds <= clause", () => {
    const r = buildFilterClause({ id: "1", column: "amount", value: "100", operator: "<=" })
    expect(r).toBe("`amount` <= '100'")
  })

  it("builds IN clause with multiple values", () => {
    const r = buildFilterClause({ id: "1", column: "region", value: "", values: ["US", "EU", "APAC"], operator: "IN" })
    expect(r).toBe("`region` IN ('US', 'EU', 'APAC')")
  })

  it("builds IN clause with single value", () => {
    const r = buildFilterClause({ id: "1", column: "region", value: "", values: ["US"], operator: "IN" })
    expect(r).toBe("`region` IN ('US')")
  })

  it("returns null for IN with empty values", () => {
    const r = buildFilterClause({ id: "1", column: "region", value: "", values: [], operator: "IN" })
    expect(r).toBeNull()
  })

  it("returns null for IN with undefined values", () => {
    const r = buildFilterClause({ id: "1", column: "region", value: "", operator: "IN" })
    expect(r).toBeNull()
  })

  it("builds NOT IN clause with multiple values", () => {
    const r = buildFilterClause({ id: "1", column: "region", value: "", values: ["US", "EU"], operator: "NOT IN" })
    expect(r).toBe("`region` NOT IN ('US', 'EU')")
  })

  it("returns null for NOT IN with empty values", () => {
    const r = buildFilterClause({ id: "1", column: "region", value: "", values: [], operator: "NOT IN" })
    expect(r).toBeNull()
  })

  it("builds LIKE clause with % wrapping", () => {
    const r = buildFilterClause({ id: "1", column: "name", value: "foo", operator: "LIKE" })
    expect(r).toBe("`name` LIKE '%foo%'")
  })

  it("returns null for LIKE with empty value", () => {
    const r = buildFilterClause({ id: "1", column: "name", value: "", operator: "LIKE" })
    expect(r).toBeNull()
  })

  it("escapes LIKE special characters % and _", () => {
    const r = buildFilterClause({ id: "1", column: "name", value: "100%_done", operator: "LIKE" })
    expect(r).toBe("`name` LIKE '%100\\%\\_done%'")
  })

  it("builds BETWEEN clause", () => {
    const r = buildFilterClause({ id: "1", column: "date", value: "", values: ["2024-01-01", "2024-12-31"], operator: "BETWEEN" })
    expect(r).toBe("`date` BETWEEN '2024-01-01' AND '2024-12-31'")
  })

  it("returns null for BETWEEN with < 2 values", () => {
    const r = buildFilterClause({ id: "1", column: "date", value: "", values: ["2024-01-01"], operator: "BETWEEN" })
    expect(r).toBeNull()
  })

  it("returns null for BETWEEN with empty values", () => {
    const r = buildFilterClause({ id: "1", column: "date", value: "", values: [], operator: "BETWEEN" })
    expect(r).toBeNull()
  })

  it("returns null for unknown operator", () => {
    const r = buildFilterClause({ id: "1", column: "c", value: "x", operator: "UNKNOWN" as never })
    expect(r).toBeNull()
  })
})

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

  it("supports != operator via buildFilteredSql", () => {
    const filters: DashboardFilter[] = [
      { id: "1", column: "status", value: "inactive", operator: "!=" },
    ]
    const result = buildFilteredSql(baseSql, filters)
    expect(result).toContain("`status` != 'inactive'")
  })

  it("supports IN operator via buildFilteredSql", () => {
    const filters: DashboardFilter[] = [
      { id: "1", column: "region", value: "", values: ["US", "EU"], operator: "IN" },
    ]
    const result = buildFilteredSql(baseSql, filters)
    expect(result).toContain("`region` IN ('US', 'EU')")
  })

  it("supports LIKE operator via buildFilteredSql", () => {
    const filters: DashboardFilter[] = [
      { id: "1", column: "name", value: "foo", operator: "LIKE" },
    ]
    const result = buildFilteredSql(baseSql, filters)
    expect(result).toContain("`name` LIKE '%foo%'")
  })

  it("supports BETWEEN operator via buildFilteredSql", () => {
    const filters: DashboardFilter[] = [
      { id: "1", column: "date", value: "", values: ["2024-01-01", "2024-12-31"], operator: "BETWEEN" },
    ]
    const result = buildFilteredSql(baseSql, filters)
    expect(result).toContain("`date` BETWEEN '2024-01-01' AND '2024-12-31'")
  })

  it("skips invalid filters and applies valid ones", () => {
    const filters: DashboardFilter[] = [
      { id: "1", column: "col; DROP", value: "x" },
      { id: "2", column: "status", value: "active" },
    ]
    const result = buildFilteredSql(baseSql, filters)
    expect(result).toContain("`status` = 'active'")
    expect(result).not.toContain("DROP")
  })

  it("mixes operators in multi-filter query", () => {
    const filters: DashboardFilter[] = [
      { id: "1", column: "status", value: "active", operator: "=" },
      { id: "2", column: "amount", value: "100", operator: ">" },
      { id: "3", column: "region", value: "", values: ["US", "EU"], operator: "IN" },
    ]
    const result = buildFilteredSql(baseSql, filters)
    expect(result).toContain("`status` = 'active'")
    expect(result).toContain("`amount` > '100'")
    expect(result).toContain("`region` IN ('US', 'EU')")
  })

  it("inserts WHERE before GROUP BY", () => {
    const sql = "SELECT status, count(*) AS cnt FROM orders GROUP BY status"
    const filters: DashboardFilter[] = [
      { id: "1", column: "region", value: "US" },
    ]
    const result = buildFilteredSql(sql, filters)
    expect(result).toBe("SELECT status, count(*) AS cnt FROM orders WHERE `region` = 'US' GROUP BY status")
  })

  it("inserts WHERE before ORDER BY", () => {
    const sql = "SELECT * FROM orders ORDER BY id"
    const filters: DashboardFilter[] = [
      { id: "1", column: "status", value: "active" },
    ]
    const result = buildFilteredSql(sql, filters)
    expect(result).toBe("SELECT * FROM orders WHERE `status` = 'active' ORDER BY id")
  })

  it("inserts WHERE before LIMIT", () => {
    const sql = "SELECT * FROM orders LIMIT 10"
    const filters: DashboardFilter[] = [
      { id: "1", column: "status", value: "active" },
    ]
    const result = buildFilteredSql(sql, filters)
    expect(result).toBe("SELECT * FROM orders WHERE `status` = 'active' LIMIT 10")
  })
})
