"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useLang } from "@/components/lang-provider"
import type { TabSharedProps } from "./config-helpers"

export function LabelTab({ local, updateLabel }: TabSharedProps) {
  const { _t } = useLang()
  const isBar = local.type === "bar"
  const isPie = local.type === "pie"

  return (
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
  )
}
