import type { ColumnMeta } from "./clickhouse"
import { NUM_KEYWORDS, isIndicatorType, isDimensionType } from "./column-utils"

export function suggestQuestions(schema: ColumnMeta[], lang: string): string[] {
  const suggestions: string[] = []
  const nums = schema.filter((c) => isIndicatorType(c.type))
  const strs = schema.filter((c) => isDimensionType(c.type) && /^(String|FixedString|LowCardinality)/.test(c.type.replace(/^Nullable\((.+)\)$/, "$1")))
  const dates = schema.filter((c) => /^(Date|DateTime)/.test(c.type.replace(/^Nullable\((.+)\)$/, "$1")))

  const isZh = lang === "zh"

  if (nums.length > 0 && strs.length > 0) {
    const metric = nums.find((c) => NUM_KEYWORDS.some((k) => c.name.toLowerCase().includes(k))) || nums[0]
    const dim = strs[0]
    suggestions.push(isZh
      ? `按 ${dim.name} 分组显示 ${metric.name} 前 10`
      : `Show top 10 by ${metric.name} grouped by ${dim.name}`)
  }
  if (nums.length > 0) {
    const metric = nums.find((c) => NUM_KEYWORDS.some((k) => c.name.toLowerCase().includes(k))) || nums[0]
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
