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
  const isScatter = local.type === "scatter"
  const isRadar = local.type === "radar"
  const isRadialBar = local.type === "radialBar"
  const isTreemap = local.type === "treemap"

  const TypeBadge = ({ label }: { label: string }) => (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary ml-1.5 align-middle">
      {label}
    </span>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[680px] h-[560px] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-sm">{_t("dashboard.edit_config")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="flex flex-col flex-1 min-h-0">
          {/* ── 上部：Tab 导航 ── */}
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="basic" className="text-xs">{_t("chart_tab_basic")}</TabsTrigger>
            {showAxis && <TabsTrigger value="axis" className="text-xs">{_t("chart_tab_axis")}</TabsTrigger>}
            <TabsTrigger value="style" className="text-xs">{_t("chart_tab_style")}</TabsTrigger>
            <TabsTrigger value="label" className="text-xs">{_t("chart_tab_label")}</TabsTrigger>
            <TabsTrigger value="json" className="text-xs">{_t("chart_tab_json")}</TabsTrigger>
          </TabsList>

          {/* ── 下部：编辑区域（可滚动） ── */}

          {/* 基础 Tab */}
          <TabsContent value="basic" className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-4 pr-1 pt-3">
              {/* 图表类型 */}
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

              {/* 轴映射 */}
              <div className="space-y-3">
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

              {/* 显示选项 */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">{_t("dashboard.chart_title_label")}</Label>
                  <Input value={local.title ?? ""} onChange={(e) => updateField("title", e.target.value || undefined)} className="mt-1.5 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{_t("dashboard.show_legend")}</Label>
                  <div className="mt-1.5"><Switch checked={local.showLegend !== false} onCheckedChange={(checked) => updateField("showLegend", checked)} size="sm" /></div>
                </div>
                <div>
                  <Label className="text-sm font-medium">{_t("dashboard.chart_height")}</Label>
                  <Input type="number" step={50} min={100} max={2000} value={local.height ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : undefined; updateField("height", v) }} className="mt-1.5 h-9 text-sm" />
                </div>
              </div>

              <div className="border-t" />

              {/* 序列配置 */}
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

          {/* 坐标轴 Tab */}
          {showAxis && (
            <TabsContent value="axis" className="flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-4 pr-1 pt-3">
                {/* X 轴 */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">X {_t("chart_tab_axis")}</Label>
                  <div className="space-y-3 pl-1">
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
                    <div>
                      <Label className="text-sm font-medium">{_t("chart_x_axis_hide")}</Label>
                      <div className="mt-1.5"><Switch checked={local.axis?.xAxisHide ?? false} onCheckedChange={(v) => updateAxis("xAxisHide", v)} size="sm" /></div>
                    </div>
                  </div>
                </div>

                <div className="border-t" />

                {/* Y 轴 */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Y {_t("chart_tab_axis")}</Label>
                  <div className="space-y-3 pl-1">
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
                    <div>
                      <Label className="text-sm font-medium">{_t("chart_y_axis_hide")}</Label>
                      <div className="mt-1.5"><Switch checked={local.axis?.yAxisHide ?? false} onCheckedChange={(v) => updateAxis("yAxisHide", v)} size="sm" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* 样式 Tab */}
          <TabsContent value="style" className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-4 pr-1 pt-3">
              {/* ── Background & Grid ── */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{_t("chart_section_bg_grid")}</Label>
                <div className="space-y-3 pl-1">
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_canvas_bg")}</Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input type="color" value={local.style?.canvasBg ?? "#ffffff"} onChange={(e) => updateStyle("canvasBg", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                      <Input value={local.style?.canvasBg ?? ""} onChange={(e) => updateStyle("canvasBg", e.target.value || undefined)} placeholder="transparent" className="h-9 text-sm flex-1" />
                      {local.style?.canvasBg && <Button variant="ghost" size="sm" className="h-9 w-9 px-0 text-muted-foreground" onClick={() => updateStyle("canvasBg", undefined)}>✕</Button>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_area_bg")}</Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input type="color" value={local.style?.chartBg ?? "#ffffff"} onChange={(e) => updateStyle("chartBg", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                      <Input value={local.style?.chartBg ?? ""} onChange={(e) => updateStyle("chartBg", e.target.value || undefined)} placeholder="transparent" className="h-9 text-sm flex-1" />
                      {local.style?.chartBg && <Button variant="ghost" size="sm" className="h-9 w-9 px-0 text-muted-foreground" onClick={() => updateStyle("chartBg", undefined)}>✕</Button>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_grid_padding")}</Label>
                    <div className="mt-1.5 grid grid-cols-4 gap-2">
                      <div><span className="text-[10px] text-muted-foreground">L</span><Input type="number" min={0} max={200} value={local.style?.gridPaddingLeft ?? ""} onChange={(e) => updateStyle("gridPaddingLeft", e.target.value ? Number(e.target.value) : undefined)} className="h-8 text-sm" /></div>
                      <div><span className="text-[10px] text-muted-foreground">R</span><Input type="number" min={0} max={200} value={local.style?.gridPaddingRight ?? ""} onChange={(e) => updateStyle("gridPaddingRight", e.target.value ? Number(e.target.value) : undefined)} className="h-8 text-sm" /></div>
                      <div><span className="text-[10px] text-muted-foreground">T</span><Input type="number" min={0} max={200} value={local.style?.gridPaddingTop ?? ""} onChange={(e) => updateStyle("gridPaddingTop", e.target.value ? Number(e.target.value) : undefined)} className="h-8 text-sm" /></div>
                      <div><span className="text-[10px] text-muted-foreground">B</span><Input type="number" min={0} max={200} value={local.style?.gridPaddingBottom ?? ""} onChange={(e) => updateStyle("gridPaddingBottom", e.target.value ? Number(e.target.value) : undefined)} className="h-8 text-sm" /></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium">{_t("chart_grid_border_width")} ({local.style?.gridBorderWidth ?? 0})</Label>
                      <input type="range" min={0} max={5} step={1} value={local.style?.gridBorderWidth ?? 0} onChange={(e) => updateStyle("gridBorderWidth", Number(e.target.value))} className="mt-1.5 w-full h-2 accent-primary" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{_t("chart_grid_border_color")}</Label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <input type="color" value={local.style?.gridBorderColor ?? "#cccccc"} onChange={(e) => updateStyle("gridBorderColor", e.target.value)} className="h-8 w-10 rounded border cursor-pointer" />
                        <Input value={local.style?.gridBorderColor ?? ""} onChange={(e) => updateStyle("gridBorderColor", e.target.value || undefined)} placeholder="#ccc" className="h-8 text-sm flex-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t" />
              {/* ── Split Line ── */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{_t("chart_section_split_line")}</Label>
                <div className="space-y-3 pl-1">
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_split_line_show")}</Label>
                    <div className="mt-1.5"><Switch checked={local.style?.splitLineShow !== false} onCheckedChange={(v) => updateStyle("splitLineShow", v)} size="sm" /></div>
                  </div>
                  {local.style?.splitLineShow !== false && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium">{_t("chart_split_line_color")}</Label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <input type="color" value={local.style?.splitLineColor ?? "#eeeeee"} onChange={(e) => updateStyle("splitLineColor", e.target.value)} className="h-8 w-10 rounded border cursor-pointer" />
                          <Input value={local.style?.splitLineColor ?? ""} onChange={(e) => updateStyle("splitLineColor", e.target.value || undefined)} placeholder="auto" className="h-8 text-sm flex-1" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">{_t("chart_split_line_type")}</Label>
                        <Select value={local.style?.splitLineType ?? "dashed"} onValueChange={(v) => updateStyle("splitLineType", v ?? undefined)}>
                          <SelectTrigger className="mt-1.5 h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solid" className="text-sm">{_t("chart_line_type_solid")}</SelectItem>
                            <SelectItem value="dashed" className="text-sm">{_t("chart_line_type_dashed")}</SelectItem>
                            <SelectItem value="dotted" className="text-sm">{_t("chart_line_type_dotted")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t" />
              {/* ── Animation ── */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{_t("chart_section_animation")}</Label>
                <div className="space-y-3 pl-1">
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_animation_duration")} ({local.style?.animationDuration ?? 600}ms)</Label>
                    <input type="range" min={0} max={3000} step={100} value={local.style?.animationDuration ?? 600} onChange={(e) => updateStyle("animationDuration", Number(e.target.value))} className="mt-1.5 w-full h-2 accent-primary" />
                  </div>
                </div>
              </div>
              <div className="border-t" />

              {(isBar || isComposed) && (
                <>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_bar_radius")} ({local.style?.barRadius ?? 2})<TypeBadge label="Bar" /></Label>
                    <input type="range" min={0} max={20} value={local.style?.barRadius ?? 2} onChange={(e) => updateStyle("barRadius", Number(e.target.value))} className="mt-1.5 w-full h-2 accent-primary" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_bar_width")} ({local.style?.barWidth ?? 40})<TypeBadge label="Bar" /></Label>
                    <input type="range" min={10} max={100} value={local.style?.barWidth ?? 40} onChange={(e) => updateStyle("barWidth", Number(e.target.value))} className="mt-1.5 w-full h-2 accent-primary" />
                  </div>
                </>
              )}

              {(isLine || isComposed) && (
                <>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_line_smooth")}<TypeBadge label="Line" /></Label>
                    <div className="mt-1.5"><Switch checked={local.style?.lineSmooth ?? false} onCheckedChange={(v) => updateStyle("lineSmooth", v)} size="sm" /></div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_area_fill")}<TypeBadge label="Line" /></Label>
                    <div className="mt-1.5"><Switch checked={local.style?.areaFill ?? false} onCheckedChange={(v) => updateStyle("areaFill", v)} size="sm" /></div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_line_mark")}<TypeBadge label="Line" /></Label>
                    <div className="mt-1.5"><Switch checked={local.style?.lineMarkPoint ?? false} onCheckedChange={(v) => updateStyle("lineMarkPoint", v)} size="sm" /></div>
                  </div>
                </>
              )}

              {isPie && (
                <>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_pie_donut")}<TypeBadge label="Pie" /></Label>
                    <div className="mt-1.5"><Switch checked={local.style?.pieDonut ?? false} onCheckedChange={(v) => updateStyle("pieDonut", v)} size="sm" /></div>
                  </div>
                  {local.style?.pieDonut && (
                    <div>
                      <Label className="text-sm font-medium">{_t("chart_pie_radius")} ({local.style?.pieRadius ?? 50}%)<TypeBadge label="Pie" /></Label>
                      <input type="range" min={30} max={90} value={local.style?.pieRadius ?? 50} onChange={(e) => updateStyle("pieRadius", Number(e.target.value))} className="mt-1.5 w-full h-2 accent-primary" />
                    </div>
                  )}
                </>
              )}

              {isScatter && (
                <>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_scatter_symbol_size")}<TypeBadge label="Scatter" /></Label>
                    <Input type="number" min={2} max={40} step={1} value={local.style?.scatterSymbolSize ?? ""} onChange={(e) => updateStyle("scatterSymbolSize", e.target.value ? Number(e.target.value) : undefined)} placeholder="8" className="mt-1.5 h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_scatter_symbol")}<TypeBadge label="Scatter" /></Label>
                    <Select value={local.style?.scatterSymbol ?? "circle"} onValueChange={(v) => v && updateStyle("scatterSymbol", v)}>
                      <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="circle" className="text-sm">{_t("chart_symbol_circle")}</SelectItem>
                        <SelectItem value="rect" className="text-sm">{_t("chart_symbol_rect")}</SelectItem>
                        <SelectItem value="triangle" className="text-sm">{_t("chart_symbol_triangle")}</SelectItem>
                        <SelectItem value="diamond" className="text-sm">{_t("chart_symbol_diamond")}</SelectItem>
                        <SelectItem value="pin" className="text-sm">{_t("chart_symbol_pin")}</SelectItem>
                        <SelectItem value="arrow" className="text-sm">{_t("chart_symbol_arrow")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {isRadar && (
                <>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_radar_shape")}<TypeBadge label="Radar" /></Label>
                    <Select value={local.style?.radarShape ?? "polygon"} onValueChange={(v) => v && updateStyle("radarShape", v)}>
                      <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="polygon" className="text-sm">{_t("chart_radar_polygon")}</SelectItem>
                        <SelectItem value="circle" className="text-sm">{_t("chart_radar_circle")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_radar_split_number")}<TypeBadge label="Radar" /></Label>
                    <Input type="number" min={2} max={10} step={1} value={local.style?.radarSplitNumber ?? ""} onChange={(e) => updateStyle("radarSplitNumber", e.target.value ? Number(e.target.value) : undefined)} placeholder="5" className="mt-1.5 h-9 text-sm" />
                  </div>
                </>
              )}

              {isRadialBar && (
                <>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_radial_start_angle")} ({local.style?.radialStartAngle ?? 90}°)<TypeBadge label="RadialBar" /></Label>
                    <input type="range" min={0} max={360} step={5} value={local.style?.radialStartAngle ?? 90} onChange={(e) => updateStyle("radialStartAngle", Number(e.target.value))} className="mt-1.5 w-full h-2 accent-primary" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_radial_end_angle")} ({local.style?.radialEndAngle ?? -90}°)<TypeBadge label="RadialBar" /></Label>
                    <input type="range" min={-360} max={0} step={5} value={local.style?.radialEndAngle ?? -90} onChange={(e) => updateStyle("radialEndAngle", Number(e.target.value))} className="mt-1.5 w-full h-2 accent-primary" />
                  </div>
                </>
              )}

              {isTreemap && (
                <>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_treemap_leaf_depth")}<TypeBadge label="Treemap" /></Label>
                    <Input type="number" min={1} max={10} step={1} value={local.style?.treemapLeafDepth ?? ""} onChange={(e) => updateStyle("treemapLeafDepth", e.target.value ? Number(e.target.value) : undefined)} placeholder="auto" className="mt-1.5 h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{_t("chart_treemap_breadcrumb")}<TypeBadge label="Treemap" /></Label>
                    <div className="mt-1.5"><Switch checked={local.style?.treemapBreadcrumb ?? false} onCheckedChange={(v) => updateStyle("treemapBreadcrumb", v)} size="sm" /></div>
                  </div>
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

          {/* 标签 Tab */}
          <TabsContent value="label" className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-4 pr-1 pt-3">
              <div>
                <Label className="text-sm font-medium">{_t("chart_show_labels")}</Label>
                <div className="mt-1.5"><Switch checked={local.label?.showDataLabels ?? false} onCheckedChange={(v) => updateLabel("showDataLabels", v)} size="sm" /></div>
              </div>

              {(isBar || isPie) && (
                <div>
                  <Label className="text-sm font-medium">{_t("chart_show_total")}</Label>
                  <div className="mt-1.5"><Switch checked={local.label?.showTotalLabel ?? false} onCheckedChange={(v) => updateLabel("showTotalLabel", v)} size="sm" /></div>
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

          {/* JSON Tab */}
          <TabsContent value="json" className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-2 pt-3">
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
