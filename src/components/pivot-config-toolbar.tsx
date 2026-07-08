"use client"

import { Button } from "@/components/ui/button"
import { useLang } from "@/components/lang-provider"

interface PivotConfigToolbarProps {
  isExecuting: boolean
  onExecute: () => void
  onCancel: () => void
  onViewSql: () => void
}

export function PivotConfigToolbar({
  isExecuting,
  onExecute,
  onCancel,
  onViewSql,
}: PivotConfigToolbarProps) {
  const { _t } = useLang()

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border shrink-0">
      {isExecuting ? (
        <Button
          variant="destructive"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={onCancel}
          title={_t("sql.stop_hint") || "Cancel running query"}
        >
          <span className="inline-block w-2.5 h-2.5 bg-current rounded-sm mr-1" />
          {_t("sql.stop") || "Stop"}
        </Button>
      ) : (
        <Button
          size="sm"
          className="h-6 text-xs px-2"
          onClick={onExecute}
        >
          {_t("pivot.execute")}
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-6 text-xs px-2"
        onClick={onViewSql}
      >
        {_t("pivot.view_sql")}
      </Button>
    </div>
  )
}
