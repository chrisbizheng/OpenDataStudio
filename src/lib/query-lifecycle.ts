import type { ColumnMeta, QueryResult } from "./types"
import { escapeField } from "./sql-utils"
import { unwrapNullable } from "./column-type-classifier"

export interface TableData {
  columns: string[]
  rows: unknown[][]
  stats: { elapsed: number; rowsRead: number; bytesRead: number }
}

export interface SortState {
  column: string | null
  direction: "asc" | "desc" | null
}

export interface QueryLifecycleState {
  status: "idle" | "executing" | "ok" | "error"
  currentTable: string | null
  currentSchema: ColumnMeta[]
  data: TableData | null
  error: string | null
  sort: SortState
  searchQuery: string
  sql: string
  loadedRows: number
  pendingAutoExecute: string | null
}

interface StableOrder {
  field: string
  direction: "ASC" | "DESC"
}

const TIME_NAME_PATTERN = /^(event_time|timestamp|created_at|date|time)$/i
const ID_NAME_PATTERN = /(^id$|_id$)/i
const INCREMENTAL_THRESHOLD = 160

function inferStableOrder(schema: Pick<ColumnMeta, "name" | "type">[]): StableOrder | null {
  const timeField = schema.find((field) => {
    const type = unwrapNullable(field.type)
    return /^(Date|DateTime)/.test(type) && TIME_NAME_PATTERN.test(field.name)
  })
  if (timeField) return { field: timeField.name, direction: "DESC" }
  const idField = schema.find((field) => ID_NAME_PATTERN.test(field.name))
  if (idField) return { field: idField.name, direction: "ASC" }
  return null
}

function buildTableSql(
  database: string,
  table: string,
  stableOrder: StableOrder | null,
  limit = 1000,
  offset = 0
): string {
  const qualified = `${escapeField(database)}.${escapeField(table)}`
  const orderBy = stableOrder ? ` ORDER BY ${escapeField(stableOrder.field)} ${stableOrder.direction}` : ""
  return `SELECT * FROM ${qualified}${orderBy} LIMIT ${limit}${offset > 0 ? ` OFFSET ${offset}` : ""}`
}

function buildSortedSql(
  database: string,
  table: string,
  column: string,
  direction: "ASC" | "DESC",
  limit = 1000,
  offset = 0
): string {
  const qualified = `${escapeField(database)}.${escapeField(table)}`
  return `SELECT * FROM ${qualified} ORDER BY ${escapeField(column)} ${direction} LIMIT ${limit}${offset > 0 ? ` OFFSET ${offset}` : ""}`
}

function matchRow(row: unknown[], query: string): boolean {
  const q = query.toLowerCase()
  return row.some((cell) => String(cell ?? "").toLowerCase().includes(q))
}

export interface QueryLifecycleDeps {
  executeSql: (sql: string, database?: string, signal?: AbortSignal) => Promise<QueryResult | null>
}

type Listener = (state: QueryLifecycleState) => void

export class QueryLifecycle {
  private deps: QueryLifecycleDeps
  private _state: QueryLifecycleState
  private listeners: Set<Listener> = new Set()
  private controller: AbortController | null = null
  private filterCache: { rows: unknown[][] | null; query: string; result: unknown[][] | null } = {
    rows: null,
    query: "",
    result: null,
  }

  constructor(deps: QueryLifecycleDeps) {
    this.deps = deps
    this._state = {
      status: "idle",
      currentTable: null,
      currentSchema: [],
      data: null,
      error: null,
      sort: { column: null, direction: null },
      searchQuery: "",
      sql: "",
      loadedRows: 0,
      pendingAutoExecute: null,
    }
  }

  get state(): QueryLifecycleState {
    return this._state
  }

  private setState(patch: Partial<QueryLifecycleState>): void {
    this._state = { ...this._state, ...patch }
    this.listeners.forEach((fn) => fn(this._state))
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  setSql(sql: string): void {
    this.setState({ sql })
  }

  setPendingAutoExecute(sql: string | null): void {
    this.setState({ pendingAutoExecute: sql })
  }

  setCurrentSchema(schema: ColumnMeta[]): void {
    this.setState({ currentSchema: schema })
  }

  setSearchQuery(query: string): void {
    this.setState({ searchQuery: query })
  }

  setSort(sort: SortState): void {
    this.setState({ sort })
  }

  async execute(sql: string, tableName: string, append = false): Promise<void> {
    this.cancel()
    const controller = new AbortController()
    this.controller = controller

    if (!append) {
      this.setState({
        status: "executing",
        currentTable: tableName,
        error: null,
      })
    } else {
      this.setState({ status: "executing", error: null })
    }

    try {
      const result = await this.deps.executeSql(sql, undefined, controller.signal)
      if (controller.signal.aborted) return
      if (!result) return

      if (append && this._state.data) {
        const merged = [...this._state.data.rows, ...result.rows]
        this.setState({
          data: { ...this._state.data, rows: merged },
          loadedRows: merged.length,
          status: "ok",
        })
      } else {
        this.setState({
          data: result,
          loadedRows: result.rows.length,
          status: "ok",
          error: null,
        })
      }
    } catch (e) {
      if (controller.signal.aborted) return
      if (e instanceof DOMException && e.name === "AbortError") return
      this.setState({
        error: e instanceof Error ? e.message : "Network error",
        status: "error",
      })
    } finally {
      if (this.controller === controller) {
        this.controller = null
      }
    }
  }

  cancel(): void {
    if (this.controller) {
      this.controller.abort()
      this.controller = null
      if (this._state.status === "executing") {
        this.setState({ status: "idle" })
      }
    }
  }

  async executeDefaultTable(database: string, table: string, schema: ColumnMeta[]): Promise<void> {
    this.setState({ currentSchema: schema })
    const stableOrder = inferStableOrder(schema)
    const sql = buildTableSql(database, table, stableOrder)
    await this.execute(sql, `${database}.${table}`)
  }

  sort(column: string, database: string, table: string, schema: ColumnMeta[]): void {
    const { sort } = this._state
    let newDir: "asc" | "desc" | null
    if (sort.column !== column) {
      newDir = "asc"
    } else if (sort.direction === "asc") {
      newDir = "desc"
    } else if (sort.direction === "desc") {
      newDir = null
    } else {
      newDir = "asc"
    }

    this.setState({ sort: { column, direction: newDir } })

    if (newDir) {
      const sql = buildSortedSql(database, table, column, newDir.toUpperCase() as "ASC" | "DESC")
      this.execute(sql, `${database}.${table}`)
    } else {
      const stableOrder = inferStableOrder(schema)
      const sql = buildTableSql(database, table, stableOrder)
      this.execute(sql, `${database}.${table}`)
    }
  }

  getFilteredRows(): unknown[][] {
    const { data, searchQuery } = this._state
    if (!data) return []
    if (!searchQuery.trim()) return data.rows

    if (data.rows === this.filterCache.rows && searchQuery === this.filterCache.query && this.filterCache.result) {
      return this.filterCache.result
    }

    const result = data.rows.filter((row) => matchRow(row, searchQuery))
    this.filterCache = { rows: data.rows, query: searchQuery, result }
    return result
  }

  shouldLoadMore(scrollTop: number, clientHeight: number, scrollHeight: number): boolean {
    return scrollHeight - scrollTop - clientHeight <= INCREMENTAL_THRESHOLD
  }

  async loadMore(): Promise<void> {
    const { currentTable, currentSchema, sort, loadedRows } = this._state
    if (!currentTable) return
    const db = currentTable.split(".")[0] || ""
    const table = currentTable.split(".")[1] || currentTable
    const offset = loadedRows
    let sql: string
    if (sort.column && sort.direction) {
      sql = buildSortedSql(db, table, sort.column, sort.direction.toUpperCase() as "ASC" | "DESC", 1000, offset)
    } else {
      const stableOrder = inferStableOrder(currentSchema)
      sql = buildTableSql(db, table, stableOrder, 1000, offset)
    }
    await this.execute(sql, currentTable, true)
  }
}
