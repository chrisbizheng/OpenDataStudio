import { isMetricColumn } from "./column-utils"
import type { RawViz } from "./agent-types"

export function fixVisualization(
  rawViz: RawViz,
  columns: string[]
): RawViz {
  if (!rawViz || !rawViz.config) return rawViz
  if (!columns || columns.length === 0) return rawViz

  const cfg = rawViz.config

  // Validate series if present
  if (cfg.series && cfg.series.length > 0) {
    const validSeries = cfg.series.filter((s) => columns.includes(s.yKey))
    if (validSeries.length === 0) {
      // All series invalid — fall back to auto-detect
      const numericCol = columns.find((c) => isMetricColumn(c)) || columns[columns.length - 1]
      const labelCol = columns.find((c) => c !== numericCol) || columns[0]
      return {
        ...rawViz,
        config: {
          xKey: cfg.xKey && columns.includes(cfg.xKey) ? cfg.xKey : labelCol,
          yKey: numericCol,
          title: cfg.title,
          showLegend: cfg.showLegend,
        },
      }
    }
    const xOk = cfg.xKey && columns.includes(cfg.xKey)
    return {
      ...rawViz,
      config: {
        ...cfg,
        xKey: xOk ? cfg.xKey : columns.find((c) => !validSeries.some((s) => s.yKey === c)) || columns[0],
        series: validSeries,
      },
    }
  }

  // Single yKey validation (original logic)
  const xOk = cfg.xKey && columns.includes(cfg.xKey)
  const yOk = cfg.yKey && columns.includes(cfg.yKey)
  if (xOk && yOk) return rawViz

  const numericCol = columns.find((c) =>
    c === cfg.yKey || isMetricColumn(c)
  ) || columns[columns.length - 1]
  const labelCol = columns.find((c) => c !== numericCol) || columns[0]

  return {
    ...rawViz,
    config: {
      xKey: cfg.xKey || labelCol,
      yKey: cfg.yKey || numericCol,
      title: cfg.title,
      showLegend: cfg.showLegend,
    },
  }
}

export function inferVisualization(
  sql: string,
  columns: string[]
): RawViz {
  if (!columns || columns.length < 2) return null

  const groupMatch = sql.match(/\bGROUP\s+BY\b\s+([\s\S]+?)(?:\bORDER\b|\bLIMIT\b|\bHAVING\b|\bUNION\b|$)/i)
  if (!groupMatch) return null

  const groupCols = groupMatch[1]
    .split(",")
    .map((c) => c.trim().replace(/^`|`$/g, "").replace(/\s+AS\s+\S+$/i, "").trim())
    .filter(Boolean)

  if (groupCols.length === 0) return null

  const metricCols = columns.filter((c) => isMetricColumn(c))
  const dimCol = groupCols[0]

  // Multi-metric: generate series for composed chart
  if (metricCols.length >= 2) {
    return {
      type: "composed",
      config: {
        xKey: dimCol,
        series: metricCols.map((mc) => ({ yKey: mc })),
        title: undefined,
        showLegend: true,
      },
    }
  }

  const metricCol = metricCols[0] || columns[columns.length - 1]
  if (!metricCol) return null

  return {
    type: "bar",
    config: {
      xKey: dimCol,
      yKey: metricCol,
      title: undefined,
      showLegend: groupCols.length > 1,
    },
  }
}

export function fixConcatSql(sql: string): string | null {
  if (!/\bconcat\s*\(/i.test(sql)) return null
  const groupMatch = sql.match(/\bGROUP\s+BY\b\s+([\s\S]+?)(?:\bORDER\b|\bLIMIT\b|\bHAVING\b|\bUNION\b|$)/i)
  if (!groupMatch) return null
  const groupCols = groupMatch[1].split(",").map((c) => c.trim().replace(/^`|`$/g, "").replace(/\s+AS\s+\S+$/i, "").trim()).filter(Boolean)
  if (groupCols.length < 2) return null
  const selectMatch = sql.match(/\bSELECT\b\s+([\s\S]+?)\s+\bFROM\b/i)
  if (!selectMatch) return null
  const selectBody = selectMatch[1]
  const concatMatch = selectBody.match(/\bconcat\s*\([^)]+\)\s+AS\s+(\w+)/i)
  if (!concatMatch) return null
  const newSelect = selectBody.replace(concatMatch[0], groupCols.join(", "))
  return sql.replace(selectBody, newSelect)
}
