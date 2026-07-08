"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
import { CfTab } from "./widget-config-editor/cf-tab"
import { cn } from "@/lib/utils"

interface ChartConfigPanelProps {
  config: ChartConfig
  onChange: (config: ChartConfig) => void
  className?: string
  extraChartTypeOptions?: { value: string; key: string }[]
}

export function ChartConfigPanel({ config, onChange, className, extraChartTypeOptions }: ChartConfigPanelProps) {
  const { _t } = useLang()
  const [jsonText, setJsonText] = useState<string>(config.jsonOverride ?? "")
  const [jsonError, setJsonError] = useState(false)

  const {
    config: local,
    updateField: _updateField,
    updateAxis: _updateAxis,
    updateStyle: _updateStyle,
    updateLabel: _updateLabel,
    addSeries: _addSeries,
    removeSeries: _removeSeries,
    updateSeriesField: _updateSeriesField,
  } = useVizConfig(structuredClone(config))

  // Notify parent of changes
  const prevLocalRef = useRef(local)
  useEffect(() => {
    if (!configsEqual(local, prevLocalRef.current)) {
      prevLocalRef.current = local
      if (!configsEqual(local, config)) {
        onChange(local)
      }
    }
  }, [local, config, onChange])

  const handleJsonChange = useCallback((text: string) => {
    setJsonText(text)
    if (text.trim() === "") {
      setJsonError(false)
      _updateField("jsonOverride", undefined)
      return
    }
    try {
      JSON.parse(text)
      setJsonError(false)
      _updateField("jsonOverride", text)
    } catch {
      setJsonError(true)
      _updateField("jsonOverride", text)
    }
  }, [_updateField])

  const showAxis = !NO_AXIS_TYPES.includes(local.type)
  const tabShared: TabSharedProps = { local, updateField: _updateField, updateAxis: _updateAxis, updateStyle: _updateStyle, updateLabel: _updateLabel }

  return (
    <Tabs defaultValue="basic" className={cn("flex flex-col h-full", className)}>
      <TabsList className="w-full shrink-0">
        <TabsTrigger value="basic" className="text-xs">{_t("chart_tab_basic")}</TabsTrigger>
        {showAxis && <TabsTrigger value="axis" className="text-xs">{_t("chart_tab_axis")}</TabsTrigger>}
        <TabsTrigger value="style" className="text-xs">{_t("chart_tab_style")}</TabsTrigger>
        <TabsTrigger value="label" className="text-xs">{_t("chart_tab_label")}</TabsTrigger>
        <TabsTrigger value="cf" className="text-xs">{_t("dashboard.conditional_formatting")}</TabsTrigger>
        <TabsTrigger value="json" className="text-xs">{_t("chart_tab_json")}</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="flex-1 min-h-0 overflow-y-auto">
        <BasicTab
          {...tabShared}
          onAddSeries={_addSeries}
          onRemoveSeries={_removeSeries}
          onUpdateSeriesField={_updateSeriesField}
          extraChartTypeOptions={extraChartTypeOptions}
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

      <TabsContent value="cf" className="flex-1 min-h-0 overflow-y-auto">
        <CfTab {...tabShared} />
      </TabsContent>
      <TabsContent value="json" className="flex-1 min-h-0 overflow-y-auto">
        <JsonTab jsonText={jsonText} jsonError={jsonError} onChange={handleJsonChange} />
      </TabsContent>
    </Tabs>
  )
}
