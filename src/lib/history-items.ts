import type { Lang } from "@/lib/i18n"
import { t } from "@/lib/i18n"

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
}, lang: Lang = "zh"): HistoryItem {
  return {
    id: entry.id,
    title: entry.sql,
    meta: [
      entry.tableName ?? "",
      `${entry.rowCount} ${t("history.rows", lang)}`,
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
  sql?: string
  config: {
    rows: string[]
    columns: string[]
    indicators: unknown[]
    calculatedIndicators: unknown[]
  }
}, lang: Lang = "zh"): HistoryItem {
  const indicatorCount = entry.config.indicators.length + entry.config.calculatedIndicators.length
  return {
    id: entry.id,
    title: entry.tableName,
    meta: [
      `${entry.config.rows.join(", ")} × ${indicatorCount}${t("field.role.indicator", lang)}`,
      `${entry.rowCount}${t("history.rows", lang)}`,
      entry.sql ? entry.sql.split("\n")[0].slice(0, 60) : undefined,
    ].filter(Boolean) as string[],
    timestamp: entry.timestamp,
  }
}