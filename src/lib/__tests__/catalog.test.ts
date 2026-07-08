import { describe, expect, it, beforeEach } from "vitest"
import { CatalogImpl, type Catalog } from "@/lib/catalog"
import { MemoryCatalogPort, type MemoryPortFixtures } from "@/lib/catalog-port-memory"
import type { DatabaseInfo } from "@/lib/catalog"
import type { TableMeta, ColumnMeta } from "@/lib/types"

function createCatalog(fixtures?: MemoryPortFixtures): Catalog {
  return new CatalogImpl(new MemoryCatalogPort(fixtures))
}

const defaultDatabases: DatabaseInfo[] = [
  { name: "analytics", comment: "分析数据库" },
  { name: "default", comment: "" },
]

const defaultTables: Record<string, TableMeta[]> = {
  analytics: [
    { name: "sales", engine: "MergeTree", rowCount: 100, comment: "销售表" },
    { name: "orders", engine: "MergeTree", rowCount: 200, comment: "" },
  ],
}

const defaultSchema: Record<string, ColumnMeta[]> = {
  "analytics.sales": [
    { name: "id", type: "UInt64", comment: "" },
    { name: "amount", type: "Float64", comment: "金额" },
  ],
}

describe("CatalogImpl", () => {
  let catalog: Catalog

  beforeEach(() => {
    catalog = createCatalog({
      databases: defaultDatabases,
      tables: defaultTables,
      schema: defaultSchema,
    })
  })

  describe("initial state", () => {
    it("所有页面初始为 idle", () => {
      expect(catalog.databases.status).toBe("idle")
      expect(catalog.getTables("analytics").status).toBe("idle")
      expect(catalog.getSchema("analytics", "sales").status).toBe("idle")
    })
  })

  describe("loadDatabases", () => {
    it("加载数据库列表", async () => {
      const data = await catalog.loadDatabases()
      expect(data).toHaveLength(2)
      expect(data[0].name).toBe("analytics")

      const page = catalog.databases
      expect(page.status).toBe("ok")
      if (page.status === "ok") {
        expect(page.data).toHaveLength(2)
        expect(page.data[0].name).toBe("analytics")
      }
    })

    it("重复调用返回缓存", async () => {
      const first = await catalog.loadDatabases()
      const second = await catalog.loadDatabases()
      expect(first).toBe(second)
    })

    it("失败时设置错误状态", async () => {
      const failCatalog = createCatalog({
        failOn: { resource: "databases" },
      })
      await expect(failCatalog.loadDatabases()).rejects.toThrow("injected failure")

      const page = failCatalog.databases
      expect(page.status).toBe("error")
      if (page.status === "error") {
        expect(page.error.message).toBe("injected failure")
      }
    })
  })

  describe("loadTables", () => {
    it("加载表列表", async () => {
      const data = await catalog.loadTables("analytics")
      expect(data).toHaveLength(2)
      expect(data[0].name).toBe("sales")

      const page = catalog.getTables("analytics")
      expect(page.status).toBe("ok")
      if (page.status === "ok") {
        expect(page.data).toHaveLength(2)
      }
    })

    it("失败时设置错误状态，保留 stale 数据", async () => {
      // 用可变 port：先成功加载建立 stale 数据，再切换为失败
      const port = new MemoryCatalogPort({
        databases: defaultDatabases,
        tables: defaultTables,
        schema: defaultSchema,
      })
      const cat = new CatalogImpl(port)

      // 1. 成功加载 → 缓存 ok
      await cat.loadTables("analytics")
      expect(cat.getTables("analytics").status).toBe("ok")

      // 2. 切换 port 为失败
      port.update({ failOn: { resource: "tables", key: "analytics" } })

      // 3. 重新加载 → 抛错 + 设置 error 状态 + 保留 stale 数据
      await expect(cat.loadTables("analytics")).rejects.toThrow("injected failure")

      const page = cat.getTables("analytics")
      expect(page.status).toBe("error")
      if (page.status === "error") {
        expect(page.stale).toHaveLength(2)
        expect(page.stale?.[0].name).toBe("sales")
      }
    })

    it("不同数据库独立缓存", async () => {
      const allTables: Record<string, TableMeta[]> = {
        analytics: [{ name: "sales", engine: "MergeTree", rowCount: 100, comment: "" }],
        default: [{ name: "events", engine: "MergeTree", rowCount: 50, comment: "" }],
      }
      const cat = createCatalog({ databases: defaultDatabases, tables: allTables })

      await cat.loadTables("analytics")
      await cat.loadTables("default")

      const aPage = cat.getTables("analytics")
      const dPage = cat.getTables("default")
      expect(aPage.status).toBe("ok")
      expect(dPage.status).toBe("ok")
      if (aPage.status === "ok" && dPage.status === "ok") {
        expect(aPage.data[0].name).toBe("sales")
        expect(dPage.data[0].name).toBe("events")
      }
    })
  })

  describe("loadSchema", () => {
    it("加载表 schema", async () => {
      const data = await catalog.loadSchema("analytics", "sales")
      expect(data).toHaveLength(2)
      expect(data[0].name).toBe("id")

      const page = catalog.getSchema("analytics", "sales")
      expect(page.status).toBe("ok")
      if (page.status === "ok") {
        expect(page.data).toHaveLength(2)
      }
    })
  })

  describe("invalidate", () => {
    it("invalidate all 清除所有缓存", async () => {
      await catalog.loadDatabases()
      await catalog.loadTables("analytics")
      await catalog.loadSchema("analytics", "sales")

      catalog.invalidate({ kind: "all" })

      expect(catalog.databases.status).toBe("idle")
      expect(catalog.getTables("analytics").status).toBe("idle")
      expect(catalog.getSchema("analytics", "sales").status).toBe("idle")
    })

    it("invalidate database 级联清除 tables 和 schema", async () => {
      await catalog.loadDatabases()
      await catalog.loadTables("analytics")
      await catalog.loadSchema("analytics", "sales")

      catalog.invalidate({ kind: "database", database: "analytics" })

      expect(catalog.databases.status).toBe("ok")
      expect(catalog.getTables("analytics").status).toBe("idle")
      expect(catalog.getSchema("analytics", "sales").status).toBe("idle")
    })

    it("invalidate schema 只清除指定表", async () => {
      await catalog.loadSchema("analytics", "sales")

      catalog.invalidate({ kind: "schema", database: "analytics", table: "sales" })

      expect(catalog.getSchema("analytics", "sales").status).toBe("idle")
    })
  })

  describe("deduplication", () => {
    it("并发请求共享同一个 Promise", async () => {
      const p1 = catalog.loadDatabases()
      const p2 = catalog.loadDatabases()
      const result1 = await p1
      const result2 = await p2
      expect(result1).toBe(result2)
    })
  })
})
