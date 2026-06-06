"use client"

import { useDatasetStore } from "@/stores/dataset"
import { useLang } from "@/components/lang-provider"

export function StatusBar() {
  const { _t } = useLang()
  const { isConnected, tables, totalRows, error } = useDatasetStore()

  return (
    <div className="flex items-center justify-between px-3 py-1 text-xs text-muted-foreground border-t border-border bg-muted/20">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            isConnected ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
        <span>
          {isConnected ? _t("status.connected") : error ? _t("status.failed") : _t("status.connecting")}
        </span>
      </div>
      <div className="tabular-nums">
        {tables.length > 0 && (
          <span>
            {tables.length} {_t("status.tables")} · {formatNumber(totalRows)} {_t("status.rows_total")}
          </span>
        )}
      </div>
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}