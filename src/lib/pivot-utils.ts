/**
 * In-memory pivot reshape helpers.
 *
 * Moved out of chart-helpers.ts — pivot reshaping is a data-layer concern,
 * not a chart-renderer concern. Kept behavior-identical to the original
 * implementation.
 */

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
