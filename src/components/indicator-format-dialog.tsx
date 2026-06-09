"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { IndicatorFormat, PivotIndicator } from "@/lib/pivot-sql"

interface IndicatorFormatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  indicator?: PivotIndicator
  onSave: (format: IndicatorFormat, decimals: number) => void
}

const FORMAT_OPTIONS: { value: IndicatorFormat; label: string }[] = [
  { value: "number", label: "数字" },
  { value: "percent", label: "百分比" },
  { value: "currency", label: "货币" },
]

export function IndicatorFormatDialog({
  open,
  onOpenChange,
  indicator,
  onSave,
}: IndicatorFormatDialogProps) {
  const [format, setFormat] = useState<IndicatorFormat>(indicator?.format ?? "number")
  const [decimals, setDecimals] = useState(indicator?.decimals ?? 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm">格式设置</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">指标</Label>
            <div className="mt-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
              {indicator?.title}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">展示格式</Label>
              <Select value={format} onValueChange={(value) => value && setFormat(value as IndicatorFormat)}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">小数位</Label>
              <Input
                type="number"
                min={0}
                max={8}
                value={decimals}
                onChange={(event) => setDecimals(Number(event.target.value))}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(format, decimals)
              onOpenChange(false)
            }}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
