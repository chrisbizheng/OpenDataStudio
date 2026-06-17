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
