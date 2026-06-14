"use client"

import type { FieldRole } from "@/lib/field-role"
import type { MouseEvent as ReactMouseEvent } from "react"

export function FieldRoleBadge({
  role,
  defaultRole,
  isOverridden,
  onToggle,
  onOpenMenu,
  label,
}: {
  role: FieldRole | null
  defaultRole: FieldRole | null
  isOverridden: boolean
  onToggle: (event: ReactMouseEvent<HTMLButtonElement>) => void
  onOpenMenu: (event: ReactMouseEvent<HTMLButtonElement>) => void
  label: (key: string) => string
}) {
  const text = role === "dimension" ? "D" : role === "indicator" ? "I" : "—"
  const roleLabel = role ? label(`field.role.${role}`) : label("field.role.unmarkable")
  const defaultLabel = defaultRole ? label(`field.role.${defaultRole}`) : label("field.role.unmarkable")
  const className = role
    ? isOverridden
      ? role === "dimension"
        ? "border-blue-500/50 bg-blue-500/10 text-blue-600"
        : "border-orange-500/50 bg-orange-500/10 text-orange-600"
      : "border-transparent bg-muted text-muted-foreground"
    : "border-transparent text-muted-foreground/40"

  return (
    <button
      type="button"
      disabled={!role}
      aria-label={`${label("field.role.current")}：${roleLabel}`}
      title={`${label("field.role.current")}：${roleLabel} · ${label("field.role.default")}：${defaultLabel}${isOverridden ? ` · ${label("field.role.overridden")}` : ""}`}
      onClick={onToggle}
      onContextMenu={onOpenMenu}
      className={`h-4 min-w-4 rounded border px-1 text-[9px] leading-3 shrink-0 ${className}`}
    >
      {text}
    </button>
  )
}
