import type { QueryPort } from "./query-engine"
import type { QueryResult } from "./types"
import { fetchJson } from "./fetch-json"

export class HttpQueryPort implements QueryPort {
  async execute(sql: string, database?: string, signal?: AbortSignal): Promise<QueryResult> {
    return fetchJson<QueryResult>("/api/query", {
      method: "POST",
      body: JSON.stringify({ sql, database }),
      signal,
    })
  }
}
