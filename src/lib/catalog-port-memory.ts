import type { CatalogPort, DatabaseInfo } from "./catalog"
import type { TableMeta, ColumnMeta } from "./types"

export interface MemoryPortFixtures {
  databases?: DatabaseInfo[]
  tables?: Record<string, TableMeta[]>
  schema?: Record<string, ColumnMeta[]>
  latency?: number
  failOn?: { resource: "databases" | "tables" | "schema"; key?: string }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export class MemoryCatalogPort implements CatalogPort {
  private fixtures: MemoryPortFixtures

  constructor(fixtures: MemoryPortFixtures = {}) {
    this.fixtures = fixtures
  }

  async listDatabases(): Promise<DatabaseInfo[]> {
    if (this.fixtures.failOn?.resource === "databases") {
      throw new Error("injected failure")
    }
    if (this.fixtures.latency) await sleep(this.fixtures.latency)
    return this.fixtures.databases ?? []
  }

  async listTables(database: string): Promise<TableMeta[]> {
    if (this.fixtures.failOn?.resource === "tables" && (!this.fixtures.failOn.key || this.fixtures.failOn.key === database)) {
      throw new Error("injected failure")
    }
    if (this.fixtures.latency) await sleep(this.fixtures.latency)
    return this.fixtures.tables?.[database] ?? []
  }

  async describeTable(database: string, table: string): Promise<ColumnMeta[]> {
    const key = `${database}.${table}`
    if (this.fixtures.failOn?.resource === "schema" && (!this.fixtures.failOn.key || this.fixtures.failOn.key === key)) {
      throw new Error("injected failure")
    }
    if (this.fixtures.latency) await sleep(this.fixtures.latency)
    return this.fixtures.schema?.[key] ?? []
  }

  update(fixtures: Partial<MemoryPortFixtures>): void {
    this.fixtures = { ...this.fixtures, ...fixtures }
  }
}
