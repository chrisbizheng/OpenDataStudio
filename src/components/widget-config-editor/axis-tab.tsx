"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useLang } from "@/components/lang-provider"
import type { TabSharedProps } from "./config-helpers"

export function AxisTab({ local, updateAxis }: TabSharedProps) {
  const { _t } = useLang()
  return (
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
  )
}
