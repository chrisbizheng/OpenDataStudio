"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useLang } from "@/components/lang-provider"
import { CHART_TYPE_OPTIONS } from "@/lib/chart-constants"
import type { SeriesConfig } from "@/lib/chart-types"
import type { TabSharedProps } from "./config-helpers"
import { SeriesConfigEditor } from "./series-config-editor"

interface BasicTabProps extends TabSharedProps {
  onAddSeries: () => void
  onRemoveSeries: (index: number) => void
  onUpdateSeriesField: (index: number, field: keyof SeriesConfig, value: string) => void
}

export function BasicTab({
  local,
  updateField,
  onAddSeries,
  onRemoveSeries,
  onUpdateSeriesField,
}: BasicTabProps) {
  const { _t } = useLang()
  return (
    <div className="space-y-4 pr-1 pt-3">
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

      <SeriesConfigEditor
        series={local.series}
        isComposed={local.type === "composed"}
        emptyHint={local.type === "composed" ? _t("dashboard.add_series") : _t("dashboard.y_axis")}
        onAdd={onAddSeries}
        onRemove={onRemoveSeries}
        onUpdateField={onUpdateSeriesField}
      />
    </div>
  )
}
