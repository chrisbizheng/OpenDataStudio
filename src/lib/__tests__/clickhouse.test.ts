import { describe, expect, it } from "vitest"
import { isReadOnlySql } from "../clickhouse"

describe("isReadOnlySql", () => {
  it("允许 SELECT 语句", () => {
    expect(isReadOnlySql("SELECT 1")).toBe(true)
    expect(isReadOnlySql("  select * from t")).toBe(true)
  })

  it("允许 SHOW 语句", () => {
    expect(isReadOnlySql("SHOW TABLES")).toBe(true)
  })

  it("允许 DESCRIBE 语句", () => {
    expect(isReadOnlySql("DESCRIBE table1")).toBe(true)
  })

  it("允许 EXPLAIN 语句", () => {
    expect(isReadOnlySql("EXPLAIN SELECT 1")).toBe(true)
  })

  it("允许 WITH (CTE) 语句", () => {
    expect(isReadOnlySql("WITH cte AS (SELECT 1) SELECT * FROM cte")).toBe(true)
  })

  it("拒绝 INSERT 语句", () => {
    expect(isReadOnlySql("INSERT INTO t VALUES (1)")).toBe(false)
  })

  it("拒绝 DELETE 语句", () => {
    expect(isReadOnlySql("DELETE FROM t")).toBe(false)
  })

  it("拒绝 DROP 语句", () => {
    expect(isReadOnlySql("DROP TABLE t")).toBe(false)
  })

  it("拒绝 ALTER 语句", () => {
    expect(isReadOnlySql("ALTER TABLE t ADD COLUMN x Int")).toBe(false)
  })

  it("拒绝 UPDATE 语句", () => {
    expect(isReadOnlySql("UPDATE t SET x = 1")).toBe(false)
  })

  it("大小写不敏感", () => {
    expect(isReadOnlySql("select 1")).toBe(true)
    expect(isReadOnlySql("With cte as (select 1) select * from cte")).toBe(true)
    expect(isReadOnlySql("insert into t values (1)")).toBe(false)
  })

  it("忽略前导空白", () => {
    expect(isReadOnlySql("   SELECT 1")).toBe(true)
    expect(isReadOnlySql("\n\tSELECT 1")).toBe(true)
  })
})
