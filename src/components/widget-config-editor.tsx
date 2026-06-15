"use client"

import { useState, useEffect, startTransition, useCallback } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useLang } from "@/components/lang-provider"
import type { ChartConfig } from "@/lib/chart-helpers"
import type { SeriesConfig } from "@/lib/agent-types"
import { CHART_TYPE_OPTIONS } from "@/lib/chart-constants"

interface WidgetConfigEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ChartConfig
  onSave: (config: ChartConfig) => void
}

const NO_AXIS_TYPES = ["pie", "treemap", "radar", "radialBar"]

function configsEqual(a: ChartConfig, b: ChartConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function WidgetConfigEditor({
  open,
  onOpenChange,
  config,
  onSave,
}: WidgetConfigEditorProps) {
  const { _t } = useLang()

  const [local, setLocal] = useState<ChartConfig>(() => structuredClone(config))
  const [jsonText, setJsonText] = useState<string>(config.jsonOverride ?? "")
  const [jsonError, setJsonError] = useState(false)

  useEffect(() => {
    if (open) {
      const cloned = structuredClone(config)
      startTransition(() => {
        setLocal(cloned)
        setJsonText(cloned.jsonOverride ?? "")
        setJsonError(false)
      })
    }
  }, [config, open])

  const updateField = <K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }))
  }

  const updateAxis = <K extends keyof NonNullable<ChartConfig["axis"]>>(key: K, value: NonNullable<ChartConfig["axis"]>[K]) => {
    setLocal((prev) => ({ ...prev, axis: { ...prev.axis, [key]: value } }))
  }

  const updateStyle = <K extends keyof NonNullable<ChartConfig["style"]>>(key: K, value: NonNullable<ChartConfig["style"]>[K]) => {
    setLocal((prev) => ({ ...prev, style: { ...prev.style, [key]: value } }))
  }

  const updateLabel = <K extends keyof NonNullable<ChartConfig["label"]>>(key: K, value: NonNullable<ChartConfig["label"]>[K]) => {
    setLocal((prev) => ({ ...prev, label: { ...prev.label, [key]: value } }))
  }

  const addSeries = () => {
    setLocal((prev) => ({
      ...prev,
      series: [...(prev.series ?? []), { yKey: "" }],
    }))
  }

  const removeSeries = (index: number) => {
    setLocal((prev) => ({
      ...prev,
      series: prev.series?.filter((_, i) => i !== index),
    }))
  }

  const updateSeriesField = (index: number, field: keyof SeriesConfig, value: string) => {
    setLocal((prev) => {
      const series = [...(prev.series ?? [])]
      if (series[index]) {
        series[index] = { ...series[index], [field]: value }
      }
      return { ...prev, series }
    })
  }

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
      const confirmed = window.confirm("您有未保存的更改，确定要关闭吗？")
      if (!confirmed) return
    }
    onOpenChange(nextOpen)
  }, [hasUnsavedChanges, onOpenChange])

  const handleApply = () => {
    onSave(local)
    onOpenChange(false)
  }

  const showAxis = !NO_AXIS_TYPES.includes(local.type)
  const isBar = local.type === "bar"
  const isLine = local.type === "line" || local.type === "area"
  const isPie = local.type === "pie"
  const isComposed = local.type === "composed"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">{_t("dashboard.edit_config")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic">
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="text-xs">{_t("chart_tab_basic")}</TabsTrigger>
            {showAxis && <TabsTrigger value="axis" className="text-xs">{_t("chart_tab_axis")}</TabsTrigger>}
            <TabsTrigger value="style" className="text-xs">{_t("chart_tab_style")}</TabsTrigger>
            <TabsTrigger value="label" className="text-xs">{_t("chart_tab_label")}</TabsTrigger>
            <TabsTrigger value="json" className="text-xs">{_t("chart_tab_json")}</TabsTrigger>
          </TabsList>

          {/* ── 基础 Tab ── */}
          <TabsContent value="basic">
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 pt-2">
              {/* Chart type section */}
              <div>
                <Label className="text-sm font-medium">{_t("dashboard.chart_type")}</Label>
                <Select value={local.type} onValueChange={(value) => value && updateField("type", value)}>
                  <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHART_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-sm">{_t(opt.key)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t" />

              {/* Axis mapping section */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">{_t("dashboard.x_axis")}</Label>
                  <Input value={local.xKey} onChange={(e) => updateField("xKey", e.target.value)} className="mt-1.5 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{_t("dashboard.y_axis")}</Label>
                  <Input value={local.yKey ?? ""} onChange={(e) => updateField("yKey", e.target.value || undefined)} className="mt-1.5 h-9 text-sm" />
                </div>
              </div>

              <div className="border-t" />

              {/* Display section */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">{_t("dashboard.chart_title_label")}</Label>
                  <Input value={local.title ?? ""} onChange={(e) => updateField("title", e.target.value || undefined)} className="mt-1.5 h-9 text-sm" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{_t("dashboard.show_legend")}</Label>
                  <Switch checked={local.showLegend !== false} onCheckedChange={(checked) => updateField("showLegend", checked)} size="sm" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{_t("dashboard.chart_height")}</Label>
                  <Input type="number" step={50} min={100} max={2000} value={local.height ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : undefined; updateField("height", v) }} className="mt-1.5 h-9 text-sm" />
                </div>
              </div>

              <div className="border-t" />

              {/* Series config section */}
              <div>
                <Label className="text-sm font-medium mb-2 block">{_t("dashboard.series_config")}</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {(local.series ?? []).length === 0 && (
                    <div className="text-xs text-muted-foreground py-1">
                      {local.type === "composed" ? _t("dashboard.add_series") : _t("dashboard.y_axis")}
                    </div>
                  )}
                  {(local.series ?? []).map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <Input placeholder={_t("dashboard.series_ykey")} value={s.yKey} onChange={(e) => updateSeriesField(i, "yKey", e.target.value)} className="h-9 text-sm flex-1" />
                      {isComposed && (
                        <Select value={s.chartType ?? ""} onValueChange={(value) => updateSeriesField(i, "chartType", value || "")}>
                          <SelectTrigger className="h-9 text-sm w-28"><SelectValue placeholder={_t("dashboard.series_type")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bar" className="text-sm">{_t("dashboard.chart_type_bar")}</SelectItem>
                            <SelectItem value="line" className="text-sm">{_t("dashboard.chart_type_line")}</SelectItem>
                            <SelectItem value="area" className="text-sm">{_t("dashboard.chart_type_area")}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <Input placeholder={_t("dashboard.series_label")} value={s.label ?? ""} onChange={(e) => updateSeriesField(i, "label", e.target.value || "")} className="h-9 text-sm w-28" />
                      <Button variant="ghost" size="sm" onClick={() => removeSeries(i)} className="h-9 w-9 px-0 text-destructive hover:text-destructive">✕</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addSeries} className="w-full text-sm">+ {_t("dashboard.add_series")}</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── 坐标轴 Tab ── */}
          {showAxis && (
            <TabsContent value="axis">
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 pt-2">
                {/* X-axis section */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">X {_t("chart_tab_axis")}</Label>
                  <div className="space-y-4 pl-1">
                    <div>
                      <Label className="text-sm font-medium">{_t("chart_x_axis_name")}</Label>
                      <Input value={local.axis?.xAxisName ?? ""} onChange={(e) => updateAxis("xAxisName", e.target.value || undefined)} className="mt-1.5 h-9 text-sm" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{_t("chart_x_axis_rotate")}</Label>
                      <Select value={String(local.axis?.xAxisRotate ?? 0)} onValueChange={(v) => updateAxis("xAxisRotate", Number(v))}>
                        <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0" className="text-sm">0°</SelectItem>
                          <SelectItem value="30" className="text-sm">30°</SelectItem>
                          <SelectItem value="45" className="text-sm">45°</SelectItem>
                          <SelectItem value="90" className="text-sm">90°</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{_t("chart_x_axis_hide")}</Label>
                      <Switch checked={local.axis?.xAxisHide ?? false} onCheckedChange={(v) => updateAxis("xAxisHide", v)} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="border-t" />

                {/* Y-axis section */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">Y {_t("chart_tab_axis")}</Label>
                  <div className="space-y-4 pl-1">
                    <div>
                      <Label className="text-sm font-medium">{_t("chart_y_axis_name")}</Label>
                      <Input value={local.axis?.yAxisName ?? ""} onChange={(e) => updateAxis("yAxisName", e.target.value || undefined)} className="mt-1.5 h-9 text-sm" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{_t("chart_y_axis_unit")}</Label>
                      <Input value={local.axis?.yAxisUnit ?? ""} onChange={(e) => updateAxis("yAxisUnit", e.target.value || undefined)} className="mt-1.5 h-9 text-sm" placeholder="万元, %" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium">{_t("chart_y_axis_min")}</Label>
                        <Input type="number" step={1} value={local.axis?.yAxisMin ?? ""} onChange={(e) => updateAxis("yAxisMin", e.target.value ? Number(e.target.value) : undefined)} className="mt-1.5 h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">{_t("chart_y_axis_max")}</Label>
                        <Input type="number" step={1} value={local.axis?.yAxisMax ?? ""} onChange={(e) => updateAxis("yAxisMax", e.target.value ? Number(e.target.value) : undefined)} className="mt-1.5 h-9 text-sm" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{_t("chart_y_axis_hide")}</Label>
                      <Switch checked={local.axis?.yAxisHide ?? false} onCheckedChange={(v) => updateAxis("yAxisHide", v)} size="sm" />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* ── 样式 Tab ── */}
          <TabsContent value="style">
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 pt-2">
              {(isBar || isComposed) && (
                <>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_bar_radius")} ({local.style?.barRadius ?? 2})</Label>
                    <input type="range" min={0} max={20} value={local.style?.barRadius ?? 2} onChange={(e) => updateStyle("barRadius", Number(e.target.value))} className="mt-1.5 w-full h-2 accent-primary" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_bar_width")} ({local.style?.barWidth ?? 40})</Label>
                    <input type="range" min={10} max={100} value={local.style?.barWidth ?? 40} onChange={(e) => updateStyle("barWidth", Number(e.target.value))} className="mt-1.5 w-full h-2 accent-primary" />
                  </div>
                </>
              )}

              {(isLine || isComposed) && (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{_t("chart_line_smooth")}</Label>
                    <Switch checked={local.style?.lineSmooth ?? true} onCheckedChange={(v) => updateStyle("lineSmooth", v)} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{_t("chart_area_fill")}</Label>
                    <Switch checked={local.style?.areaFill ?? false} onCheckedChange={(v) => updateStyle("areaFill", v)} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{_t("chart_line_mark")}</Label>
                    <Switch checked={local.style?.lineMarkPoint ?? false} onCheckedChange={(v) => updateStyle("lineMarkPoint", v)} size="sm" />
                  </div>
                </>
              )}

              {isPie && (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{_t("chart_pie_donut")}</Label>
                    <Switch checked={local.style?.pieDonut ?? false} onCheckedChange={(v) => updateStyle("pieDonut", v)} size="sm" />
                  </div>
                  {local.style?.pieDonut && (
                    <div>
                      <Label className="text-sm font-medium">{_t("chart_pie_radius")} ({local.style?.pieRadius ?? 50}%)</Label>
                      <input type="range" min={30} max={90} value={local.style?.pieRadius ?? 50} onChange={(e) => updateStyle("pieRadius", Number(e.target.value))} className="mt-1.5 w-full h-2 accent-primary" />
                    </div>
                  )}
                </>
              )}

              <div>
                <Label className="text-sm font-medium">{_t("chart_color_theme")}</Label>
                <Select value={local.style?.colorTheme ?? "default"} onValueChange={(v) => updateStyle("colorTheme", v ?? "default")}>
                  <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default" className="text-sm">{_t("chart_color_default")}</SelectItem>
                    <SelectItem value="warm" className="text-sm">{_t("chart_color_warm")}</SelectItem>
                    <SelectItem value="cool" className="text-sm">{_t("chart_color_cool")}</SelectItem>
                    <SelectItem value="pastel" className="text-sm">{_t("chart_color_pastel")}</SelectItem>
                    <SelectItem value="dark" className="text-sm">{_t("chart_color_dark")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* ── 标签 Tab ── */}
          <TabsContent value="label">
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{_t("chart_show_labels")}</Label>
                <Switch checked={local.label?.showDataLabels ?? false} onCheckedChange={(v) => updateLabel("showDataLabels", v)} size="sm" />
              </div>

              {(isBar || isPie) && (
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{_t("chart_show_total")}</Label>
                  <Switch checked={local.label?.showTotalLabel ?? false} onCheckedChange={(v) => updateLabel("showTotalLabel", v)} size="sm" />
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">{_t("chart_number_format")}</Label>
                <Select value={local.label?.numberFormat ?? "none"} onValueChange={(v) => updateLabel("numberFormat", v ?? "none")}>
                  <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-sm">{_t("chart_format_none")}</SelectItem>
                    <SelectItem value="comma" className="text-sm">{_t("chart_format_comma")}</SelectItem>
                    <SelectItem value="percent" className="text-sm">{_t("chart_format_percent")}</SelectItem>
                    <SelectItem value="thousand" className="text-sm">{_t("chart_format_thousand")}</SelectItem>
                    <SelectItem value="million" className="text-sm">{_t("chart_format_million")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">{_t("chart_decimal_places")}</Label>
                <Select value={String(local.label?.decimalPlaces ?? 0)} onValueChange={(v) => updateLabel("decimalPlaces", Number(v))}>
                  <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)} className="text-sm">{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* ── JSON Tab ── */}
          <TabsContent value="json">
            <div className="space-y-2 pt-2">
              <Label className="text-sm font-medium">{_t("chart_json_override")}</Label>
              <Textarea
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                className={`font-mono text-sm min-h-[120px] ${jsonError ? "border-destructive focus-visible:border-destructive" : ""}`}
                placeholder='{"tooltip": {"trigger": "item"}}'
              />
              {jsonError && (
                <p className="text-xs text-destructive">{_t("chart_json_invalid")}</p>
              )}
              <p className="text-xs text-muted-foreground">{_t("chart_json_help")}</p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
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
