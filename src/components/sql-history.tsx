"use client"

import { useSqlHistoryStore } from "@/stores/sql-history"

export function SqlHistory() {
  const { entries, clearHistory } = useSqlHistoryStore()

  if (entries.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-3">
        No query history yet
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="text-xs font-medium">Query History</span>
        <button
          onClick={clearHistory}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-auto p-1.5 space-y-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs"
            title={entry.sql}
          >
            <div className="text-foreground truncate font-mono text-[11px]">
              {entry.sql}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
              <span>{formatTime(entry.timestamp)}</span>
              {entry.tableName && <span>{entry.tableName}</span>}
              <span>{entry.rowCount} rows</span>
              <span>{entry.executionTime.toFixed(2)}s</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString()
}