"use client"

import { useState, useCallback } from "react"
import { useLlmStore } from "@/stores/llm-config"
import { buildLlmHeaders } from "@/lib/llm-client"
import { validate } from "@/lib/calculated-indicator-expression"
import type { PivotIndicator } from "@/lib/pivot-sql"
import type { TableRef } from "@/lib/types"
import type { CalcRecommendation } from "@/lib/calc-recommendations"

interface UseAiCalcRecommendationParams {
  lang: "zh" | "en"
  availableIndicators: PivotIndicator[]
  tableRef: TableRef
  allIndicatorKeys: string[]
  _t: (key: string) => string
}

export function useAiCalcRecommendation({
  lang,
  availableIndicators,
  tableRef,
  allIndicatorKeys,
  _t,
}: UseAiCalcRecommendationParams) {
  const { schema, tableName, database } = tableRef
  const llmConfig = useLlmStore((s) => s.config)
  const [aiInput, setAiInput] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRecommendations, setAiRecommendations] = useState<CalcRecommendation[]>([])

  const requestAiRecommendation = useCallback(async (
    description: string,
    apply: (rec: CalcRecommendation) => void,
    append: boolean,
  ) => {
    if (!llmConfig.apiKey) {
      return _t("calc_ind.llm_not_configured")
    }
    setAiLoading(true)
    try {
      const res = await fetch("/api/calc-indicator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildLlmHeaders(llmConfig),
        },
        body: JSON.stringify({
          lang,
          description,
          indicators: availableIndicators.map((indicator) => ({
            key: indicator.key,
            title: indicator.title,
            aggregation: indicator.aggregation,
            field: indicator.field,
          })),
          context: {
            currentTable: tableName,
            database,
            schema: schema.map((column) => ({ name: column.name, type: column.type, comment: column.comment })),
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || _t("calc_ind.ai_generate_failed"))
      const recommendation = json as CalcRecommendation
      if (!recommendation.logic || !recommendation.logic.type) throw new Error(_t("calc_ind.ai_format_error"))
      const validation = validate(recommendation.logic, allIndicatorKeys, schema.map((c) => c.name))
      if (!validation.valid) {
        return validation.errors.join("; ")
      }
      if (append) {
        setAiRecommendations((current) => [...current, recommendation])
      } else {
        apply(recommendation)
      }
    } catch (e) {
      return e instanceof Error ? e.message : _t("calc_ind.ai_generate_failed")
    } finally {
      setAiLoading(false)
    }
    return null
  }, [llmConfig, lang, availableIndicators, schema, tableName, database, allIndicatorKeys, _t])

  return { aiInput, setAiInput, aiLoading, aiRecommendations, requestAiRecommendation }
}
