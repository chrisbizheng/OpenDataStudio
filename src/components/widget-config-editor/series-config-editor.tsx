"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useLang } from "@/components/lang-provider"
import type { SeriesConfig } from "@/lib/agent-types"

interface SeriesConfigEditorProps {
  series: SeriesConfig[] | undefined
  isComposed: boolean
  emptyHint: string
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdateField: (index: number, field: keyof SeriesConfig, value: string) => void
}

export function SeriesConfigEditor({
  series,
  isComposed,
  emptyHint,
  onAdd,
  onRemove,
  onUpdateField,
}: SeriesConfigEditorProps) {
  const { _t } = useLang()

  return (
    <div>
      <Label className="text-sm font-medium mb-2 block">{_t("dashboard.series_config")}</Label>
      <div className="space-y-2 rounded-md border p-3">
        {(series ?? []).length === 0 && (
          <div className="text-xs text-muted-foreground py-1">{emptyHint}</div>
        )}
        {(series ?? []).map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
            <Input
              placeholder={_t("dashboard.series_ykey")}
              value={s.yKey}
              onChange={(e) => onUpdateField(i, "yKey", e.target.value)}
              className="h-9 text-sm flex-1"
            />
            {isComposed && (
              <Select value={s.chartType ?? ""} onValueChange={(value) => onUpdateField(i, "chartType", value || "")}>
                <SelectTrigger className="h-9 text-sm w-28"><SelectValue placeholder={_t("dashboard.series_type")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar" className="text-sm">{_t("dashboard.chart_type_bar")}</SelectItem>
                  <SelectItem value="line" className="text-sm">{_t("dashboard.chart_type_line")}</SelectItem>
                  <SelectItem value="area" className="text-sm">{_t("dashboard.chart_type_area")}</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input
              placeholder={_t("dashboard.series_label")}
              value={s.label ?? ""}
              onChange={(e) => onUpdateField(i, "label", e.target.value || "")}
              className="h-9 text-sm w-28"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(i)}
              className="h-9 w-9 px-0 text-destructive hover:text-destructive"
            >✕</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={onAdd} className="w-full text-sm">
          + {_t("dashboard.add_series")}
        </Button>
      </div>
    </div>
  )
}
