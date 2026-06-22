/**
 * Widget creation lifecycle — single deep module unifying the three widget
 * creation / refresh paths (SQL dialog, agent-chat dialog, chart refresh).
 *
 * Replaces the scattered cache-write-then-store-add pattern that was
 * duplicated across:
 *   - create-widget-sql-dialog.tsx (handleAddWidget)
 *   - agent-chat/dashboard-selector-dialog.tsx (addToDashboard, via widget-factory)
 *   - chart-widget-renderer.tsx (handleRefresh)
 *
 * `widget-factory.ts` is absorbed into the `agent-chat` branch here and
 * deleted. `widget-cache.ts` and `widget-execution.ts` stay untouched
 * (CONTEXT.md ADR marks widget-execution intentionally shallow).
 */
import type { ChartConfig } from "@/lib/chart-types"
import type { AssistantMessage } from "@/lib/agent-types"
import type { ChartWidget } from "@/stores/dashboards"
import type { CachedQueryResult } from "@/lib/widget-cache"
import { widgetCache } from "@/lib/widget-cache"
import { executeWidgetQuery } from "@/lib/widget-execution"
import { useDashboardsStore } from "@/stores/dashboards"

// ── Create ──

/**
 * Input for `createWidget`. Discriminated by `source`:
 *   - `sql-dialog`: caller has already executed SQL and holds the result;
 *     passes `sql`, `vizConfig`, `queryResult`.
 *   - `agent-chat`: caller passes an `AssistantMessage` + its index; this
 *     module mirrors the guards + vizConfig mapping that lived in
 *     `widget-factory.ts` and returns `null` if the message carries no
 *     valid chart configuration.
 */
export type CreateWidgetInput =
  | {
      source: "sql-dialog"
      /** SQL that produced `queryResult`. Stored on the widget. */
      sql: string
      /** Chart config chosen by the user in the dialog. */
      vizConfig: ChartConfig
      /** Target dashboard. */
      dashboardId: string
      /** Already-executed query result to persist to IndexedDB. */
      queryResult: CachedQueryResult
      /** Original SQL without filter wrappers. Defaults to `sql`. */
      baseSql?: string
    }
  | {
      source: "agent-chat"
      /** Target dashboard. */
      dashboardId: string
      /** Assistant message carrying visualization + optional rows/columns. */
      message: { msg: AssistantMessage; index: number }
    }

/**
 * Create a ChartWidget, persist its query result to IndexedDB, and add it
 * to the dashboard store. Returns the widget, or `null` for the
 * `agent-chat` source when the message lacks a valid chart config.
 *
 * Behaviour preserved from the three original call sites:
 *   - widget ID is `crypto.randomUUID()`
 *   - cache key is the widget ID
 *   - `widget.source` is `"agent-chat"` for both branches (ChartWidget
 *     type only allows that literal; `source` here is a routing tag, not
 *     the stored field)
 *   - `agent-chat`: cache write only when `msg.rows && msg.columns`;
 *     `lastRunAt` is `Date.now()` when rows exist, else `null`
 *   - `sql-dialog`: cache write always (caller passes a real result);
 *     `lastRunAt` is `Date.now()`; `baseSql` defaults to `sql`
 */
export async function createWidget(
  input: CreateWidgetInput,
): Promise<ChartWidget | null> {
  const widgetId = crypto.randomUUID()

  let widget: ChartWidget

  if (input.source === "sql-dialog") {
    const { sql, vizConfig, dashboardId, queryResult, baseSql } = input
    await widgetCache.set(widgetId, queryResult)
    widget = {
      id: widgetId,
      type: "chart",
      sql,
      vizConfig,
      source: "agent-chat",
      lastRunAt: Date.now(),
      baseSql: baseSql ?? sql,
    }
    useDashboardsStore.getState().addWidget(dashboardId, widget)
    return widget
  }

  // agent-chat branch — migrated from widget-factory.ts
  const { msg, index } = input.message
  const viz = msg.visualization
  if (!viz?.config?.xKey) return null
  if (!viz.config.yKey && (!viz.config.series || viz.config.series.length === 0)) {
    return null
  }

  const { xKey, yKey, series, title, showLegend, height } = viz.config
  const vizConfig: ChartConfig = {
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

  widget = {
    id: widgetId,
    type: "chart",
    sql: msg.sql || "",
    vizConfig,
    source: "agent-chat",
    messageId: `msg-${index}`,
    lastRunAt: msg.rows ? Date.now() : null,
  }
  useDashboardsStore.getState().addWidget(input.dashboardId, widget)
  return widget
}

// ── Refresh ──

export interface RefreshWidgetInput {
  dashboardId: string
  widgetId: string
  /** Already-built SQL to execute (caller applies dashboard filters). */
  sql: string
}

/**
 * Re-execute a widget's SQL, persist the fresh result to IndexedDB, and
 * bump `lastRunAt` on the store. Returns the new result so the caller can
 * update its local render state.
 *
 * Extracted from `chart-widget-renderer.tsx::handleRefresh`. The caller
 * remains responsible for building the filtered SQL (via
 * `buildFilteredSql`) and for setting its local `cachedResult` state.
 */
export async function refreshWidget(
  input: RefreshWidgetInput,
): Promise<CachedQueryResult> {
  const { dashboardId, widgetId, sql } = input
  const result = await executeWidgetQuery(sql)
  await widgetCache.set(widgetId, result)
  useDashboardsStore.getState().updateWidgetLastRunAt(dashboardId, widgetId, Date.now())
  return result
}
