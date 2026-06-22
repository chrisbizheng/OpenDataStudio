import type { PivotIndicator, CalculatedIndicator, IndicatorFormat } from "./pivot-sql"
import type { ExpressionNode } from "./calculated-indicator-expression"

export interface CalcRecommendation {
  key: string
  title: string
  logic: ExpressionNode
  format: IndicatorFormat
  decimals: number
}

const REVENUE_KEYWORDS = ["sales", "revenue", "收入", "营收", "amount", "金额", "quantity", "数量"]
const COST_KEYWORDS = ["cost", "expense", "成本", "费用", "spend", "支出"]
const PROFIT_KEYWORDS = ["gross_profit", "gross_margin", "毛利", "grossProfit"]
const VOLUME_KEYWORDS = ["sales", "revenue", "amount", "金额", "quantity", "数量", "收入", "营收", "cost", "expense", "成本", "费用"]

function matches(field: string, keywords: string[]): boolean {
  const lower = field.toLowerCase()
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()))
}

export function getLocalRecommendations(
  indicators: PivotIndicator[],
  existingCalculated: CalculatedIndicator[]
): CalcRecommendation[] {
  const existingKeys = new Set(existingCalculated.map((calc) => calc.key))
  const results: CalcRecommendation[] = []

  const revenue = indicators.find((indicator) => matches(indicator.field, REVENUE_KEYWORDS))
  const cost = indicators.find((indicator) => matches(indicator.field, COST_KEYWORDS))
  const grossProfit = indicators.find((indicator) => matches(indicator.field, PROFIT_KEYWORDS))

  if (revenue && cost && !existingKeys.has("profit")) {
    results.push({
      key: "profit",
      title: "利润",
      logic: { type: "call", func: "minus", args: [
        { type: "ref", key: revenue.key },
        { type: "ref", key: cost.key },
      ]},
      format: "number",
      decimals: 2,
    })
  }

  if (revenue && cost && !existingKeys.has("profit_rate")) {
    results.push({
      key: "profit_rate",
      title: "利润率",
      logic: { type: "call", func: "divide", args: [
        { type: "call", func: "minus", args: [
          { type: "ref", key: revenue.key },
          { type: "ref", key: cost.key },
        ]},
        { type: "ref", key: revenue.key },
      ]},
      format: "percent",
      decimals: 2,
    })
  }

  if (grossProfit && revenue && !existingKeys.has("gross_margin")) {
    results.push({
      key: "gross_margin",
      title: "毛利率",
      logic: { type: "call", func: "divide", args: [
        { type: "ref", key: grossProfit.key },
        { type: "ref", key: revenue.key },
      ]},
      format: "percent",
      decimals: 2,
    })
  }

  for (const indicator of indicators) {
    if (!matches(indicator.field, VOLUME_KEYWORDS)) continue
    const ratioKey = `${indicator.field}_ratio`
    if (existingKeys.has(ratioKey)) continue
    const already = results.some((r) => r.key === ratioKey)
    if (already) continue
    results.push({
      key: ratioKey,
      title: `${indicator.field}占比`,
      logic: { type: "call", func: "divide", args: [
        { type: "ref", key: indicator.key },
        { type: "agg", func: "SUM", field: indicator.field },
      ]},
      format: "percent",
      decimals: 2,
    })
  }

  return results
}
