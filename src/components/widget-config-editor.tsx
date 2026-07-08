"use client"

import { useState, useEffect, startTransition, useCallback } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useLang } from "@/components/lang-provider"
import type { ChartConfig } from "@/lib/chart-types"
import { useVizConfig } from "@/hooks/use-viz-config"
import { NO_AXIS_TYPES, configsEqual, type TabSharedProps } from "./widget-config-editor/config-helpers"
import { BasicTab } from "./widget-config-editor/basic-tab"
import { AxisTab } from "./widget-config-editor/axis-tab"
import { StyleTab } from "./widget-config-editor/style-tab"
import { LabelTab } from "./widget-config-editor/label-tab"
import { JsonTab } from "./widget-config-editor/json-tab"

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

  const [jsonText, setJsonText] = useState<string>(config.jsonOverride ?? "")
  const [jsonError, setJsonError] = useState(false)

  const {
    config: local,
    setConfig: setLocal,
    updateField,
    updateAxis,
    updateStyle,
    updateLabel,
    addSeries,
    removeSeries,
    updateSeriesField,
  } = useVizConfig(structuredClone(config))

  useEffect(() => {
    if (open) {
      const cloned = structuredClone(config)
      startTransition(() => {
        setLocal(cloned)
        setJsonText(cloned.jsonOverride ?? "")
        setJsonError(false)
      })
    }
  }, [config, open, setLocal])

  const handleJsonChange = (text: string) => {
    setJsonText(text)
    if (text.trim() === "") {
      setJsonError(false)
      updateField("jsonOverride", undefined)
      return
    }
    try {
      JSON.parse(text)
      setJsonError(false)
      updateField("jsonOverride", text)
    } catch {
      setJsonError(true)
      updateField("jsonOverride", text)
    }
  }

  const hasUnsavedChanges = !configsEqual(local, config)

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && hasUnsavedChanges) {
      const confirmed = window.confirm(_t("widget.unsaved_changes_confirm"))
      if (!confirmed) return
    }
    onOpenChange(nextOpen)
  }, [hasUnsavedChanges, onOpenChange])

  const handleApply = () => {
    onSave(local)
    onOpenChange(false)
  }

  const showAxis = !NO_AXIS_TYPES.includes(local.type)

  const tabShared: TabSharedProps = { local, updateField, updateAxis, updateStyle, updateLabel }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[680px] h-[560px] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-sm">{_t("dashboard.edit_config")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="flex flex-col flex-1 min-h-0">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="basic" className="text-xs">{_t("chart_tab_basic")}</TabsTrigger>
            {showAxis && <TabsTrigger value="axis" className="text-xs">{_t("chart_tab_axis")}</TabsTrigger>}
            <TabsTrigger value="style" className="text-xs">{_t("chart_tab_style")}</TabsTrigger>
            <TabsTrigger value="label" className="text-xs">{_t("chart_tab_label")}</TabsTrigger>
            <TabsTrigger value="json" className="text-xs">{_t("chart_tab_json")}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="flex-1 min-h-0 overflow-y-auto">
            <BasicTab
              {...tabShared}
              onAddSeries={addSeries}
              onRemoveSeries={removeSeries}
              onUpdateSeriesField={updateSeriesField}
            />
          </TabsContent>

          {showAxis && (
            <TabsContent value="axis" className="flex-1 min-h-0 overflow-y-auto">
              <AxisTab {...tabShared} />
            </TabsContent>
          )}

          <TabsContent value="style" className="flex-1 min-h-0 overflow-y-auto">
            <StyleTab {...tabShared} />
          </TabsContent>

          <TabsContent value="label" className="flex-1 min-h-0 overflow-y-auto">
            <LabelTab {...tabShared} />
          </TabsContent>

          <TabsContent value="json" className="flex-1 min-h-0 overflow-y-auto">
            <JsonTab jsonText={jsonText} jsonError={jsonError} onChange={handleJsonChange} />
          </TabsContent>
        </Tabs>

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
