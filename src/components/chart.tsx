"use client"

import { useMemo } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar,
  Treemap,
  ComposedChart,
  ReferenceLine, ReferenceDot,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"

interface ChartConfig {
  type: string
  xKey: string
  yKey: string
  title?: string
  showLegend?: boolean
}

interface ChartProps {
  data: Record<string, unknown>[]
  config: ChartConfig
  onClick?: (item: { key: string; value: number; row: Record<string, unknown> }) => void
}

const COLORS = [
  "#6366F1", "#EC4899", "#F59E0B", "#10B981", "#EF4444",
  "#8B5CF6", "#06B6D4", "#F97316", "#14B8A6", "#E11D48",
  "#3B82F6", "#84CC16", "#D946EF", "#0EA5E9", "#22C55E",
]

const CHART_ANIM = { isAnimationActive: false }
const ELEMENT_ANIM = { isAnimationActive: false }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      <div className="font-semibold text-foreground border-b border-border pb-1 mb-1">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-mono text-foreground font-medium">
            {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Chart({ data, config, onClick }: ChartProps) {
  const resolved = useMemo(() => {
    const rawData = (data || []).map((row) => ({
      ...row,
      [config.yKey]: Number(row[config.yKey]) || 0,
    }))
    if (rawData.length === 0) return { chartData: rawData, resolvedType: "bar" as const, resolvedXKey: config.xKey }

    const typeMap: Record<string, string> = {
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
    const resolvedType = typeMap[(config.type || "bar").toLowerCase().replace(/[_\s-]/g, "")] || "bar"
    let resolvedXKey = config.xKey
    let resolvedData = rawData
    let barGroups: string[] | undefined

    if (
      rawData[0] &&
      typeof rawData[0] === "object"
    ) {
      const dimCols = Object.keys(rawData[0]).filter((k) => k !== config.yKey)
      if (dimCols.length >= 2) {
        // Analyze dimension relationship: find the best xKey (fewer unique values = group axis)
        // and secondaryDim (more unique values = bars within each group)
        const dimStats = dimCols.map((k) => {
          const unique = new Set(rawData.map((d) => String(d[k] ?? "")))
          return { col: k, uniqueCount: unique.size }
        })
        dimStats.sort((a, b) => a.uniqueCount - b.uniqueCount)

        // Best xKey = column with fewer unique values (the "one" side)
        // Best secondaryDim = column with more unique values (the "many" side)
        const bestXKey = dimStats[0].col
        const bestSecondary = dimStats[1].col

        // Check if this creates a valid 1:N relationship
        const groups = new Map<string, Set<string>>()
        for (const row of rawData) {
          const xk = String(row[bestXKey] ?? "")
          if (!groups.has(xk)) groups.set(xk, new Set())
          groups.get(xk)!.add(String(row[bestSecondary] ?? ""))
        }
        const hasGrouping = Array.from(groups.values()).some((s) => s.size > 1)

        if (hasGrouping) {
          resolvedXKey = bestXKey
          const secondaryValues = [...new Set(rawData.map((d) => String(d[bestSecondary] ?? "")))]
          const pivoted = new Map<string, Record<string, unknown>>()
          for (const row of rawData) {
            const xk = String(row[bestXKey] ?? "")
            if (!pivoted.has(xk)) {
              pivoted.set(xk, { [bestXKey]: xk })
            }
            const sv = String(row[bestSecondary] ?? "")
            const yv = Number(row[config.yKey]) || 0
            pivoted.get(xk)![sv] = yv
          }
          resolvedData = Array.from(pivoted.values())
          barGroups = secondaryValues
        }
      }
    }

    return { chartData: resolvedData, resolvedType, resolvedXKey, barGroups }
  }, [data, config.type, config.xKey, config.yKey])

  const chartData = resolved.chartData
  const resolvedXKey = resolved.resolvedXKey
  const resolvedType = resolved.resolvedType
  const barGroups = resolved.barGroups

  const avg = useMemo(() => {
    const vals = chartData.map((d) => Number(d[config.yKey])).filter((v) => !isNaN(v))
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }, [chartData, config.yKey])

  const maxPoint = useMemo(() => {
    let max = -Infinity
    let item: Record<string, unknown> | null = null
    for (const d of chartData) {
      const v = Number(d[config.yKey])
      if (v > max) { max = v; item = d }
    }
    return item
  }, [chartData, config.yKey])

  if (!data || data.length === 0) return null

  const handleChartClick = (d: unknown) => {
    if (!onClick) return
    const data = d as Record<string, unknown>
    let payload: Record<string, unknown> | undefined
    let barDataKey: string | undefined

    if (data?.payload) {
      payload = data.payload as Record<string, unknown>
      barDataKey = data.dataKey as string | undefined
    } else if ((data as { activePayload?: { payload: Record<string, unknown>; dataKey?: string }[] })?.activePayload?.length) {
      const first = (data as { activePayload: { payload: Record<string, unknown>; dataKey?: string }[] }).activePayload[0]
      payload = first.payload
      barDataKey = first.dataKey
    }
    if (!payload) return
    const key = String(payload[resolvedXKey] ?? "")
    const yValue = barDataKey ? payload[barDataKey] : payload[config.yKey]
    const value = Number(yValue) || 0
    onClick({ key, value, row: payload })
  }

  const renderDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props
    if (cx === undefined || cy === undefined) return null
    return (
      <circle
        key={index}
        cx={cx}
        cy={cy}
        r={5}
        fill="#6366F1"
        cursor="pointer"
        onClick={() => {
          const payload = chartData[index!]
          if (payload) {
            const key = String(payload[resolvedXKey] ?? "")
            const value = Number(payload[config.yKey]) || 0
            onClick?.({ key, value, row: payload })
          }
        }}
      />
    )
  }

  const sharedClick = { onClick: handleChartClick }
  const chartAnim = CHART_ANIM
  const elementAnim = ELEMENT_ANIM
  const legend = config.showLegend !== false ? (
    <Legend
      iconType="circle"
      iconSize={8}
      wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
      verticalAlign="bottom"
    />
  ) : null

  const avgLine = avg > 0 ? (
    <ReferenceLine
      y={avg}
      stroke="#EC4899"
      strokeDasharray="6 4"
      strokeWidth={1.5}
      label={{
        value: `avg: ${avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        position: "insideTopRight",
        fontSize: 9,
        fill: "#EC4899",
      }}
    />
  ) : null

  const maxDot = maxPoint ? (
    <ReferenceDot
      x={maxPoint[resolvedXKey] as string | number}
      y={maxPoint[config.yKey] as number}
      r={6}
      fill="#F59E0B"
      stroke="#fff"
      strokeWidth={2}
    />
  ) : null

  const renderChart = () => {
    switch (resolvedType) {
      case "bar":
        if (barGroups && barGroups.length > 0) {
          return (
            <BarChart data={chartData} {...chartAnim}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey={resolvedXKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <Tooltip content={<CustomTooltip />} />
              {legend}
              {barGroups.map((group, i) => (
                <Bar key={group} dataKey={group} radius={[2, 2, 0, 0]} fill={COLORS[i % COLORS.length]} {...elementAnim} {...sharedClick} />
              ))}
            </BarChart>
          )
        }
        return (
          <BarChart data={chartData} {...chartAnim}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={resolvedXKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            {legend}
            {avgLine}
            {maxDot}
            <Bar dataKey={config.yKey} radius={[2, 2, 0, 0]} {...elementAnim} {...sharedClick}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        )

      case "line":
        return (
          <LineChart data={chartData} {...chartAnim}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={resolvedXKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            {legend}
            {avgLine}
            {maxDot}
            <Line
              type="monotone"
              dataKey={config.yKey}
              stroke="#6366F1"
              strokeWidth={2}
              dot={renderDot}
              activeDot={renderDot}
              {...elementAnim}
              onClick={handleChartClick}
            />
          </LineChart>
        )

      case "area":
        return (
          <AreaChart data={chartData} {...chartAnim}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={resolvedXKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            {legend}
            {avgLine}
            {maxDot}
            <Area
              type="monotone"
              dataKey={config.yKey}
              stroke="#6366F1"
              fill="#6366F1"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={renderDot}
              activeDot={renderDot}
              {...elementAnim}
              onClick={handleChartClick}
            />
          </AreaChart>
        )

      case "pie":
        const renderPieLabel = ({ name, percent }: { name?: string; percent?: number }) =>
          `${name ?? ""} ${((percent ?? 0) * 100).toFixed(1)}%`

        return (
          <PieChart {...chartAnim}>
            <Pie
              data={chartData}
              dataKey={config.yKey}
              nameKey={resolvedXKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={renderPieLabel}
              {...elementAnim}
              {...sharedClick}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {legend}
          </PieChart>
        )

      case "scatter":
        return (
          <ScatterChart {...chartAnim}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={resolvedXKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            {legend}
            {avgLine}
            <Scatter data={chartData} fill="#6366F1" {...elementAnim} {...sharedClick} />
          </ScatterChart>
        )

      case "radar":
        return (
          <RadarChart data={chartData} {...chartAnim}>
            <PolarGrid className="stroke-border" />
            <PolarAngleAxis dataKey={resolvedXKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <PolarRadiusAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            {legend}
            <Radar name={config.yKey} dataKey={config.yKey} stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} {...elementAnim} {...sharedClick} />
          </RadarChart>
        )

      case "radialBar":
        return (
          <RadialBarChart data={chartData} innerRadius="20%" outerRadius="90%" startAngle={180} endAngle={0} {...chartAnim}>
            <RadialBar dataKey={config.yKey} cornerRadius={4} label={{ fontSize: 10 }} {...elementAnim} {...sharedClick}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </RadialBar>
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          </RadialBarChart>
        )

      case "treemap":
        return (
          <Treemap
            data={chartData}
            dataKey={config.yKey}
            nameKey={resolvedXKey}
            aspectRatio={4 / 3}
            stroke="hsl(var(--border))"
            isAnimationActive={false}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} onClick={() => handleChartClick({ payload: chartData[i] })} />
            ))}
          </Treemap>
        )

      case "composed":
        return (
          <ComposedChart data={chartData} {...chartAnim}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={resolvedXKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey={config.yKey} barSize={20} radius={[2, 2, 0, 0]} fill="#6366F1" {...elementAnim} {...sharedClick} />
            <Line type="monotone" dataKey={config.yKey} stroke="#EC4899" strokeWidth={2} {...elementAnim} />
          </ComposedChart>
        )

      default:
        return (
          <BarChart data={chartData}>
            <Bar dataKey={config.yKey} fill="hsl(var(--primary))" />
          </BarChart>
        )
    }
  }

  return (
    <div className="w-full rounded border border-border p-3">
      {config.title && (
        <h4 className="text-xs font-medium text-foreground mb-2">{config.title}</h4>
      )}
      <ResponsiveContainer width="100%" height={280}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}
