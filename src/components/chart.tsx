"use client"

import { useMemo } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"

interface ChartProps {
  data: Record<string, unknown>[]
  config: {
    type: string
    xKey: string
    yKey: string
    title?: string
  }
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"]

export function Chart({ data, config }: ChartProps) {
  if (!data || data.length === 0) return null

  const chartData = useMemo(() => data.map((row) => ({
    ...row,
    [config.yKey]: Number(row[config.yKey]) || 0,
  })), [data, config.yKey])

  const renderChart = () => {
    switch (config.type) {
      case "bar":
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={config.xKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 6,
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Bar dataKey={config.yKey} fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
          </BarChart>
        )

      case "line":
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={config.xKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 6,
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Line type="monotone" dataKey={config.yKey} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        )

      case "pie":
        return (
          <PieChart>
            <Pie
              data={chartData}
              dataKey={config.yKey}
              nameKey={config.xKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 6,
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
              }}
            />
          </PieChart>
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
      <ResponsiveContainer width="100%" height={250}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}