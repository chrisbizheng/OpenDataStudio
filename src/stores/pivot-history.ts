import type { PivotConfig } from "@/lib/pivot-sql"
import { createHistoryStore } from "./history-store-factory"

export interface PivotHistoryEntry {
  id: string
  tableName: string
  database: string
  config: PivotConfig
  sql?: string
  timestamp: number
  rowCount: number
}

export const usePivotHistoryStore = createHistoryStore<PivotHistoryEntry>({
  name: "pivot-history",
})
