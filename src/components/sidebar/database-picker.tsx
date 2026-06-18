"use client"

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useLang } from "@/components/lang-provider"
import type { DatabaseInfo } from "@/lib/catalog"

export function DatabasePicker({
  databases,
  selectedDatabase,
  onSelectDatabase,
}: {
  databases: DatabaseInfo[]
  selectedDatabase: string
  onSelectDatabase: (name: string) => void
}) {
  const { _t } = useLang()
  if (databases.length === 0) return null
  const currentDb = databases.find((d) => d.name === selectedDatabase)

  return (
    <>
      <Tooltip>
        <TooltipTrigger className="w-full" render={<span />}>
          <select
            value={selectedDatabase}
            onChange={(e) => onSelectDatabase(e.target.value)}
            aria-label="Database"
            className="w-full text-xs rounded border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-ring truncate"
          >
            {databases.map((db) => (
              <option key={db.name} value={db.name} title={db.name}>
                {db.name}
              </option>
            ))}
          </select>
        </TooltipTrigger>
        <TooltipContent side="right">{selectedDatabase}</TooltipContent>
      </Tooltip>
      {currentDb?.comment && (
        <div className="text-[10px] text-muted-foreground/80 leading-relaxed px-0.5">
          {_t("schema.data_source")}：{currentDb.comment}
        </div>
      )}
    </>
  )
}
