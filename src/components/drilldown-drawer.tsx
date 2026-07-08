"use client"

import { useLang } from "@/components/lang-provider"
import { DataGrid } from "@/components/data-grid"
import type { ColumnMeta } from "@/lib/types"

interface DrilldownDrawerProps {
  data: { columns: string[]; rows: unknown[][]; isLoading: boolean }
  schema: ColumnMeta[]
  onClose: () => void
}

export function DrilldownDrawer({ data, schema, onClose }: DrilldownDrawerProps) {
  const { _t } = useLang()

  return (
    <div className="shrink-0 max-h-[40%] border-t border-border mt-1 pt-1 overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <span className="text-xs font-semibold">{_t("pivot.drilldown")}</span>
        {!data.isLoading && (
          <span className="text-[10px] text-muted-foreground">
            {data.rows.length} {_t("pivot.result_rows")}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>
      {data.isLoading ? (
        <div className="flex items-center justify-center py-4">
          <span className="inline-block w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <DataGrid
            columns={data.columns}
            rows={data.rows}
            schema={schema}
          />
        </div>
      )}
    </div>
  )
}
