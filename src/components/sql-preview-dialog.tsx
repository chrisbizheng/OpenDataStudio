"use client"

import { useState } from "react"
import { useLang } from "@/components/lang-provider"

interface SqlPreviewDialogProps {
  sql: string
  open: boolean
  onClose: () => void
}

export function SqlPreviewDialog({ sql, open, onClose }: SqlPreviewDialogProps) {
  const { _t } = useLang()
  const [copied, setCopied] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-sm font-semibold">{_t("pivot.view_sql")}</span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs font-mono whitespace-pre-wrap text-foreground bg-muted/50 p-3 rounded">
            {sql}
          </pre>
        </div>
        <div className="flex justify-end gap-2 px-4 py-2 border-t border-border">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(sql)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1200)
            }}
            className="px-3 py-1 text-xs bg-muted rounded transition-colors hover:bg-muted/80"
          >
            {copied ? _t("pivot.copied_sql") : _t("pivot.copy_sql")}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            {_t("pivot.close")}
          </button>
        </div>
      </div>
    </div>
  )
}
