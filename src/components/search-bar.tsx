"use client"

import { useLang } from "@/components/lang-provider"

export function SearchBar({
  value,
  onChange,
}: {
  value?: string
  onChange?: (q: string) => void
}) {
  const { _t } = useLang()
  if (!onChange) return null
  return (
    <div className="relative flex-1 max-w-sm">
      <svg
        className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      <input
        type="text"
        placeholder={_t("search.placeholder")}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={_t("search.placeholder")}
        className="w-full pl-7 pr-2 py-1 text-xs rounded border border-border bg-background text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring"
      />
    </div>
  )
}
