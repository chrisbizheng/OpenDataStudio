"use client"

import { type HistoryItem } from "@/lib/history-items"
import { useLang } from "@/components/lang-provider"
import { formatTime } from "@/lib/format"

interface HistoryPanelProps {
  items: HistoryItem[]
  onSelect: (item: HistoryItem) => void
  onClear?: () => void
  emptyLabel?: string
}

export function HistoryPanel({ items, onSelect, onClear, emptyLabel }: HistoryPanelProps) {
  const { _t, lang } = useLang()
  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground p-3">{emptyLabel ?? _t("panel.no_history")}</div>
  }
  return (
    <div className="p-1.5 space-y-1">
      {onClear && (
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-[10px] text-muted-foreground">{items.length} {_t("panel.entries")}</span>
          <button onClick={onClear} className="text-[10px] text-muted-foreground hover:text-foreground">
            {_t("panel.clear")}
          </button>
        </div>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs"
          onClick={() => onSelect(item)}
          title={item.title}
        >
          <div className="text-foreground truncate font-mono text-[11px]">{item.title}</div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            <span>{formatTime(item.timestamp)}</span>
            {item.meta.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}