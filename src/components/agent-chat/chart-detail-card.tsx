"use client"

import { useLang } from "@/components/lang-provider"
import type { AssistantMessage } from "@/lib/agent-types"
import type { DeepDiveItem } from "@/lib/deep-dive-directions"
import { useChartDetailStore } from "@/stores/chart-detail"
import { suggestDeepDiveDirections } from "@/lib/deep-dive-directions"
import { getChartNodeContext } from "./chart-node-context"

export function ChartDetailCard({ msg, index, schema, onGenerateAiDirections, onSendMessage }: {
  msg: AssistantMessage
  index: number
  schema?: { name: string; type: string; comment?: string }[]
  onGenerateAiDirections: (msg: AssistantMessage, item: DeepDiveItem, localDirections: { label: string; prompt: string }[]) => Promise<void>
  onSendMessage: (text: string) => void
}) {
  const { _t, lang } = useLang()
  const {
    clickedChart, deepDiveOpen, aiDirections, isGeneratingDirections,
    setClickedChart, setDeepDiveOpen, setAiDirections,
  } = useChartDetailStore()
  if (!clickedChart || clickedChart.messageIndex !== index) return null
  if (!msg.visualization || !msg.columns || !msg.rows) return null

  const nodeContext = getChartNodeContext({ item: clickedChart.item, visualization: msg.visualization, lang })

  return (
    <div className="border border-border rounded p-2 space-y-2 animate-fade-slide-in">
      <div className="space-y-1 text-xs">
        <div className="flex items-start gap-2">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-semibold text-foreground min-w-0">
            {nodeContext.dimensions.map(([field, value], di, arr) => (
              <span key={`${field}-${di}`} className="inline-flex items-center gap-1">
                <span>{field}</span>
                <span className="text-muted-foreground">=</span>
                <span>{String(value ?? "∅")}</span>
                {di < arr.length - 1 && <span className="text-muted-foreground">·</span>}
              </span>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setDeepDiveOpen((open) => !open)}
            className="text-[10px] text-primary hover:underline shrink-0"
          >
            {_t("agent.deep_dive")}
          </button>
        </div>
        <div className="font-mono text-foreground">
          {nodeContext.metricLabel} = {nodeContext.metricValue}
        </div>
      </div>
      {deepDiveOpen && (() => {
        const localDirections = suggestDeepDiveDirections({
          item: clickedChart.item,
          visualizationConfig: {
            type: msg.visualization.type || "bar",
            xKey: msg.visualization.config.xKey,
            yKey: msg.visualization.config.yKey,
            series: msg.visualization.config.series,
          },
          columns: msg.columns,
          rowCount: msg.rows.length,
          schema: schema ?? [],
          lang,
        })
        const directions = aiDirections ?? localDirections
        if (directions.length === 0) return null
        return (
          <div className="space-y-1 animate-fade-slide-in">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">
                {aiDirections ? _t("agent.ai_suggested_directions") : _t("agent.suggested_directions")}
              </span>
              <button
                onClick={() => onGenerateAiDirections(msg, clickedChart.item, localDirections)}
                disabled={isGeneratingDirections}
                className="text-[10px] text-primary hover:underline disabled:opacity-50"
              >
                {isGeneratingDirections ? _t("agent.generating") : _t("agent.ai_suggest")}
              </button>
            </div>
            {directions.map((direction, di) => (
              <button
                key={di}
                onClick={() => {
                  setDeepDiveOpen(false)
                  setAiDirections(null)
                  setClickedChart(null)
                  onSendMessage(direction.prompt)
                }}
                className="flex items-center gap-1.5 w-full text-left text-[10px] px-2 py-1.5 rounded bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-primary shrink-0">›</span>
                <span className="truncate">{direction.label}</span>
              </button>
            ))}
          </div>
        )
      })()}
      <div className="overflow-x-auto border border-border rounded">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {msg.columns.map((col) => (
                <th key={col} className="px-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {msg.rows
              .filter((row) => {
                const xKey = msg.visualization!.config.xKey
                const idx = msg.columns!.indexOf(xKey)
                if (idx >= 0 && String(row[idx]) === clickedChart.item.key) return true
                const yKeys = msg.visualization!.config.series?.map((s) => s.yKey) ?? (msg.visualization!.config.yKey ? [msg.visualization!.config.yKey] : [])
                const dimCols = msg.columns!.filter((c) => !yKeys.includes(c))
                const reconstructed = dimCols.slice(0, 3).map((c) => String(row[msg.columns!.indexOf(c)] ?? "")).join(" · ")
                return reconstructed === clickedChart.item.key
              })
              .slice(0, 5)
              .map((row, ri) => (
                <tr key={ri} className="border-t border-border">
                  {row.map((cell: unknown, ci: number) => (
                    <td key={ci} className="px-2 py-1 truncate max-w-[120px]">
                      {String(cell ?? "∅")}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
