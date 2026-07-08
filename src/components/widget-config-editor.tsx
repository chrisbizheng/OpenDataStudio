"use client"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLang } from "@/components/lang-provider"
import type { ChartConfig } from "@/lib/chart-types"
import { configsEqual } from "./widget-config-editor/config-helpers"
import { ChartConfigPanel } from "./chart-config-panel"

interface WidgetConfigEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ChartConfig
  onSave: (config: ChartConfig) => void
}

export function WidgetConfigEditor({
  open,
  onOpenChange,
  config,
  onSave,
}: WidgetConfigEditorProps) {
  const { _t } = useLang()

  const [localConfig, setLocalConfig] = useState<ChartConfig>(() => structuredClone(config))

  const hasUnsavedChanges = !configsEqual(localConfig, config)

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && hasUnsavedChanges) {
      const confirmed = window.confirm(_t("widget.unsaved_changes_confirm"))
      if (!confirmed) return
    }
    onOpenChange(nextOpen)
  }, [hasUnsavedChanges, onOpenChange, _t])

  const handleApply = () => {
    onSave(localConfig)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[680px] h-[560px] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-sm">{_t("dashboard.edit_config")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <ChartConfigPanel config={localConfig} onChange={setLocalConfig} />
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            {_t("dashboard.cancel")}
          </Button>
          <Button size="sm" onClick={handleApply}>
            {_t("dashboard.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
