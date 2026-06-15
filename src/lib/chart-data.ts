export const COLORS = [
  "#6366F1", "#EC4899", "#F59E0B", "#10B981", "#EF4444",
  "#8B5CF6", "#06B6D4", "#F97316", "#14B8A6", "#E11D48",
  "#3B82F6", "#84CC16", "#D946EF", "#0EA5E9", "#22C55E",
]

export const COLOR_THEMES: Record<string, string[]> = {
  default: COLORS,
  warm: ["#F59E0B", "#EF4444", "#F97316", "#E11D48", "#FB923C", "#FBBF24", "#F87171", "#FCA5A5", "#FDE68A", "#FECACA"],
  cool: ["#6366F1", "#3B82F6", "#06B6D4", "#8B5CF6", "#0EA5E9", "#14B8A6", "#A78BFA", "#38BDF8", "#67E8F9", "#5EEAD4"],
  pastel: ["#C4B5FD", "#FBCFE8", "#FDE68A", "#A7F3D0", "#FCA5A5", "#DDD6FE", "#A5F3FC", "#FED7AA", "#99F6E4", "#FECDD3"],
  dark: ["#818CF8", "#F472B6", "#FBBF24", "#34D399", "#F87171", "#A78BFA", "#22D3EE", "#FB923C", "#2DD4BF", "#FB7185"],
}

const TYPE_MAP: Record<string, string> = {
  bar: "bar", barchart: "bar", column: "bar",
  line: "line", linechart: "line",
  area: "area", areachart: "area",
  pie: "pie", piechart: "pie", donut: "pie",
  scatter: "scatter", scatterplot: "scatter", bubble: "scatter",
  radar: "radar", radarchart: "radar",
  radialbar: "radialBar", radial: "radialBar",
  treemap: "treemap", tree: "treemap",
  composed: "composed", combo: "composed", mixed: "composed",
}

export function resolveType(type: string): string {
  return TYPE_MAP[(type || "bar").toLowerCase().replace(/[_\s-]/g, "")] || "bar"
}

export function formatNum(v: unknown): string {
  const n = Number(v)
  if (isNaN(n)) return String(v ?? "")
  return n.toLocaleString()
}

export function autoPivot(
  data: Record<string, unknown>[],
  yKey: string,
  xKey: string,
): { data: Record<string, unknown>[]; xKey: string; barGroups?: string[] } {
  if (!data[0] || typeof data[0] !== "object") return { data, xKey }
  const dimCols = Object.keys(data[0]).filter((k) => k !== yKey)
  if (dimCols.length < 2) return { data, xKey }

  const dimStats = dimCols.map((k) => {
    const unique = new Set(data.map((d) => String(d[k] ?? "")))
    return { col: k, uniqueCount: unique.size }
  })
  dimStats.sort((a, b) => a.uniqueCount - b.uniqueCount)

  const bestXKey = dimStats[0].col
  const bestSecondary = dimStats[1].col

  const groups = new Map<string, Set<string>>()
  for (const row of data) {
    const xk = String(row[bestXKey] ?? "")
    if (!groups.has(xk)) groups.set(xk, new Set())
    groups.get(xk)!.add(String(row[bestSecondary] ?? ""))
  }
  const hasGrouping = Array.from(groups.values()).some((s) => s.size > 1)
  if (!hasGrouping) return { data, xKey }

  const secondaryValues = [...new Set(data.map((d) => String(d[bestSecondary] ?? "")))]
  const pivoted = new Map<string, Record<string, unknown>>()
  for (const row of data) {
    const xk = String(row[bestXKey] ?? "")
    if (!pivoted.has(xk)) pivoted.set(xk, { [bestXKey]: xk })
    const sv = String(row[bestSecondary] ?? "")
    pivoted.get(xk)![sv] = Number(row[yKey]) || 0
  }
  return { data: Array.from(pivoted.values()), xKey: bestXKey, barGroups: secondaryValues }
}

export function computeStats(data: Record<string, unknown>[], yKey: string) {
  const vals = data.map((d) => Number(d[yKey])).filter((v) => !isNaN(v))
  let max = -Infinity
  let maxItem: Record<string, unknown> | null = null
  for (const d of data) {
    const v = Number(d[yKey])
    if (v > max) { max = v; maxItem = d }
  }
  return { max, maxItem }
}

export function isSequentialData(data: Record<string, unknown>[], xKey: string): boolean {
  if (data.length <= 15) return false
  const values = data.map((d) => d[xKey])
  const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}|^\d{1,2}[-/]\d{1,2}[-/]\d{4}|^\d{4}Q\d|^\d{6}$/
  if (values.some((v) => datePattern.test(String(v)))) return true
  if (values.every((v) => !isNaN(Number(v)))) return true
  const monthPattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i
  if (values.some((v) => monthPattern.test(String(v)))) return true
  return false
}
