import type { PivotIndicator, CalculatedIndicator, SortRule } from "@/lib/pivot-sql"
import { migrateExpressionToAST } from "@/lib/expression"

const AGG_SUFFIXES: Record<string, string> = {
  _distinct_count: "DISTINCT_COUNT",
  _sum: "SUM",
  _avg: "AVG",
  _count: "COUNT",
  _min: "MIN",
  _max: "MAX",
}

export function migrateIndicatorKey(oldKey: string): string | null {
  for (const [suffix, agg] of Object.entries(AGG_SUFFIXES)) {
    if (oldKey.endsWith(suffix)) {
      const field = oldKey.slice(0, -suffix.length)
      if (field) return `${field}-${agg}`
    }
  }
  return null
}

export function migratePivotPersisted(persisted: unknown, current: unknown): unknown {
  const p = persisted as Record<string, unknown>

  if (p.indicators) {
    const keyMap: Record<string, string> = {}
    p.indicators = (p.indicators as PivotIndicator[]).map((ind) => {
      const newKey = migrateIndicatorKey(ind.key)
      if (newKey) {
        keyMap[ind.key] = newKey
        return { ...ind, key: newKey, title: ind.title === ind.key ? newKey : ind.title }
      }
      return ind
    })

    if (Object.keys(keyMap).length > 0 && p.calculatedIndicators) {
      function replaceRefKeys(node: unknown): unknown {
        if (!node || typeof node !== "object") return node
        if (Array.isArray(node)) return node.map(replaceRefKeys)
        const obj = node as Record<string, unknown>
        if (obj.type === "ref" && typeof obj.key === "string" && keyMap[obj.key]) {
          return { ...obj, key: keyMap[obj.key] }
        }
        const result: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(obj)) {
          result[k] = replaceRefKeys(v)
        }
        return result
      }

      p.calculatedIndicators = (p.calculatedIndicators as CalculatedIndicator[]).map((ci) => ({
        ...ci,
        logic: replaceRefKeys(ci.logic) as CalculatedIndicator["logic"],
      }))
    }

    if (Object.keys(keyMap).length > 0 && p.sort) {
      const s = p.sort as SortRule
      if (keyMap[s.field]) {
        p.sort = { ...s, field: keyMap[s.field] }
      }
    }
  }

  if (p.calculatedIndicators) {
    p.calculatedIndicators = (p.calculatedIndicators as unknown as Record<string, unknown>[]).map((ci) => {
      if ("expression" in ci && typeof ci.expression === "string" && !("logic" in ci)) {
        const indicatorKeyMap: Record<string, string> = {}
        if (p.indicators) {
          for (const ind of p.indicators as PivotIndicator[]) {
            indicatorKeyMap[ind.key] = `SUM(\`${ind.field}\`)`
          }
        }
        const { node: logic } = migrateExpressionToAST(ci.expression as string, indicatorKeyMap)
        const { expression: _expr, dependIndicatorKeys: _deps, ...rest } = ci
        return { ...rest, logic }
      }
      return ci
    })
  }

  return { ...current as object, ...p }
}
