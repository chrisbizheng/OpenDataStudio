import type { HistoryStoreState } from "./history-store-factory"
import { createHistoryStore } from "./history-store-factory"

export interface SqlHistoryEntry {
  id: string
  sql: string
  timestamp: number
  executionTime: number
  tableName: string | null
  rowCount: number
}

export const useSqlHistoryStore = createHistoryStore<SqlHistoryEntry>({
  name: "sql-history",
})
