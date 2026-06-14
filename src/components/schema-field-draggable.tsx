"use client"

import { useDraggable } from "@dnd-kit/core"
import type { FieldRole } from "@/lib/field-role"
import type { ReactNode } from "react"

export function SchemaFieldDraggable({
  id,
  field,
  role,
  disabled,
  label,
  children,
}: {
  id: string
  field: string
  role: FieldRole | null
  disabled: boolean
  label: string
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled,
    data: { source: "schema", field, role },
  })

  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded hover:bg-muted/50 pointer-events-auto"
      {...attributes}
      {...listeners}
      role="button"
      aria-label={label}
      aria-grabbed={isDragging}
    >
      {children}
    </div>
  )
}
