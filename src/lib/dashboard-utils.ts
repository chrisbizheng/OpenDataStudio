import type { Layout } from "react-grid-layout"
import type { WidgetLayout } from "@/stores/dashboards"

/** Convert store WidgetLayout[] → react-grid-layout Layout */
export function toRGLLayout(layouts: WidgetLayout[]): Layout {
  return layouts.map((l) => ({
    i: l.i,
    x: l.x,
    y: l.y,
    w: l.w,
    h: l.h,
    ...(l.minW != null ? { minW: l.minW } : {}),
    ...(l.minH != null ? { minH: l.minH } : {}),
  }))
}

/** Convert react-grid-layout Layout → store WidgetLayout[] */
export function fromRGLLayout(layout: Layout): WidgetLayout[] {
  return layout.map((l) => ({
    i: l.i,
    x: l.x,
    y: l.y,
    w: l.w,
    h: l.h,
  }))
}

/** Shared GridLayout config for canvas + view */
export const DASHBOARD_GRID_CONFIG = {
  cols: 12,
  rowHeight: 80,
  margin: [12, 12] as const,
  containerPadding: null,
  maxRows: Infinity,
}

/** Shared grid CSS for canvas + view */
export const DASHBOARD_GRID_CSS = `
  .react-grid-placeholder {
    background: color-mix(in oklch, var(--accent) 30%, transparent) !important;
    opacity: 1 !important;
  }
  .react-grid-item > .react-resizable-handle::after {
    border-color: var(--border) !important;
  }
`
