"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useLang } from "@/components/lang-provider"
import type { TabSharedProps } from "./config-helpers"
import { TypeBadge } from "./type-badge"

export function StyleTab({ local, updateStyle }: TabSharedProps) {
  const { _t } = useLang()

  const isBar = local.type === "bar"
  const isLine = local.type === "line" || local.type === "area"
  const isPie = local.type === "pie"
  const isComposed = local.type === "composed"
  const isScatter = local.type === "scatter"
  const isRadar = local.type === "radar"
  const isRadialBar = local.type === "radialBar"
  const isTreemap = local.type === "treemap"

  return (
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
  )
}
