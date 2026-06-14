import type { QueryPort } from "./query-engine"
import type { QueryResult } from "./types"

async function request<T>(
  url: string,
  options?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error(err.message || `Request failed: ${res.status}`)
  }
  return res.json()
}

export class HttpQueryPort implements QueryPort {
  async execute(sql: string, database?: string, signal?: AbortSignal): Promise<QueryResult> {
    return request<QueryResult>("/api/query", {
      method: "POST",
      body: JSON.stringify({ sql, database }),
      signal,
    })
  }
}
