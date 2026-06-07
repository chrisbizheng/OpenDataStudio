"use client"

import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useSqlHistoryStore } from "@/stores/sql-history"
import { useSavedQueriesStore } from "@/stores/saved-queries"
import { communityQueries, type CommunityQuery } from "@/lib/community-queries"
import { useLang } from "@/components/lang-provider"
import { formatTime } from "@/lib/format"

interface QueryPanelsProps {
  onSelectSql: (sql: string) => void
}

type Tab = "history" | "saved" | "community"

export function QueryPanels({ onSelectSql }: QueryPanelsProps) {
  const { _t } = useLang()
  const [tab, setTab] = useState<Tab>("history")
  const { entries, clearHistory } = useSqlHistoryStore(useShallow((s) => ({
    entries: s.entries,
    clearHistory: s.clearHistory,
  })))
  const { queries, remove } = useSavedQueriesStore(useShallow((s) => ({
    queries: s.queries,
    remove: s.remove,
  })))

  return (
    <div className="flex flex-col max-h-56 border-t border-border">
      <div className="flex border-b border-border shrink-0">
        {(["history", "saved", "community"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-[10px] font-medium py-1.5 px-2 transition-colors ${
              tab === t
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
              {t === "history" ? _t("panel.history") : t === "saved" ? _t("panel.saved") : _t("panel.community")}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {tab === "history" && (
          <HistoryPanel entries={entries} onSelect={onSelectSql} onClear={clearHistory} />
        )}
        {tab === "saved" && (
          <SavedPanel queries={queries} onSelect={onSelectSql} onRemove={remove} />
        )}
        {tab === "community" && (
          <CommunityPanel queries={communityQueries} onSelect={onSelectSql} />
        )}
      </div>
    </div>
  )
}

function HistoryPanel({
  entries,
  onSelect,
  onClear,
}: {
  entries: { id: string; sql: string; timestamp: number; tableName: string | null; rowCount: number; executionTime: number }[]
  onSelect: (sql: string) => void
  onClear: () => void
}) {
  const { _t } = useLang()
  if (entries.length === 0) {
    return <div className="text-xs text-muted-foreground p-3">{_t("panel.no_history")}</div>
  }
  return (
    <div className="p-1.5 space-y-1">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-[10px] text-muted-foreground">{entries.length} {_t("panel.entries")}</span>
        <button onClick={onClear} className="text-[10px] text-muted-foreground hover:text-foreground">{_t("panel.clear")}</button>
      </div>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs"
          onClick={() => onSelect(entry.sql)}
          title={entry.sql}
        >
          <div className="text-foreground truncate font-mono text-[11px]">{entry.sql}</div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            <span>{formatTime(entry.timestamp)}</span>
            {entry.tableName && <span>{entry.tableName}</span>}
            <span>{entry.rowCount} rows</span>
            <span>{entry.executionTime.toFixed(2)}s</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function SavedPanel({
  queries,
  onSelect,
  onRemove,
}: {
  queries: { id: string; name: string; sql: string; createdAt: number }[]
  onSelect: (sql: string) => void
  onRemove: (id: string) => void
}) {
  const { _t } = useLang()
  if (queries.length === 0) {
    return <div className="text-xs text-muted-foreground p-3">{_t("panel.no_saved")}</div>
  }
  return (
    <div className="p-1.5 space-y-1">
      <div className="px-2 py-1 text-[10px] text-muted-foreground">{queries.length} {_t("panel.saved_count")}</div>
      {queries.map((q) => (
        <div
          key={q.id}
          className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs group"
          onClick={() => onSelect(q.sql)}
          title={q.sql}
        >
          <div className="flex items-center justify-between">
            <span className="text-foreground font-medium truncate">{q.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(q.id) }}
              className="text-[10px] text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
            >
              ✕
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {formatTime(q.createdAt)}
          </div>
        </div>
      ))}
    </div>
  )
}

function CommunityPanel({
  queries,
  onSelect,
}: {
  queries: { name: string; sql: string; description: string }[]
  onSelect: (sql: string) => void
}) {
  const { _t } = useLang()
  return (
    <div className="p-1.5 space-y-1">
      <div className="px-2 py-1 text-[10px] text-muted-foreground">{queries.length} {_t("panel.templates")}</div>
      {queries.map((q, i) => (
        <div
          key={i}
          className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs"
          onClick={() => onSelect(q.sql)}
          title={q.sql}
        >
          <div className="text-foreground font-medium truncate">{q.name}</div>
          <div className="text-[10px] text-muted-foreground truncate mt-0.5">{q.description}</div>
        </div>
      ))}
    </div>
  )
}
