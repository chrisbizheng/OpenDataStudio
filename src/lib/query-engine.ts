import type { QueryResult } from "./types"

export interface QueryPort {
  execute(sql: string, database?: string, signal?: AbortSignal): Promise<QueryResult>
}

export interface QueryEngine {
  execute(sql: string, database?: string): Promise<QueryResult | null>
  cancel(): void
}

export class QueryEngineImpl implements QueryEngine {
  private port: QueryPort
  private controller: AbortController | null = null

  constructor(port: QueryPort) {
    this.port = port
  }

  async execute(sql: string, database?: string): Promise<QueryResult | null> {
    if (this.controller) {
      this.controller.abort()
    }
    this.controller = new AbortController()

    try {
      const result = await this.port.execute(sql, database, this.controller.signal)
      return result
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return null
      throw e
    } finally {
      if (this.controller?.signal.aborted === false) {
        this.controller = null
      }
    }
  }

  cancel(): void {
    this.controller?.abort()
    this.controller = null
  }
}
