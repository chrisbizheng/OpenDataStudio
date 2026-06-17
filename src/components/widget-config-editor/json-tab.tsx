"use client"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLang } from "@/components/lang-provider"

interface JsonTabProps {
  jsonText: string
  jsonError: boolean
  onChange: (text: string) => void
}

export function JsonTab({ jsonText, jsonError, onChange }: JsonTabProps) {
  const { _t } = useLang()
  return (
    <div className="space-y-2 pt-3">
      <Label className="text-sm font-medium">{_t("chart_json_override")}</Label>
      <Textarea
        value={jsonText}
        onChange={(e) => onChange(e.target.value)}
        className={`font-mono text-sm min-h-[120px] ${jsonError ? "border-destructive focus-visible:border-destructive" : ""}`}
        placeholder='{"tooltip": {"trigger": "item"}}'
      />
      {jsonError && (
        <p className="text-xs text-destructive">{_t("chart_json_invalid")}</p>
      )}
      <p className="text-xs text-muted-foreground">{_t("chart_json_help")}</p>
    </div>
  )
}
