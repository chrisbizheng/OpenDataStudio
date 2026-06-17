import type { FieldRole } from "./column-type-classifier"

export type PivotDropZone = "filters" | "rows" | "columns" | "indicators"

export interface PivotDragItem {
  source: "schema" | "chip"
  field: string
  role: FieldRole | null
  zone?: PivotDropZone
  index?: number
}

export type DropAction =
  | { type: "add-filter"; field: string }
  | { type: "add-row"; field: string }
  | { type: "add-column"; field: string }
  | { type: "add-indicator"; field: string }
  | { type: "reorder"; zone: PivotDropZone; from: number; to: number }
  | { type: "move-cross-zone"; from: PivotDropZone; to: PivotDropZone; field: string }
  | { type: "remove"; zone: PivotDropZone; field: string }

export function canDropRole(role: FieldRole | null, zone: PivotDropZone): boolean {
  if (!role) return false
  if (zone === "filters") return true
  if (zone === "indicators") return role === "indicator"
  return role === "dimension"
}

export function resolveDrop(
  item: PivotDragItem,
  zone: PivotDropZone | null,
  toIndex?: number
): DropAction | null {
  if (!zone) {
    return item.source === "chip" && item.zone
      ? { type: "remove", zone: item.zone, field: item.field }
      : null
  }
  if (!canDropRole(item.role, zone)) return null
  if (item.source === "chip" && item.zone) {
    if (item.zone === zone && typeof item.index === "number" && typeof toIndex === "number") {
      return { type: "reorder", zone, from: item.index, to: toIndex }
    }
    return { type: "move-cross-zone", from: item.zone, to: zone, field: item.field }
  }
  if (zone === "filters") return { type: "add-filter", field: item.field }
  if (zone === "rows") return { type: "add-row", field: item.field }
  if (zone === "columns") return { type: "add-column", field: item.field }
  return { type: "add-indicator", field: item.field }
}
