"use client"

import { useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useLang } from "@/components/lang-provider"
import { useDashboardsStore } from "@/stores/dashboards"
import { AgentChat } from "@/components/agent-chat"

interface CreateWidgetAiDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dashboardId: string
  tableName?: string | null
  schema?: { name: string; type: string; comment?: string }[]
  selectedDatabase?: string | null
}

export function CreateWidgetAiDialog({
  open,
  onOpenChange,
  dashboardId,
  tableName,
  schema,
  selectedDatabase,
}: CreateWidgetAiDialogProps) {
  const { _t } = useLang()
  const setActiveDashboard = useDashboardsStore((s) => s.setActiveDashboard)

  useEffect(() => {
    if (open) setActiveDashboard(dashboardId)
  }, [open, dashboardId, setActiveDashboard])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">{_t("dashboard.create_with_ai")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <AgentChat
            tableName={tableName}
            schema={schema}
            selectedDatabase={selectedDatabase}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
