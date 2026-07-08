"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import { useLang } from "@/components/lang-provider"
import type { TabSharedProps } from "./config-helpers"
import type { ConditionalFormattingRule } from "@/lib/chart-types"

export function CfTab({ local, updateField }: TabSharedProps) {
  const { _t } = useLang()

  const rules = local.conditionalFormatting ?? []

  const addRule = () => {
    const next: ConditionalFormattingRule = {
      id: crypto.randomUUID(),
      column: "",
      operator: ">",
      value: 0,
      color: "#ef4444",
    }
    updateField("conditionalFormatting", [...rules, next])
  }

  const updateRule = (i: number, patch: Partial<ConditionalFormattingRule>) => {
    const copy = [...rules]
    copy[i] = { ...copy[i], ...patch }
    updateField("conditionalFormatting", copy)
  }

  const removeRule = (i: number) => {
    const copy = rules.filter((_, j) => j !== i)
    updateField("conditionalFormatting", copy.length ? copy : undefined)
  }

  return (
    <div className="space-y-3 pr-1 pt-3">
      {rules.map((rule, i) => (
        <div key={rule.id} className="flex items-center gap-2 border rounded-md p-2">
          <div className="flex-1 space-y-1.5">
            <Label className="text-[10px]">{_t("dashboard.cf_column")}</Label>
            <Select value={rule.column} onValueChange={(v) => v && updateRule(i, { column: v })}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {local.series?.map((s) => (
                  <SelectItem key={s.yKey} value={s.yKey} className="text-xs">{s.yKey}</SelectItem>
                ))}
                {local.yKey && (
                  <SelectItem value={local.yKey} className="text-xs">{local.yKey}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-[10px]">{_t("dashboard.cf_operator")}</Label>
            <Select
              value={rule.operator}
              onValueChange={(v) => v && updateRule(i, { operator: v as ConditionalFormattingRule["operator"] })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=">" className="text-xs">{_t("dashboard.cf_greater")}</SelectItem>
                <SelectItem value="<" className="text-xs">{_t("dashboard.cf_less")}</SelectItem>
                <SelectItem value=">=" className="text-xs">{_t("dashboard.cf_greater_equal")}</SelectItem>
                <SelectItem value="<=" className="text-xs">{_t("dashboard.cf_less_equal")}</SelectItem>
                <SelectItem value="=" className="text-xs">{_t("dashboard.cf_equal")}</SelectItem>
                <SelectItem value="!=" className="text-xs">{_t("dashboard.cf_not_equal")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-16 space-y-1.5">
            <Label className="text-[10px]">{_t("dashboard.cf_value")}</Label>
            <Input
              type="number"
              value={rule.value}
              onChange={(e) => updateRule(i, { value: Number(e.target.value) })}
              className="h-7 text-xs"
            />
          </div>
          <div className="w-12 space-y-1.5">
            <Label className="text-[10px]">{_t("dashboard.cf_color")}</Label>
            <input
              type="color"
              value={rule.color}
              onChange={(e) => updateRule(i, { color: e.target.value })}
              className="h-7 w-full rounded border cursor-pointer"
            />
          </div>
          <button
            onClick={() => removeRule(i)}
            className="self-end mb-1 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={addRule}>
        <Plus className="h-3 w-3 mr-1" />
        {_t("dashboard.cf_add_rule")}
      </Button>
    </div>
  )
}
