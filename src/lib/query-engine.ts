import { fetchJson } from "./fetch-json"
import type { QueryResult } from "./types"

export interface QueryEngine {
  execute(sql: string, database?: string, signal?: AbortSignal): Promise<QueryResult | null>
  cancel(): void
}

export class QueryEngineImpl implements QueryEngine {
  async execute(sql: string, database?: string, signal?: AbortSignal): Promise<QueryResult | null> {
    try {
      return await fetchJson<QueryResult>("/api/query", {
        method: "POST",
        body: JSON.stringify({ sql, database }),
        signal,
      })
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return null
      throw e
    }
  }

  // No-op: signal is caller-owned (QueryLifecycle). Kept for use-pivot-orchestrator API compat.
  cancel(): void {}
}
