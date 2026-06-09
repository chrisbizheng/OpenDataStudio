export interface HistoryItem {
  id: string
  title: string
  meta: string[]
  timestamp: number
}

export function toSqlHistoryItem(entry: {
  id: string
  sql: string
  timestamp: number
  tableName: string | null
  rowCount: number
  executionTime: number
}): HistoryItem {
  return {
    id: entry.id,
    title: entry.sql,
    meta: [
      entry.tableName ?? "",
      `${entry.rowCount} rows`,
      `${entry.executionTime.toFixed(2)}s`,
    ].filter(Boolean),
    timestamp: entry.timestamp,
  }
}

export function toPivotHistoryItem(entry: {
  id: string
  tableName: string
  timestamp: number
  rowCount: number
  config: {
    rows: string[]
    columns: string[]
    indicators: unknown[]
    calculatedIndicators: unknown[]
  }
}): HistoryItem {
  const indicatorCount = entry.config.indicators.length + entry.config.calculatedIndicators.length
  return {
    id: entry.id,
    title: entry.tableName,
    meta: [
      `${entry.config.rows.join(", ")} × ${indicatorCount}指标`,
      `${entry.rowCount}行`,
    ],
    timestamp: entry.timestamp,
  }
}