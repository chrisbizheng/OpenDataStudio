import { escapeField, escapeValue } from "./sql-utils"
import type { Metric, Dimension, TimeConfig, TimeGranularity, ExploreConfig, RollingWindowConfig } from "./metric-types"

// ── 时间粒度 -> ClickHouse 函数映射 ──

export const TIME_GRAIN_FN: Record<TimeGranularity, string> = {
  second: "toStartOfSecond",
  minute: "toStartOfMinute",
  hour: "toStartOfHour",
  day: "toStartOfDay",
  week: "toMonday",
  month: "toStartOfMonth",
  quarter: "toStartOfQuarter",
  year: "toStartOfYear",
}

// ── 时间范围 -> WHERE 条件 ──

export function timeRangeToWhere(
  column: string,
  timeRange: TimeConfig["timeRange"],
  customRange?: { from: string; to: string }
): string | null {
  const col = escapeField(column)

  switch (timeRange) {
    case "No filter":
      return null
    case "Last 7 days":
      return `${col} >= today() - INTERVAL 7 DAY`
    case "Last 30 days":
      return `${col} >= today() - INTERVAL 30 DAY`
    case "Last quarter":
      return `${col} >= toStartOfQuarter(today()) - INTERVAL 3 MONTH`
    case "Last year":
      return `${col} >= toStartOfYear(today()) - INTERVAL 1 YEAR`
    case "Custom":
      if (!customRange) return null
      return `${col} >= ${escapeValue(customRange.from)} AND ${col} <= ${escapeValue(customRange.to)}`
    default:
      return null
  }
}

// ── Metric -> SELECT 子句片段 ──

function metricToSQL(metric: Metric): string {
  if (metric.type === "simple") {
    if (metric.aggregation === "COUNT_DISTINCT") {
      return `COUNT(DISTINCT ${escapeField(metric.column)}) AS ${escapeField(metric.id)}`
    }
    return `${metric.aggregation}(${escapeField(metric.column)}) AS ${escapeField(metric.id)}`
  }
  // custom_sql
  return `(${metric.sqlExpression}) AS ${escapeField(metric.id)}`
}

// ── Dimension -> SELECT 子句片段（含时间粒度转换）──

function dimensionToSQL(dim: Dimension): string {
  if (dim.type === "temporal" && dim.timeGranularity) {
    const fn = TIME_GRAIN_FN[dim.timeGranularity]
    return `${fn}(${escapeField(dim.column)}) AS ${escapeField(dim.column)}`
  }
  return `${escapeField(dim.column)} AS ${escapeField(dim.column)}`
}

// ── FROM 子句 ──

function buildFromClause(dataset: {
  type: "physical" | "virtual"
  database?: string
  table?: string
  sql?: string
}): string {
  if (dataset.type === "physical") {
    return `FROM ${escapeField(dataset.database ?? "")}.${escapeField(dataset.table ?? "")}`
  }
  // virtual
  return `FROM (${dataset.sql ?? ""}) AS __virtual_dataset`
}

// ── GROUP BY 表达式 ──
// GROUP BY uses the SELECT alias (column name), NOT the wrapped expression.
// Reason: ClickHouse alias shadowing. `SELECT toStartOfDay(date) AS date ... GROUP BY toStartOfDay(date)`
// resolves the inner `date` to the SELECT alias, causing "not under aggregate function" errors.
// GROUP BY the alias `date` is valid ClickHouse SQL and avoids the shadowing.

function dimensionGroupByExpr(dim: Dimension): string {
  return escapeField(dim.column)
}

// ── 构建 ORDER BY 子句 ──

function buildOrderBy(config: ExploreConfig): string {
  if (config.orderBy) {
    return `ORDER BY ${escapeField(config.orderBy.column)} ${config.orderBy.direction.toUpperCase()}`
  }
  if (config.timeConfig && config.dimensions.some((d) => d.type === "temporal")) {
    return `ORDER BY ${escapeField(config.timeConfig.timeColumn)} ASC`
  }
  return ""
}

// ── 构建窗口 ORDER BY 列（dimension 列名）──

function windowOrderByColumns(config: ExploreConfig): string[] {
  if (config.timeConfig) {
    return [escapeField(config.timeConfig.timeColumn)]
  }
  return config.dimensions.map((d) => escapeField(d.column))
}

// ── 主函数 ──

export function buildExploreSQL(
  config: ExploreConfig,
  dataset: { type: "physical" | "virtual"; database?: string; table?: string; sql?: string }
): string {
  // SELECT
  const selectParts: string[] = []

  for (const dim of config.dimensions) {
    selectParts.push(dimensionToSQL(dim))
  }

  for (const metric of config.metrics) {
    selectParts.push(metricToSQL(metric))
  }

  const select = selectParts.join(",\n  ")

  // FROM
  const from = buildFromClause(dataset)

  // WHERE
  const whereParts: string[] = []

  if (config.timeConfig && config.timeConfig.timeRange !== "No filter") {
    const timeWhere = timeRangeToWhere(
      config.timeConfig.timeColumn,
      config.timeConfig.timeRange,
      config.timeConfig.customRange
    )
    if (timeWhere) {
      whereParts.push(timeWhere)
    }
  }

  const where = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : ""

  // GROUP BY
  const groupBy =
    config.dimensions.length > 0
      ? `GROUP BY ${config.dimensions.map(dimensionGroupByExpr).join(", ")}`
      : ""

  // ORDER BY
  const orderBy = buildOrderBy(config)

  // LIMIT
  const limit = `LIMIT ${config.rowLimit}`

  // Rolling window check
  const rw = config.analytics?.rollingWindow
  const hasRollingWindow = rw?.enabled && rw.metricIds.length > 0 && config.dimensions.length > 0

  if (!hasRollingWindow) {
    return [`SELECT\n  ${select}`, from, where, groupBy, orderBy, limit]
      .filter(Boolean)
      .join("\n")
  }

  // ── Rolling window: wrap in outer query ──

  // Inner query: SELECT + FROM + WHERE + GROUP BY (no ORDER BY, no LIMIT)
  const innerParts = [`SELECT\n  ${select}`, from, where, groupBy]
    .filter(Boolean)
    .join("\n")

  // Outer SELECT: pass through all columns + add window function columns
  const outerSelectParts: string[] = []
  for (const dim of config.dimensions) {
    outerSelectParts.push(escapeField(dim.column))
  }

  const wbCols = windowOrderByColumns(config)
  const wbColStr = wbCols.join(", ")

  for (const metric of config.metrics) {
    const metricId = escapeField(metric.id)
    outerSelectParts.push(metricId)

    if (rw.metricIds.includes(metric.id)) {
      const rollingAlias = escapeField(`${metric.id}_rolling_${rw.windowSize}`)
      const preceding = rw.windowSize - 1
      outerSelectParts.push(
        `${rw.function}(${metricId}) OVER (ORDER BY ${wbColStr} ROWS BETWEEN ${preceding} PRECEDING AND CURRENT ROW) AS ${rollingAlias}`
      )
    }
  }

  const outerSelect = outerSelectParts.join(",\n  ")

  return [
    `SELECT\n  ${outerSelect}`,
    `FROM (\n${innerParts}\n) AS __base`,
    orderBy,
    limit,
  ]
    .filter(Boolean)
    .join("\n")
}
