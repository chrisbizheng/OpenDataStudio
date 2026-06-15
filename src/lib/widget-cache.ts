/**
 * Widget result cache — IndexedDB via idb-keyval.
 *
 * Stores query results keyed by widget ID, keeping localStorage
 * free of large data blobs (5-10 MB limit).
 */
import { get, set, del } from "idb-keyval"

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
  fetchedAt: number
}

export const widgetCache = {
  async get(widgetId: string): Promise<QueryResult | null> {
    try {
      return (await get<QueryResult>(widgetId)) ?? null
    } catch (e) {
      console.warn("[widget-cache] IndexedDB read failed, returning null:", e)
      return null
    }
  },

  async set(widgetId: string, result: QueryResult): Promise<void> {
    await set(widgetId, result)
  },

  async delete(widgetId: string): Promise<void> {
    await del(widgetId)
  },
}
