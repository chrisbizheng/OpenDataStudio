import { isDimensionType, isIndicatorType } from "./column-type-classifier"

export interface DeepDiveItem {
  key: string
  value: number
  row: Record<string, unknown>
  seriesName?: string
}

export interface DeepDiveDirectionInput {
  item: DeepDiveItem
  visualizationConfig: {
    type: string
    xKey: string
    yKey?: string
    series?: { yKey: string; label?: string; chartType?: string }[]
  }
  columns: string[]
  rowCount?: number
  schema: { name: string; type: string; comment?: string }[]
  lang: string
}

export interface DeepDiveDirection {
  label: string
  prompt: string
}

function quoteValue(value: unknown): string {
  return String(value ?? "").replace(/'/g, "\\'")
}

function metricKey(input: DeepDiveDirectionInput): string {
  return input.visualizationConfig.yKey || input.visualizationConfig.series?.[0]?.yKey || input.item.seriesName || "value"
}

function clickedDimension(input: DeepDiveDirectionInput): { field: string; value: unknown } {
  const xKey = input.visualizationConfig.xKey
  if (Object.prototype.hasOwnProperty.call(input.item.row, xKey)) return { field: xKey, value: input.item.row[xKey] }
  const dim = Object.entries(input.item.row).find(([key]) => key !== metricKey(input))
  return dim ? { field: dim[0], value: dim[1] } : { field: xKey, value: input.item.key }
}

export function suggestDeepDiveDirections(input: DeepDiveDirectionInput): DeepDiveDirection[] {
  const isZh = input.lang === "zh"
  const metric = metricKey(input)
  const clicked = clickedDimension(input)
  const condition = `${clicked.field} = '${quoteValue(clicked.value)}'`
  const seriesKeys = input.visualizationConfig.series?.map((s) => s.yKey) ?? []
  const usedFields = new Set([clicked.field, metric, ...seriesKeys])
  const drillDim = input.schema.find((c) => isDimensionType(c.type) && !usedFields.has(c.name))
  const directions: DeepDiveDirection[] = []

  if (drillDim) {
    directions.push({
      label: isZh ? `下钻 ${clicked.value} 的 ${drillDim.name} 构成` : `Drill down ${clicked.value} by ${drillDim.name}`,
      prompt: isZh
        ? `下钻分析：在 ${condition} 的范围内，按 ${drillDim.name} 分组统计 ${metric} 的构成。请生成 SQL 并查询。`
        : `Drill-down analysis: within ${condition}, group by ${drillDim.name} and summarize ${metric}. Generate SQL and query the data.`,
    })
  }

  if ((input.rowCount ?? 0) > 1) {
    directions.push({
      label: isZh ? `对比 ${clicked.value} 与其他 ${clicked.field}` : `Compare ${clicked.value} with other ${clicked.field}`,
      prompt: isZh
        ? `对比分析：在 ${clicked.field} 维度下，对比 '${quoteValue(clicked.value)}' 与其他 ${clicked.field} 的 ${metric}。请生成 SQL 并查询。`
        : `Comparison analysis: compare '${quoteValue(clicked.value)}' with other ${clicked.field} values on ${metric}. Generate SQL and query the data.`,
    })
  }

  const timeCol = input.schema.find((c) => /^(Date|DateTime)/.test(c.type.replace(/^Nullable\((.+)\)$/, "$1")))
  if (timeCol) {
    directions.push({
      label: isZh ? `查看 ${clicked.value} 的 ${metric} 时间趋势` : `Show ${metric} trend for ${clicked.value}`,
      prompt: isZh
        ? `时间趋势：在 ${condition} 的范围内，按 ${timeCol.name} 字段统计 ${metric} 随时间的变化。请生成 SQL 并查询。`
        : `Time trend: within ${condition}, summarize ${metric} over ${timeCol.name}. Generate SQL and query the data.`,
    })
  }

  directions.push({
    label: isZh ? `查询 ${clicked.value} 的明细` : `Query details for ${clicked.value}`,
    prompt: isZh
      ? `明细查询：列出 ${condition} 的前 20 行 ${metric} 相关明细。请生成 SQL 并查询。`
      : `Detail query: list the top 20 detail rows related to ${metric} where ${condition}. Generate SQL and query the data.`,
  })

  const chartType = input.visualizationConfig.type.toLowerCase()
  const indicators = input.schema.filter((c) => isIndicatorType(c.type))
  if (["bar", "pie"].includes(chartType) && indicators.some((c) => c.name === metric)) {
    directions.push({
      label: isZh ? `分析 ${clicked.value} 的占比` : `Analyze share of ${clicked.value}`,
      prompt: isZh
        ? `占比分析：计算 '${quoteValue(clicked.value)}' 在 ${clicked.field} 维度的总 ${metric} 中所占百分比。请生成 SQL 并查询。`
        : `Share analysis: calculate the percentage of '${quoteValue(clicked.value)}' in total ${metric} by ${clicked.field}. Generate SQL and query the data.`,
    })
  }

  const otherMetric = indicators.find((c) => c.name !== metric)
  if (otherMetric) {
    directions.push({
      label: isZh ? `分析 ${metric} 与 ${otherMetric.name} 关系` : `Analyze ${metric} vs ${otherMetric.name}`,
      prompt: isZh
        ? `关联分析：在 ${condition} 的范围内，分析 ${metric} 与 ${otherMetric.name} 的关系。请生成 SQL 并查询。`
        : `Relationship analysis: within ${condition}, analyze the relationship between ${metric} and ${otherMetric.name}. Generate SQL and query the data.`,
    })
  }

  if (indicators.some((c) => c.name === metric)) {
    directions.push({
      label: isZh ? `找出 ${metric} 异常值` : `Find ${metric} outliers`,
      prompt: isZh
        ? `异常检测：找出 ${condition} 中 ${metric} 显著偏离的数据。请生成 SQL 并查询。`
        : `Outlier detection: find records where ${metric} significantly deviates within ${condition}. Generate SQL and query the data.`,
    })
  }

  if (["line", "area"].includes(chartType) && timeCol) {
    directions.push({
      label: isZh ? `分析 ${metric} 环比变化` : `Analyze period-over-period ${metric}`,
      prompt: isZh
        ? `环比变化：分析 ${condition} 的 ${metric} 按 ${timeCol.name} 的环比变化。请生成 SQL 并查询。`
        : `Period-over-period analysis: analyze ${metric} changes by ${timeCol.name} within ${condition}. Generate SQL and query the data.`,
    })
  }

  return directions.slice(0, 4)
}
