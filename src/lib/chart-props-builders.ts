import type { EChartsOption } from "echarts"

export function formatNum(v: unknown): string {
  const n = Number(v)
  if (isNaN(n)) return String(v ?? "")
  return n.toLocaleString()
}

export function buildTooltip(isDark: boolean): EChartsOption["tooltip"] {
  return {
    trigger: "axis",
    backgroundColor: isDark ? "#1e1e2e" : "#ffffff",
    borderColor: isDark ? "#333" : "#e5e7eb",
    textStyle: { color: isDark ? "#e0e0e0" : "#333", fontSize: 11 },
    confine: true,
    formatter(params: unknown) {
      const p = params as { name: string; value: number | number[]; seriesName: string; color: string; marker: string }[]
      if (!Array.isArray(p) || p.length === 0) return ""
      const name = p[0].name
      const total = p.reduce((s, item) => s + (Array.isArray(item.value) ? item.value[item.value.length - 1] : Number(item.value) || 0), 0)
      const lines = p.map((item) => {
        const val = Array.isArray(item.value) ? item.value[item.value.length - 1] : Number(item.value) || 0
        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0"
        return `${item.marker} ${item.seriesName}: <b>${formatNum(val)}</b> <span style="color:#999;font-size:10px">(${pct}%)</span>`
      })
      return `<div style="font-size:12px"><div style="font-weight:600;margin-bottom:4px;border-bottom:1px solid ${isDark ? "#444" : "#eee"};padding-bottom:4px">${name}</div>${lines.join("<br/>")}</div>`
    },
  }
}

export function buildToolbox(resolvedType: string, hasMultipleSeries: boolean): EChartsOption["toolbox"] {
  const magicTypes: string[] = []
  // magicType 只允许 line↔bar↔stack 切换。
  // pie 移除：data 格式 {name,value}[] 与 number[] 不兼容，切换后 ECharts
  // dimension 系统重建失败，coord.getBaseAxis() 返回 undefined →
  // BarView/LineView 访问 baseAxis.dim 抛 "reading 'dim'"。
  if (["bar", "area"].includes(resolvedType)) magicTypes.push("line")
  if (["line", "area"].includes(resolvedType)) magicTypes.push("bar")
  if (hasMultipleSeries && ["bar", "line", "area", "composed"].includes(resolvedType)) magicTypes.push("stack")
  const hasMagicType = magicTypes.length > 0

  return {
    right: 10,
    top: 0,
    feature: {
      saveAsImage: { title: "Save", pixelRatio: 2 },
      dataView: { title: "Data", readOnly: true, lang: ["Data View", "Close", "Refresh"] },
      restore: { title: "Restore" },
      ...(hasMagicType ? {
        magicType: {
          title: Object.fromEntries(magicTypes.map((t) => [t, t.charAt(0).toUpperCase() + t.slice(1)])),
          type: magicTypes as ("line" | "bar" | "stack")[],
        }
      } : {}),
    },
    iconStyle: { borderColor: "#999" },
    emphasis: { iconStyle: { borderColor: "#6366F1" } },
  }
}

export function buildDataZoom(): EChartsOption["dataZoom"] {
  return [
    { type: "inside", start: 0, end: 100 },
    { type: "slider", start: 0, end: 100, height: 18, bottom: 2, left: 50, right: 20 },
  ]
}

export function buildBrush(xKey: string, data: Record<string, unknown>[], onBrushSelect?: (items: Record<string, unknown>[]) => void): EChartsOption["brush"] {
  if (!onBrushSelect) return undefined
  return {
    toolbox: ["rect", "clear"],
    xAxisIndex: 0,
    brushStyle: { borderWidth: 1, color: "rgba(99,102,241,0.15)", borderColor: "rgba(99,102,241,0.6)" },
    outOfBrush: { colorAlpha: 0.3 },
    throttleType: "debounce",
    throttleDelay: 300,
  }
}
