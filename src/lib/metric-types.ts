// ── Metric 模型 ──

export type AggregationType = "SUM" | "AVG" | "COUNT" | "MIN" | "MAX" | "COUNT_DISTINCT"
export type MetricFormat = "number" | "percent" | "currency"

export interface SimpleMetric {
  id: string
  type: "simple"
  column: string
  aggregation: AggregationType
  label: string
  format?: MetricFormat
  decimals?: number
  description?: string
}

export interface CustomSqlMetric {
  id: string
  type: "custom_sql"
  label: string
  sqlExpression: string
  format?: MetricFormat
  decimals?: number
  description?: string
}

export type Metric = SimpleMetric | CustomSqlMetric

// ── Dimension 模型 ──

export type DimensionType = "categorical" | "temporal" | "numeric" | "geographic"
export type TimeGranularity = "second" | "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year"

export interface Dimension {
  column: string
  label?: string
  type: DimensionType
  timeGranularity?: TimeGranularity // 仅 type="temporal" 时有效
}

// ── Time 配置 ──

export type TimeRange =
  | "No filter"
  | "Last 7 days"
  | "Last 30 days"
  | "Last quarter"
  | "Last year"
  | "Custom"

export interface TimeConfig {
  timeColumn: string
  granularity: TimeGranularity
  timeRange: TimeRange
  customRange?: { from: string; to: string } // ISO 日期字符串，仅 timeRange="Custom" 时有效
}

// ── Rolling Window ──

export type WindowFunction = "AVG" | "SUM" | "MIN" | "MAX"

export interface RollingWindowConfig {
  enabled: boolean
  windowSize: number       // 窗口行数，如 7 = 当前行+前6行
  function: WindowFunction // 窗口聚合函数
  metricIds: string[]     // 应用到哪些 metric 的 id
}

export interface AdvancedAnalytics {
  rollingWindow?: RollingWindowConfig
}

// ── Explore 配置（聚合根）──

export interface ExploreConfig {
  datasetId: string
  metrics: Metric[]
  dimensions: Dimension[]
  timeConfig?: TimeConfig
  orderBy?: { column: string; direction: "asc" | "desc" }
  rowLimit: number // 默认 10000
  analytics?: AdvancedAnalytics
}

// ── Dataset 引用类型（供 dashboards.ts ChartWidget.exploreConfig 使用）──

export interface DatasetRef {
  id: string
  name: string
  type: "physical" | "virtual"
  database?: string
  table?: string
  sql?: string
}
