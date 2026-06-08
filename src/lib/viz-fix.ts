type RawViz = { type?: string; config?: { xKey?: string; yKey?: string; title?: string; showLegend?: boolean } } | null | undefined

export function fixVisualization(
  rawViz: RawViz,
  columns: string[]
): RawViz {
  if (!rawViz || !rawViz.config) return rawViz
  if (!columns || columns.length === 0) return rawViz

  const cfg = rawViz.config
  const xOk = cfg.xKey && columns.includes(cfg.xKey)
  const yOk = cfg.yKey && columns.includes(cfg.yKey)
  if (xOk && yOk) return rawViz

  const numericCol = columns.find((c) =>
    c === cfg.yKey || /^(sum|total|avg|min|max|count|amount|qty|quantity|sales|revenue|sold|units)/i.test(c)
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

  const metricPattern = /^(sum|total|avg|min|max|count|amount|qty|quantity|sales|revenue|sold|units)/i
  const metricCol = columns.find((c) => metricPattern.test(c))
  if (!metricCol) return null

  const dimCol = groupCols[0]

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
