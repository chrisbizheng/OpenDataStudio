import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ChartConfig } from "@/lib/chart-types"
import type { ExploreConfig } from "@/lib/metric-types"

// ── Widget types (discriminated union, MVP only chart) ──

type WidgetType = "chart" | "grid" | "pivot" | "kpi" | "markdown"

export interface ChartWidget {
  id: string
  type: "chart"
  sql: string
  vizConfig: ChartConfig
  source: "agent-chat"
  messageId?: string
  lastRunAt: number | null
  /** Original SQL without filter wrappers (Q18). Set when widget is created. */
  baseSql?: string
  /** BI layer: dataset reference for metric-first widgets (Phase 1). */
  datasetId?: string
  /** BI layer: metric-first config. When set, SQL is generated from this, not `sql` field. */
  exploreConfig?: ExploreConfig
}

// Placeholder types for future expansion
export interface GridWidget { id: string; type: "grid" }
export interface PivotWidget { id: string; type: "pivot" }
export interface KpiWidget { id: string; type: "kpi" }
export interface MarkdownWidget { id: string; type: "markdown" }

export type Widget = ChartWidget | GridWidget | PivotWidget | KpiWidget | MarkdownWidget

// ── Layout ──

export interface WidgetLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

// ── Dashboard filters (Q15/Q17 — Phase 4 will populate) ──

export interface DashboardFilter {
  id: string
  column: string
  /** Single value for =, !=, >, <, >=, <=, LIKE. Required for backward compat. */
  value: string
  /** Multi-value for IN, NOT IN. For BETWEEN: [from, to]. */
  values?: string[]
  /** Filter operator. Defaults to "=". Old data has no operator = "=". */
  operator?: FilterOperator
  /** Controls UI rendering. Defaults to "text". */
  type?: FilterValueType
  /** Display name. Defaults to column. */
  name?: string
  /** "global" applies to all widgets; "scoped" applies to scopedWidgets only. Defaults to "global". */
  scope?: FilterScope
  /** Widget IDs when scope="scoped". */
  scopedWidgets?: string[]
}

export type FilterOperator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "IN"
  | "NOT IN"
  | "LIKE"
  | "BETWEEN"

export type FilterValueType = "text" | "number" | "date" | "select" | "multi-select"

export type FilterScope = "global" | "scoped"

// ── Dashboard ──

export type DashboardStatus = "draft" | "published"

export interface Dashboard {
  id: string
  name: string
  widgets: Widget[]
  layout: WidgetLayout[]
  filters: DashboardFilter[]
  status: DashboardStatus
  publishedAt: number | null
  /** Timestamp of last explicit save. Used for dirty tracking. */
  lastSavedAt: number | null
  createdAt: number
  updatedAt: number
}

// ── Store ──

interface DashboardsStore {
  dashboards: Dashboard[]
  activeDashboardId: string | null

  // Dashboard CRUD
  createDashboard: (name: string) => string
  deleteDashboard: (id: string) => void
  updateDashboard: (id: string, updates: Partial<Pick<Dashboard, "name">>) => void
  setActiveDashboard: (id: string | null) => void

  // Save & Publish
  saveDashboard: (id: string) => void
  publishDashboard: (id: string) => void
  unpublishDashboard: (id: string) => void
  isDirty: (id: string) => boolean

  // Widget management
  addWidget: (dashboardId: string, widget: Widget) => void
  removeWidget: (dashboardId: string, widgetId: string) => void
  updateLayout: (dashboardId: string, layout: WidgetLayout[]) => void
  updateWidgetLastRunAt: (dashboardId: string, widgetId: string, timestamp: number) => void
  updateWidget: (dashboardId: string, widgetId: string, updates: Partial<Omit<ChartWidget, "id" | "type">>) => void

  // Filter management (Phase 4)
  addFilter: (dashboardId: string, filter: DashboardFilter) => void
  updateFilter: (dashboardId: string, filterId: string, updates: Partial<DashboardFilter>) => void
  removeFilter: (dashboardId: string, filterId: string) => void
  clearFilters: (dashboardId: string) => void
}

function updateOneAndTouch(
  dashboards: Dashboard[],
  id: string,
  updater: (d: Dashboard) => Partial<Dashboard>
): Dashboard[] {
  return dashboards.map((d) =>
    d.id === id
      ? { ...d, ...updater(d), updatedAt: Date.now() }
      : d
  )
}

export const useDashboardsStore = create<DashboardsStore>()(
  persist(
    (set, get) => ({
      dashboards: [],
      activeDashboardId: null,

      createDashboard: (name) => {
        const id = crypto.randomUUID()
        const now = Date.now()
        set((s) => ({
          dashboards: [
            ...s.dashboards,
            {
              id,
              name,
              widgets: [],
              layout: [],
              filters: [],
              status: "draft" as DashboardStatus,
              publishedAt: null,
              lastSavedAt: now,
              createdAt: now,
              updatedAt: now,
            },
          ],
          activeDashboardId: id,
        }))
        return id
      },

      deleteDashboard: (id) =>
        set((s) => ({
          dashboards: s.dashboards.filter((d) => d.id !== id),
          activeDashboardId:
            s.activeDashboardId === id ? null : s.activeDashboardId,
        })),

      updateDashboard: (id, updates) =>
        set((s) => ({
          dashboards: updateOneAndTouch(s.dashboards, id, () => updates),
        })),

      setActiveDashboard: (id) => set({ activeDashboardId: id }),

      // ── Save & Publish ──

      saveDashboard: (id) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === id
              ? { ...d, lastSavedAt: Date.now(), updatedAt: d.updatedAt }
              : d
          ),
        })),

      publishDashboard: (id) => {
        const now = Date.now()
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: "published" as DashboardStatus,
                  publishedAt: now,
                  lastSavedAt: now,
                  updatedAt: d.updatedAt,
                }
              : d
          ),
        }))
      },

      unpublishDashboard: (id) =>
        set((s) => ({
          dashboards: updateOneAndTouch(s.dashboards, id, () => ({
            status: "draft" as DashboardStatus,
          })),
        })),

      isDirty: (id) => {
        const d = get().dashboards.find((d) => d.id === id)
        if (!d) return false
        if (!d.lastSavedAt) return true
        return d.updatedAt > d.lastSavedAt
      },

      // ── Widget management ──

      addWidget: (dashboardId, widget) =>
        set((s) => ({
          dashboards: updateOneAndTouch(s.dashboards, dashboardId, (d) => ({
            widgets: [...d.widgets, widget],
            layout: [
              ...d.layout,
              { i: widget.id, x: 0, y: Infinity, w: 6, h: 4, minW: 2, minH: 2 },
            ],
          })),
        })),

      removeWidget: (dashboardId, widgetId) =>
        set((s) => ({
          dashboards: updateOneAndTouch(s.dashboards, dashboardId, (d) => ({
            widgets: d.widgets.filter((w) => w.id !== widgetId),
            layout: d.layout.filter((l) => l.i !== widgetId),
          })),
        })),

      updateLayout: (dashboardId, layout) =>
        set((s) => ({
          dashboards: updateOneAndTouch(s.dashboards, dashboardId, () => ({
            layout,
          })),
        })),

      updateWidgetLastRunAt: (dashboardId, widgetId, timestamp) =>
        set((s) => ({
          dashboards: updateOneAndTouch(s.dashboards, dashboardId, (d) => ({
            widgets: d.widgets.map((w) =>
              w.id === widgetId ? { ...w, lastRunAt: timestamp } : w
            ),
          })),
        })),

      updateWidget: (dashboardId, widgetId, updates) =>
        set((s) => ({
          dashboards: updateOneAndTouch(s.dashboards, dashboardId, (d) => ({
            widgets: d.widgets.map((w) =>
              w.id === widgetId ? { ...w, ...updates } : w
            ),
          })),
        })),

      // ── Filter management (Phase 4) ──

      addFilter: (dashboardId, filter) =>
        set((s) => ({
          dashboards: updateOneAndTouch(s.dashboards, dashboardId, (d) => ({
            filters: [...d.filters, filter],
          })),
        })),

      updateFilter: (dashboardId, filterId, updates) =>
        set((s) => ({
          dashboards: updateOneAndTouch(s.dashboards, dashboardId, (d) => ({
            filters: d.filters.map((f) =>
              f.id === filterId ? { ...f, ...updates } : f
            ),
          })),
        })),

      removeFilter: (dashboardId, filterId) =>
        set((s) => ({
          dashboards: updateOneAndTouch(s.dashboards, dashboardId, (d) => ({
            filters: d.filters.filter((f) => f.id !== filterId),
          })),
        })),

      clearFilters: (dashboardId) =>
        set((s) => ({
          dashboards: updateOneAndTouch(s.dashboards, dashboardId, () => ({
            filters: [],
          })),
        })),
    }),
    {
      name: "dashboards",
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // 验证 activeDashboardId 是否仍指向真实存在的 dashboard，防止被删后悬挂
        if (
          state.activeDashboardId &&
          !state.dashboards.some((d) => d.id === state.activeDashboardId)
        ) {
          state.activeDashboardId = null
        }
      },
    }
  )
)
