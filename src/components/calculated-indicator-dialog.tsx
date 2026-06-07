"use client"

import { useState, useCallback, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CalculatedIndicator } from "@/lib/pivot-sql"
import type { PivotIndicator } from "@/lib/pivot-sql"
import { validate } from "@/lib/expression"

interface CalculatedIndicatorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (indicator: CalculatedIndicator) => void
  existing?: CalculatedIndicator
  availableIndicators: PivotIndicator[]
  existingCalculated: CalculatedIndicator[]
}

type FormatType = "number" | "percent" | "currency"

const OPERATORS = ["+", "-", "*", "/", "(", ")"]
const FUNCTIONS = ["ROUND", "ABS", "COALESCE", "IF", "NULLIF"]

export function CalculatedIndicatorDialog({
  open,
  onOpenChange,
  onSave,
  existing,
  availableIndicators,
  existingCalculated,
}: CalculatedIndicatorDialogProps) {
  const [key, setKey] = useState(existing?.key ?? "")
  const [title, setTitle] = useState(existing?.title ?? "")
  const [expression, setExpression] = useState(existing?.expression ?? "")
  const [format, setFormat] = useState<FormatType>(existing?.format ?? "number")
  const [decimals, setDecimals] = useState(existing?.decimals ?? 2)
  const [mode, setMode] = useState<"visual" | "text">("text")
  const [errors, setErrors] = useState<string[]>([])

  const allIndicatorKeys = useMemo(
    () => [
      ...availableIndicators.map((i) => i.key),
      ...existingCalculated.filter((c) => c.key !== existing?.key).map((c) => c.key),
    ],
    [availableIndicators, existingCalculated, existing?.key]
  )

  const handleValidate = useCallback(() => {
    if (!expression.trim()) {
      setErrors(["表达式不能为空"])
      return false
    }
    const result = validate(expression, allIndicatorKeys)
    setErrors(result.errors)
    return result.valid
  }, [expression, allIndicatorKeys])

  const handleSave = useCallback(() => {
    if (!key.trim()) {
      setErrors(["指标 Key 不能为空"])
      return
    }
    if (!title.trim()) {
      setErrors(["指标名称不能为空"])
      return
    }
    if (!handleValidate()) return

    const deps = expression.match(/\[\[([^\]]+)\]\]/g)?.map((m) => m.slice(2, -2).trim()) ?? []

    onSave({
      key: key.trim(),
      title: title.trim(),
      expression: expression.trim(),
      dependIndicatorKeys: [...new Set(deps)],
      format,
      decimals,
    })
    onOpenChange(false)
    setKey("")
    setTitle("")
    setExpression("")
    setErrors([])
  }, [key, title, expression, format, decimals, handleValidate, onSave, onOpenChange])

  const insertRef = useCallback(
    (indicatorKey: string) => {
      setExpression((prev) => prev + `[[${indicatorKey}]]`)
    },
    []
  )

  const insertOp = useCallback((op: string) => {
    setExpression((prev) => prev + ` ${op} `)
  }, [])

  const insertFunc = useCallback((func: string) => {
    setExpression((prev) => prev + `${func}(`)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {existing ? "编辑计算指标" : "添加计算指标"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Key</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="profit_rate"
                className="h-7 text-xs"
                disabled={!!existing}
              />
            </div>
            <div>
              <Label className="text-xs">名称</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="利润率"
                className="h-7 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <button
              onClick={() => setMode("text")}
              className={`px-2 py-0.5 rounded ${mode === "text" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            >
              文本模式
            </button>
            <button
              onClick={() => setMode("visual")}
              className={`px-2 py-0.5 rounded ${mode === "visual" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            >
              可视化模式
            </button>
          </div>

          {mode === "text" ? (
            <div>
              <Label className="text-xs">表达式</Label>
              <textarea
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="[[profit_sum]] / [[sales_sum]]"
                className="w-full h-20 p-2 text-xs font-mono rounded border border-border bg-background resize-none focus:outline-none focus:border-ring"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {allIndicatorKeys.map((k) => (
                  <button
                    key={k}
                    onClick={() => insertRef(k)}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                  >
                    [[{k}]]
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs">表达式构建</Label>
              <div className="p-2 min-h-[80px] text-xs font-mono rounded border border-border bg-background whitespace-pre-wrap">
                {expression || <span className="text-muted-foreground">点击下方按钮构建表达式</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[10px] text-muted-foreground mr-1 self-center">指标:</span>
                {allIndicatorKeys.map((k) => (
                  <button
                    key={k}
                    onClick={() => insertRef(k)}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] text-muted-foreground mr-1 self-center">运算:</span>
                {OPERATORS.map((op) => (
                  <button
                    key={op}
                    onClick={() => insertOp(op)}
                    className="px-2 py-0.5 text-[10px] rounded bg-muted hover:bg-muted/80 font-mono"
                  >
                    {op}
                  </button>
                ))}
                <button
                  onClick={() => setExpression((p) => p + "  ")}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-muted hover:bg-muted/80"
                >
                  空格
                </button>
                <button
                  onClick={() => setExpression((p) => p.slice(0, -1))}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-muted hover:bg-muted/80"
                >
                  ⌫
                </button>
                <button
                  onClick={() => setExpression("")}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-muted hover:bg-muted/80"
                >
                  清空
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] text-muted-foreground mr-1 self-center">函数:</span>
                {FUNCTIONS.map((fn) => (
                  <button
                    key={fn}
                    onClick={() => insertFunc(fn)}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50"
                  >
                    {fn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="text-xs text-destructive space-y-0.5">
              {errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">格式</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as FormatType)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">数值</SelectItem>
                  <SelectItem value="percent">百分比</SelectItem>
                  <SelectItem value="currency">货币</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">小数位</Label>
              <Input
                type="number"
                value={decimals}
                onChange={(e) => setDecimals(Number(e.target.value))}
                min={0}
                max={10}
                className="h-7 text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
