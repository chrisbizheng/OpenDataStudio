/**
 * Widget factory — extracts ChartWidget data from an agent-chat Message.
 *
 * Guards against messages without a valid chart configuration (matching the
 * same condition as agent-chat.tsx:540), and persists query results to
 * IndexedDB via widgetCache so the chart can render offline.
 */
import type { AssistantMessage } from "@/lib/agent-types"
import type { ChartWidget } from "@/stores/dashboards"
import { widgetCache } from "@/lib/widget-cache"

/**
 * Create a ChartWidget from an agent-chat Message, or null if the message
 * does not carry a complete chart configuration.
 *
 * When the message has query results (`rows` + `columns`), they are written
 * to IndexedDB under the widget ID for later retrieval.
 */
export async function createWidgetFromMessage(
  msg: AssistantMessage,
  index: number,
): Promise<ChartWidget | null> {
  const viz = msg.visualization
  if (!viz?.config?.xKey) return null
  if (!viz.config.yKey && (!viz.config.series || viz.config.series.length === 0)) {
    return null
  }

  const widgetId = crypto.randomUUID()
  const { xKey, yKey, series, title, showLegend, height } = viz.config

  const vizConfig = {
    type: viz.type || "bar",
    xKey,
    ...(yKey ? { yKey } : {}),
    ...(series && series.length > 0 ? { series } : {}),
    ...(title ? { title } : {}),
    ...(showLegend !== undefined ? { showLegend } : {}),
    ...(height !== undefined ? { height } : {}),
  }

  if (msg.rows && msg.columns) {
    await widgetCache.set(widgetId, {
      columns: msg.columns,
      rows: msg.rows,
      fetchedAt: Date.now(),
    })
  }

  return {
    id: widgetId,
    type: "chart",
    sql: msg.sql || "",
    vizConfig,
    source: "agent-chat",
    messageId: `msg-${index}`,
    lastRunAt: msg.rows ? Date.now() : null,
  }
}
