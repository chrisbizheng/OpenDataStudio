import type { ColumnMeta } from "./types"
import { isMetricByName, isMetricColumn, isIndicatorType, isDimensionType, unwrapNullable } from "./column-type-classifier"
import { parseGroupByColumns } from "./sql-clause-parser"

export function suggestQuestions(schema: ColumnMeta[], lang: string): string[] {
  const suggestions: string[] = []
  const nums = schema.filter((c) => isIndicatorType(c.type))
  const strs = schema.filter((c) => isDimensionType(c.type) && /^(String|FixedString|LowCardinality)/.test(unwrapNullable(c.type)))
  const dates = schema.filter((c) => /^(Date|DateTime)/.test(unwrapNullable(c.type)))

  const isZh = lang === "zh"

  if (nums.length > 0 && strs.length > 0) {
    const metric = nums.find((c) => isMetricByName(c.name)) || nums[0]
    const dim = strs[0]
    suggestions.push(isZh
      ? `按 ${dim.name} 分组显示 ${metric.name} 前 10`
      : `Show top 10 by ${metric.name} grouped by ${dim.name}`)
  }
  if (nums.length > 0) {
    const metric = nums.find((c) => isMetricByName(c.name)) || nums[0]
    suggestions.push(isZh ? `${metric.name} 的平均值是多少？` : `What is the average ${metric.name}?`)
  }
  if (strs.length > 0) {
    suggestions.push(isZh ? `列出所有不同的 ${strs[0].name}` : `List distinct ${strs[0].name}`)
  }
  if (dates.length > 0) {
    suggestions.push(isZh ? `按 ${dates[0].name} 显示趋势` : `Show trend over ${dates[0].name}`)
  }
  if (schema.length > 0) {
    suggestions.push(isZh ? "生成此表的数据画像" : "Generate a data profile for this table")
  }
  return suggestions.slice(0, 5)
}

export function suggestFollowUp(
  userQuestion: string,
  agentSql: string | undefined,
  columns: string[] | undefined,
  lang: string,
): string[] {
  const isZh = lang === "zh"
  const suggestions: string[] = []
  const cols = columns || []

  const groupCols = parseGroupByColumns(agentSql || "")

  const metricCols = cols.filter((c) => isMetricColumn(c))
  const dimCols = cols.filter((c) => !isMetricColumn(c))

  const hasOrderBy = /\bORDER\s+BY\b/i.test(agentSql || "")
  const hasLimit = /\bLIMIT\b/i.test(agentSql || "")
  const hasDesc = /\bDESC\b/i.test(agentSql || "")

  const timePattern = /\b(date|time|month|year|week|day|quarter|日期|时间|月|年|周|日|季度)\b/i
  const hasTime = timePattern.test(userQuestion) || dimCols.some((c) => timePattern.test(c))

  // Sort suggestions
  if (groupCols.length > 0 && metricCols.length > 0 && !hasOrderBy) {
    const m = metricCols[0]
    suggestions.push(isZh ? `按 ${m} 从高到低排序` : `Sort by ${m} descending`)
  }
  if (hasOrderBy && hasDesc && hasLimit) {
    const dim = groupCols[0] || dimCols[0] || ""
    suggestions.push(isZh ? `看看 ${dim} 最小的几个` : `Show the lowest ${dim}`)
  }
  if (hasOrderBy && !hasDesc && hasLimit) {
    const dim = groupCols[0] || dimCols[0] || ""
    suggestions.push(isZh ? `看看 ${dim} 最大的几个` : `Show the highest ${dim}`)
  }

  // Drill down by another dimension
  if (dimCols.length >= 2) {
    const nextDim = dimCols.find((c) => !groupCols.includes(c)) || dimCols[1]
    suggestions.push(isZh ? `再按 ${nextDim} 细分分析` : `Break down by ${nextDim}`)
  }

  // Percentage
  if (groupCols.length > 0 && metricCols.length > 0 && !/\b(pct|percent|占比|百分)\b/i.test(agentSql || "")) {
    suggestions.push(isZh ? `各 ${groupCols[0]} 的百分比占比` : `Percentage by ${groupCols[0]}`)
  }

  // Time-based suggestions
  if (hasTime && metricCols.length > 0) {
    const m = metricCols[0]
    suggestions.push(isZh ? `按月看 ${m} 趋势` : `Show ${m} trend by month`)
  }

  // Limit suggestion
  if (hasLimit) {
    suggestions.push(isZh ? "去掉行数限制看全部" : "Remove LIMIT to see all")
  }

  // Fallback
  if (suggestions.length === 0 && cols.length > 0) {
    if (metricCols.length > 0) {
      const m = metricCols[0]
      const d = dimCols[0] || groupCols[0] || ""
      suggestions.push(isZh ? `${m} 最高的是哪个 ${d}？` : `Which ${d} has the highest ${m}?`)
    }
    suggestions.push(isZh ? "换个角度分析这组数据" : "Analyze this data from another angle")
  }

  return suggestions.slice(0, 3)
}
