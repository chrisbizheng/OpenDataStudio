"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useDashboardsStore } from "@/stores/dashboards"
import { createWidgetFromMessage } from "@/lib/widget-factory"
import type { AssistantMessage } from "@/lib/agent-types"

export function DashboardSelectorDialog({ open, onOpenChange, msg, index, _t }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  msg: AssistantMessage
  index: number
  _t: (k: string) => string
}) {
  const { dashboards, createDashboard, addWidget } = useDashboardsStore()
  const [adding, setAdding] = useState<string | null>(null)
  const [showNewInput, setShowNewInput] = useState(false)
  const [newName, setNewName] = useState("")

  const addToDashboard = async (dashboardId: string, dashboardName: string) => {
    setAdding(dashboardId)
    try {
      const widget = await createWidgetFromMessage(msg, index)
      if (widget) {
        addWidget(dashboardId, widget)
        onOpenChange(false)
        toast.success(`${_t("dashboard.added_to")}: ${dashboardName}`)
      } else {
        toast.error(_t("dashboard.add_failed"))
      }
    } catch (e) {
      toast.error(`${_t("dashboard.add_failed")}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAdding(null)
    }
  }

  const handleCreateNew = async () => {
    const name = newName.trim() || _t("dashboard.create_new")
    const id = createDashboard(name)
    setShowNewInput(false)
    setNewName("")
    await addToDashboard(id, name)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>{_t("dashboard.select_dashboard")}</DialogTitle>
        <div className="space-y-1 max-h-60 overflow-y-auto py-1">
          {dashboards.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-muted/40">
              <span className="text-xs truncate flex-1">{d.name}</span>
              <Button size="xs" variant="outline" onClick={() => addToDashboard(d.id, d.name)} disabled={adding === d.id}>
                {adding === d.id ? "..." : _t("dashboard.add_to")}
              </Button>
            </div>
          ))}
          {dashboards.length === 0 && !showNewInput && (
            <p className="text-xs text-muted-foreground text-center py-4">{_t("dashboard.create_new")}</p>
          )}
        </div>
        <div className="border-t border-border pt-2">
          {showNewInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateNew() }}
                placeholder={_t("dashboard.create_new")}
                className="flex-1 px-2 py-1 text-xs rounded border border-border bg-background outline-none focus:border-ring"
                autoFocus
              />
              <Button size="xs" onClick={handleCreateNew}>{_t("dashboard.add_to")}</Button>
            </div>
          ) : (
            <Button variant="outline" size="xs" className="w-full" onClick={() => setShowNewInput(true)}>
              + {_t("dashboard.create_new")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
