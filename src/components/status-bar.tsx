"use client"

import { useLang } from "@/components/lang-provider"
import { formatRowCount } from "@/lib/format"
import { useCatalog } from "@/hooks/use-catalog"

export function StatusBar() {
  const { _t } = useLang()
  const { tables, isConnected, error } = useCatalog()
  const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0)

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
            {tables.length} {_t("status.tables")} · {formatRowCount(totalRows)} {_t("status.rows_total")}
          </span>
        )}
      </div>
    </div>
  )
}
