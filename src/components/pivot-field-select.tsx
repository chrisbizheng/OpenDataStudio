"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatType } from "@/lib/column-type-classifier"

interface PivotFieldSelectProps {
  options: { name: string; type: string }[]
  value?: string
  onValueChange?: (v: string) => void
  placeholder: string
}

export function PivotFieldSelect({
  options,
  value,
  onValueChange,
  placeholder,
}: PivotFieldSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v: string | null) => {
        if (!v) return
        onValueChange?.(v)
      }}
    >
      <SelectTrigger className="h-6 w-auto justify-center rounded border-none p-0 px-1 text-[10px] text-muted-foreground shadow-none transition-colors hover:bg-muted hover:text-foreground [&_svg]:hidden *:data-[slot=select-value]:flex-none">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((d) => (
          <SelectItem key={d.name} value={d.name}>
            <span className="text-xs">{d.name} <span className="text-muted-foreground">{formatType(d.type)}</span></span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
