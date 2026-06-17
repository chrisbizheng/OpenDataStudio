import type { TableMeta, ColumnMeta } from "./types"

export interface DatabaseInfo {
  name: string
  comment: string
}

export type Page<T> =
  | { status: "idle" }
  | { status: "loading"; stale?: T }
  | { status: "ok"; data: T }
  | { status: "error"; error: Error; stale?: T }

export type InvalidateScope =
  | { kind: "all" }
  | { kind: "database"; database: string }
  | { kind: "schema"; database: string; table: string }

export interface CatalogPort {
  listDatabases(): Promise<DatabaseInfo[]>
  listTables(database: string): Promise<TableMeta[]>
  describeTable(database: string, table: string): Promise<ColumnMeta[]>
}

export interface Catalog {
  databases: Page<DatabaseInfo[]>
  getTables(database: string): Page<TableMeta[]>
  getSchema(database: string, table: string): Page<ColumnMeta[]>

  loadDatabases(): Promise<DatabaseInfo[]>
  loadTables(database: string): Promise<TableMeta[]>
  loadSchema(database: string, table: string): Promise<ColumnMeta[]>

  invalidate(scope: InvalidateScope): void

  subscribe(listener: () => void): () => void
  version: number
}

export function pageData<T>(page: Page<T>): T | undefined {
  if (page.status === "ok") return page.data
  if (page.status === "loading" || page.status === "error") return page.stale
  return undefined
}

type CacheKey = string

function dbKey(db: string): string {
  return `tables:${db}`
}

function schemaKey(db: string, table: string): string {
  return `schema:${db}.${table}`
}

function extractStale<T>(page: Page<T> | undefined): T | undefined {
  if (!page) return undefined
  if (page.status === "ok") return page.data
  if (page.status === "loading" || page.status === "error") return page.stale
  return undefined
}

export class CatalogImpl implements Catalog {
  private port: CatalogPort
  private cache = new Map<CacheKey, Page<unknown>>()
  private inflight = new Map<CacheKey, Promise<unknown>>()
  private listeners = new Set<() => void>()

  version = 0

  constructor(port: CatalogPort) {
    this.port = port
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify(): void {
    this.version++
    this.listeners.forEach((l) => l())
  }

  get databases(): Page<DatabaseInfo[]> {
    return (this.cache.get("databases") as Page<DatabaseInfo[]>) ?? { status: "idle" }
  }

  getTables(database: string): Page<TableMeta[]> {
    return (this.cache.get(dbKey(database)) as Page<TableMeta[]>) ?? { status: "idle" }
  }

  getSchema(database: string, table: string): Page<ColumnMeta[]> {
    return (this.cache.get(schemaKey(database, table)) as Page<ColumnMeta[]>) ?? { status: "idle" }
  }

  private async loadIntoCache<T>(
    key: CacheKey,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const existing = this.inflight.get(key)
    if (existing) return existing as Promise<T>

    const prev = this.cache.get(key) as Page<T> | undefined
    this.cache.set(key, { status: "loading", stale: extractStale(prev) })
    this.notify()

    const p = fetcher().then(
      (data) => {
        this.cache.set(key, { status: "ok", data })
        this.inflight.delete(key)
        this.notify()
        return data
      },
      (err) => {
        const prevEntry = this.cache.get(key) as Page<T> | undefined
        this.cache.set(key, {
          status: "error",
          error: err instanceof Error ? err : new Error(String(err)),
          stale: extractStale(prevEntry),
        })
        this.inflight.delete(key)
        this.notify()
        throw err
      }
    )
    this.inflight.set(key, p)
    return p
  }

  loadDatabases(): Promise<DatabaseInfo[]> {
    return this.loadIntoCache("databases", () => this.port.listDatabases())
  }

  loadTables(database: string): Promise<TableMeta[]> {
    return this.loadIntoCache(dbKey(database), () => this.port.listTables(database))
  }

  loadSchema(database: string, table: string): Promise<ColumnMeta[]> {
    return this.loadIntoCache(schemaKey(database, table), () => this.port.describeTable(database, table))
  }

  invalidate(scope: InvalidateScope): void {
    switch (scope.kind) {
      case "all":
        this.cache.clear()
        for (const key of this.inflight.keys()) {
          this.cache.set(key, { status: "idle" })
        }
        this.inflight.clear()
        break

      case "database": {
        const prefix = dbKey(scope.database)
        this.cache.delete(prefix)
        this.inflight.delete(prefix)
        for (const key of this.cache.keys()) {
          if (key.startsWith(`schema:${scope.database}.`)) {
            this.cache.delete(key)
            this.inflight.delete(key)
          }
        }
        break
      }

      case "schema": {
        const key = schemaKey(scope.database, scope.table)
        this.cache.delete(key)
        this.inflight.delete(key)
        break
      }
    }
    this.notify()
  }
}
