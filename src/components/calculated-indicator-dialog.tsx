"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CalculatedIndicator, IndicatorFormat } from "@/lib/pivot-sql"
import type { PivotIndicator } from "@/lib/pivot-sql"
import { aggToSQL } from "@/lib/pivot-sql"
import type { ExpressionNode } from "@/lib/ast-types"
import { validate, migrateExpressionToAST, toSQL, astToSummary, cloneNode } from "@/lib/expression"
import { CH_FUNCTIONS, AGG_FUNCTIONS, CATEGORY_LABELS, type FuncCategory } from "@/lib/ch-functions"
import { getLocalRecommendations, type CalcRecommendation } from "@/lib/calc-recommendations"
import { useAiCalcRecommendation } from "@/hooks/use-ai-calc-recommendation"
import { useLang } from "@/components/lang-provider"
import type { ColumnMeta } from "@/lib/types"

interface CalculatedIndicatorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (indicator: CalculatedIndicator) => void
  existing?: CalculatedIndicator
  availableIndicators: PivotIndicator[]
  existingCalculated: CalculatedIndicator[]
  schema: ColumnMeta[]
  tableName: string
  database: string
}

function createEmptyLogic(): ExpressionNode {
  return { type: "literal", value: 0, dataType: "Int64" }
}

function generateCalcKey(
  title: string,
  indicators: PivotIndicator[],
  calculated: CalculatedIndicator[],
): string {
  let base = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
  if (!base) base = "calc"
  const allKeys = new Set([
    ...indicators.map((i) => i.key),
    ...calculated.map((c) => c.key),
  ])
  let candidate = base
  let counter = 0
  while (allKeys.has(candidate)) {
    counter++
    candidate = `${base}_${counter}`
  }
  return candidate
}

export function CalculatedIndicatorDialog({
  open,
  onOpenChange,
  onSave,
  existing,
  availableIndicators,
  existingCalculated,
  schema,
  tableName,
  database,
}: CalculatedIndicatorDialogProps) {
  const { _t, lang } = useLang()
  const [title, setTitle] = useState(existing?.title ?? "")
  const [logic, setLogic] = useState<ExpressionNode>(existing?.logic ?? createEmptyLogic())
  const [format, setFormat] = useState<IndicatorFormat>(existing?.format ?? "number")
  const [decimals, setDecimals] = useState(existing?.decimals ?? 2)
  const [errors, setErrors] = useState<string[]>([])
  const [textInput, setTextInput] = useState(() => astToSummary(existing?.logic ?? createEmptyLogic()))
  const [funcSearch, setFuncSearch] = useState("")
  const textFocused = useRef(false)
  const titleEdited = useRef(false)
  const textInputRef = useRef(textInput)
  textInputRef.current = textInput
  const skipNextBlur = useRef(false)

  const allIndicatorKeys = useMemo(
    () => [
      ...availableIndicators.map((i) => i.key),
      ...existingCalculated.filter((c) => c.key !== existing?.key).map((c) => c.key),
    ],
    [availableIndicators, existingCalculated, existing?.key]
  )

  const localRecommendations = useMemo(
    () => getLocalRecommendations(availableIndicators, existingCalculated),
    [availableIndicators, existingCalculated]
  )

  const ai = useAiCalcRecommendation({
    lang,
    availableIndicators,
    schema,
    tableName,
    database,
    allIndicatorKeys,
    _t,
  })

  useEffect(() => {
    if (!textFocused.current) {
      setTextInput(astToSummary(logic))
    }
  }, [logic])

  const handleTextBlur = useCallback(() => {
    textFocused.current = false
    if (skipNextBlur.current) {
      skipNextBlur.current = false
      return
    }
    const trimmed = textInput.trim()
    if (!trimmed) return
    const allFields = schema.map((c) => c.name)
    const indicatorKeys: Record<string, string> = {}
    for (const ind of availableIndicators) {
      indicatorKeys[ind.key] = ind.field
    }
    const parsed = migrateExpressionToAST(trimmed, indicatorKeys, allFields)
    setLogic(parsed.node)
    const migrationErrors = parsed.errors.length > 0 ? parsed.errors : []
    const validation = validate(parsed.node, allIndicatorKeys, allFields)
    setErrors([...migrationErrors, ...validation.errors])
  }, [textInput, schema, availableIndicators, allIndicatorKeys])

  const indicatorSQLMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const ind of availableIndicators) {
      map[ind.key] = aggToSQL(ind.aggregation, ind.field)
    }
    return map
  }, [availableIndicators])

  const schemaFields = useMemo(() => schema.map((c) => c.name), [schema])

  const sqlPreview = useMemo(() => {
    try {
      return toSQL(logic, indicatorSQLMap, { useAnyValue: true })
    } catch {
      return astToSummary(logic)
    }
  }, [logic, indicatorSQLMap])

  const filteredFunctions = useMemo(() => {
    if (!funcSearch.trim()) return CH_FUNCTIONS
    const q = funcSearch.toLowerCase()
    return CH_FUNCTIONS.filter((f) => f.name.toLowerCase().includes(q) || CATEGORY_LABELS[f.category].includes(q))
  }, [funcSearch])

  const aggButtonItems = useMemo(() => {
    const items: { func: string; col: { name: string } }[] = []
    for (const col of schema) {
      for (const func of AGG_FUNCTIONS) {
        items.push({ func, col })
      }
    }
    return items
  }, [schema])

  const sidePanelRef = useRef<HTMLDivElement>(null)
  const aggVirtualizer = useVirtualizer({
    count: aggButtonItems.length,
    getScrollElement: () => sidePanelRef.current,
    estimateSize: () => 24,
    overscan: 5,
  })

  const applyRecommendation = useCallback((recommendation: CalcRecommendation) => {
    textFocused.current = false
    titleEdited.current = false
    setTitle(recommendation.title)
    setLogic(recommendation.logic)
    setFormat(recommendation.format)
    setDecimals(recommendation.decimals)
    setErrors([])
  }, [])

  const handleAiGenerate = useCallback(async () => {
    const desc = ai.aiInput.trim()
    if (!desc) return
    const err = await ai.requestAiRecommendation(desc, applyRecommendation, false)
    if (err) setErrors([err])
  }, [ai, applyRecommendation])

  const handleAiSuggest = useCallback(async () => {
    const desc = ai.aiInput.trim()
    if (!desc) return
    const err = await ai.requestAiRecommendation(desc, applyRecommendation, true)
    if (err) setErrors([err])
  }, [ai, applyRecommendation])

  const handleValidate = useCallback(() => {
    const result = validate(logic, allIndicatorKeys, schemaFields)
    setErrors(result.errors)
    return result.valid
  }, [logic, allIndicatorKeys, schemaFields])

  const resetForm = useCallback(() => {
    titleEdited.current = false
    textFocused.current = false
    setTitle("")
    setLogic(createEmptyLogic())
    setTextInput(astToSummary(createEmptyLogic()))
    setErrors([])
  }, [])

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      setErrors([_t("calc_ind.name_required")])
      return
    }
    if (!handleValidate()) return

    const finalKey = existing
      ? existing.key
      : generateCalcKey(title, availableIndicators, existingCalculated)

    onSave({
      key: finalKey,
      title: title.trim(),
      logic,
      format,
      decimals,
    })
    resetForm()
    onOpenChange(false)
  }, [title, logic, format, decimals, handleValidate, existing, availableIndicators, existingCalculated, onSave, onOpenChange, resetForm])

  const isEmptyLogic = useCallback((node: ExpressionNode) =>
    node.type === "literal" && node.value === 0 && node.dataType === "Int64",
  [])

  const appendToLogic = useCallback((newNode: ExpressionNode) => {
    textFocused.current = false
    skipNextBlur.current = true
    const pendingText = textInputRef.current.trim()

    if (pendingText) {
      const allFields = schema.map((c) => c.name)
      const indicatorKeys: Record<string, string> = {}
      for (const ind of availableIndicators) {
        indicatorKeys[ind.key] = ind.field
      }
      const parsed = migrateExpressionToAST(pendingText, indicatorKeys, allFields)
      const migrationErrors = parsed.errors.length > 0 ? parsed.errors : []
      const validation = validate(parsed.node, allIndicatorKeys, allFields)
      setErrors([...migrationErrors, ...validation.errors])

      setLogic((prev) => {
        const base = parsed.node
        if (isEmptyLogic(prev)) return base
        if (isEmptyLogic(base)) return prev
        return { type: "call", func: "plus", args: [cloneNode(prev), cloneNode(base)] }
      })
    } else {
      setLogic((prev) => {
        if (isEmptyLogic(prev)) return newNode
        return { type: "call", func: "plus", args: [cloneNode(prev), newNode] }
      })
    }
  }, [isEmptyLogic, schema, availableIndicators, allIndicatorKeys])

  const insertRef = useCallback((indicatorKey: string) => {
    appendToLogic({ type: "ref", key: indicatorKey })
  }, [appendToLogic])

  const insertField = useCallback((fieldName: string) => {
    appendToLogic({ type: "field", name: fieldName })
  }, [appendToLogic])

  const insertAgg = useCallback((func: string, field: string) => {
    appendToLogic({ type: "agg", func, field })
  }, [appendToLogic])

  const insertCall = useCallback((funcName: string) => {
    const sig = CH_FUNCTIONS.find((f) => f.name === funcName)
    const args: ExpressionNode[] = (sig?.requiredParams ?? []).map(
      () => ({ type: "literal", value: 0, dataType: "Int64" }) as ExpressionNode
    )
    appendToLogic({ type: "call", func: funcName, args })
  }, [appendToLogic])

  const wrapWithOp = useCallback((op: "plus" | "minus" | "multiply" | "divide") => {
    textFocused.current = false
    setLogic((prev) => ({
      type: "call",
      func: op,
      args: [cloneNode(prev), { type: "literal", value: 0, dataType: "Int64" }],
    }))
  }, [])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-5xl max-w-[calc(100%-2rem)] max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {existing ? _t("calc_ind.edit_title") : _t("calc_ind.add_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {(localRecommendations.length > 0 || ai.aiRecommendations.length > 0) && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">{_t("calc_ind.recommendations")}</div>
              <div className="flex flex-wrap gap-1">
                {localRecommendations.map((rec) => (
                  <button
                    key={rec.key}
                    type="button"
                    aria-label={`应用推荐指标 ${rec.title}`}
                    onClick={() => applyRecommendation(rec)}
                    className="rounded border border-border bg-background px-2 py-1 text-xs transition-colors hover:bg-muted"
                  >
                    {rec.title}
                  </button>
                ))}
                {ai.aiRecommendations.map((rec) => (
                  <button
                    key={rec.key}
                    type="button"
                    aria-label={`应用AI推荐指标 ${rec.title}`}
                    onClick={() => applyRecommendation(rec)}
                    className="rounded border border-violet-200 bg-violet-50 px-2 py-1 text-xs text-violet-800 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200"
                  >
                    {rec.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <div>
              <Label className="text-xs">{_t("calc_ind.name")}</Label>
              <Input
                value={title}
                onChange={(e) => { titleEdited.current = true; setTitle(e.target.value) }}
                placeholder={_t("calc_ind.name_placeholder")}
                className="h-7 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Input
              value={ai.aiInput}
              onChange={(e) => ai.setAiInput(e.target.value)}
              placeholder={_t("calc_ind.ai_input_placeholder")}
              className="h-7 flex-1 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && ai.aiInput.trim()) {
                  handleAiGenerate()
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={ai.aiLoading || !ai.aiInput.trim()}
              onClick={handleAiGenerate}
            >
              {ai.aiLoading ? _t("agent.generating") : _t("calc_ind.ai_generate")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={ai.aiLoading || !ai.aiInput.trim()}
              onClick={handleAiSuggest}
            >
              {_t("calc_ind.ai_suggest")}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr_180px] gap-2 min-h-[240px]">
            <FieldPanel
              schema={schema}
              availableIndicators={availableIndicators}
              existingCalculated={existingCalculated}
              existing={existing}
              aggButtonItems={aggButtonItems}
              aggVirtualizer={aggVirtualizer}
              sidePanelRef={sidePanelRef}
              insertField={insertField}
              insertRef={insertRef}
              appendToLogic={appendToLogic}
              insertAgg={insertAgg}
              _t={_t}
            />

            {/* Expression Editor */}
            <div role="group" aria-label="表达式编辑" className="border border-border rounded p-2 flex flex-col gap-2">
              <div className="text-xs font-medium text-muted-foreground">{_t("calc_ind.expression")}</div>
              <textarea
                value={textInput}
                onChange={(e) => { textFocused.current = true; setTextInput(e.target.value) }}
                onFocus={() => { textFocused.current = true }}
                onBlur={handleTextBlur}
                placeholder="[[sales_sum]] - [[cost_sum]]"
                className="w-full h-20 p-2 text-xs font-mono rounded border border-border bg-background resize-none focus:outline-none focus:border-ring"
              />
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground mr-1 self-center">{_t("calc_ind.operators")}:</span>
                {(["plus", "minus", "multiply", "divide"] as const).map((op) => (
                  <button key={op} aria-label={`插入运算符 ${op}`} onClick={() => wrapWithOp(op)} className="px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80 font-mono">
                    {op === "plus" ? "+" : op === "minus" ? "-" : op === "multiply" ? "×" : "÷"}
                  </button>
                ))}
                <button aria-label={_t("calc_ind.clear_expression")} onClick={() => { textFocused.current = false; setLogic(createEmptyLogic()) }} className="px-1.5 py-1 text-xs rounded bg-muted hover:bg-muted/80">{_t("calc_ind.clear")}</button>
              </div>
            </div>

            <FunctionPanel
              funcSearch={funcSearch}
              setFuncSearch={setFuncSearch}
              filteredFunctions={filteredFunctions}
              insertCall={insertCall}
              _t={_t}
            />
          </div>

          <div className="rounded border border-border bg-muted/50 p-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">{_t("calc_ind.sql_preview")}</div>
            <code className="text-xs font-mono text-foreground break-all">
              {isEmptyLogic(logic) ? _t("calc_ind.build_expression_hint") : sqlPreview}
            </code>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{_t("calc_ind.format")}</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as IndicatorFormat)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">{_t("calc_ind.format_number")}</SelectItem>
                  <SelectItem value="percent">{_t("calc_ind.format_percent")}</SelectItem>
                  <SelectItem value="currency">{_t("calc_ind.format_currency")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{_t("calc_ind.decimals")}</Label>
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
            {_t("pivot.cancel")}
          </Button>
          <Button size="sm" onClick={handleSave}>
            {_t("pivot.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldPanel({
  schema, availableIndicators, existingCalculated, existing,
  aggButtonItems, aggVirtualizer, sidePanelRef,
  insertField, insertRef, appendToLogic, insertAgg,
  _t,
}: {
  schema: ColumnMeta[]
  availableIndicators: PivotIndicator[]
  existingCalculated: CalculatedIndicator[]
  existing?: CalculatedIndicator
  aggButtonItems: { func: string; col: { name: string } }[]
  aggVirtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>
  sidePanelRef: React.RefObject<HTMLDivElement | null>
  insertField: (f: string) => void
  insertRef: (k: string) => void
  appendToLogic: (n: ExpressionNode) => void
  insertAgg: (f: string, c: string) => void
  _t: (k: string) => string
}) {
  const hasNoItems = schema.length === 0 && availableIndicators.length === 0 && existingCalculated.filter((ci) => ci.key !== existing?.key).length === 0

  return (
    <div ref={sidePanelRef} role="group" aria-label="可用字段" className="border border-border rounded p-2 overflow-y-auto max-h-[240px]">
      <div className="text-xs font-medium text-muted-foreground mb-1">{_t("calc_ind.available_fields")}</div>
      {hasNoItems && (
        <div className="text-xs text-muted-foreground py-4 text-center">{_t("calc_ind.no_fields")}</div>
      )}
      {schema.length > 0 && (
        <div className="mb-1">
          <div className="text-xs text-muted-foreground mb-0.5">{_t("calc_ind.all_fields")}</div>
          {schema.map((col) => (
            <button key={col.name} aria-label={`插入字段 ${col.name}`} onClick={() => insertField(col.name)} className="w-full text-left px-1.5 py-1 text-xs rounded hover:bg-muted truncate">{col.name}</button>
          ))}
        </div>
      )}
      {availableIndicators.length > 0 && (
        <div className="mb-1">
          <div className="text-xs text-muted-foreground mb-0.5">{_t("calc_ind.existing_indicators")}</div>
          {availableIndicators.map((ind) => (
            <button key={ind.key} aria-label={`插入指标 ${ind.title}`} onClick={() => insertRef(ind.key)} className="w-full text-left px-1.5 py-1 text-xs rounded bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 truncate">{ind.title}</button>
          ))}
        </div>
      )}
      {existingCalculated.filter((ci) => ci.key !== existing?.key).length > 0 && (
        <div className="mb-1">
          <div className="text-xs text-muted-foreground mb-0.5">{_t("calc_ind.calculated_indicators")}</div>
          {existingCalculated.filter((ci) => ci.key !== existing?.key).map((calc) => (
            <button key={calc.key} aria-label={`插入计算指标 ${calc.title}`} onClick={() => appendToLogic(cloneNode(calc.logic))} className="w-full text-left px-1.5 py-1 text-xs rounded bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-700 dark:text-violet-300 truncate">{calc.title}</button>
          ))}
        </div>
      )}
      <div className="mt-1 pt-1 border-t border-border">
        <div className="text-xs text-muted-foreground mb-0.5">{_t("calc_ind.aggregation_window")}</div>
        {aggButtonItems.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2 text-center">{_t("calc_ind.no_measure_fields")}</div>
        ) : (
          <div style={{ height: aggVirtualizer.getTotalSize(), position: "relative" }}>
            {aggVirtualizer.getVirtualItems().map((virtualItem) => {
              const { func, col } = aggButtonItems[virtualItem.index]
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={aggVirtualizer.measureElement}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualItem.start}px)` }}
                >
                  <button aria-label={`插入聚合 ${func}(${col.name})`} onClick={() => insertAgg(func, col.name)} className="w-full text-left px-1.5 py-1 text-xs rounded bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 truncate">
                    {func === "COUNT_DISTINCT" ? "COUNT(DISTINCT " + col.name + ")" : func + "(" + col.name + ")"}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function FunctionPanel({
  funcSearch, setFuncSearch, filteredFunctions, insertCall, _t,
}: {
  funcSearch: string
  setFuncSearch: (v: string) => void
  filteredFunctions: typeof CH_FUNCTIONS
  insertCall: (name: string) => void
  _t: (k: string) => string
}) {
  return (
    <div role="group" aria-label="函数列表" className="border border-border rounded p-2 overflow-y-auto max-h-[240px]">
      <div className="text-xs font-medium text-muted-foreground mb-1">函数</div>
      <Input value={funcSearch} onChange={(e) => setFuncSearch(e.target.value)} placeholder={_t("calc_ind.search_functions")} className="h-6 text-xs mb-1" />
      {(["logic", "arithmetic", "string", "date", "array"] as FuncCategory[]).map((cat) => {
        const funcs = filteredFunctions.filter((f) => f.category === cat)
        if (funcs.length === 0) return null
        return (
          <div key={cat} className="mb-1">
            <div className="text-xs font-medium text-muted-foreground">{CATEGORY_LABELS[cat]}</div>
            {funcs.map((f) => (
              <button key={f.name} aria-label={`插入函数 ${f.name}`} onClick={() => insertCall(f.name)} className="w-full text-left px-1.5 py-1 text-xs rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-700 dark:text-violet-300 truncate">
                {f.name}({f.requiredParams.length})
              </button>
            ))}
          </div>
        )
      })}
      {filteredFunctions.length === 0 && (
        <div className="text-xs text-muted-foreground py-4 text-center">{_t("calc_ind.no_matching_functions")}</div>
      )}
    </div>
  )
}
