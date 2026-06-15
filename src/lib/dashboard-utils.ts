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
