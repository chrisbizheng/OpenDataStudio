"use client"

import { useCallback, useState } from "react"
import { useLlmStore } from "@/stores/llm-config"
import { useChartDetailStore } from "@/stores/chart-detail"
import { suggestQuestions } from "@/lib/suggestions"
import { buildLlmHeaders } from "@/lib/llm-client"
import { getTraceId } from "@/lib/client-logger"
import type { AssistantMessage, LlmConfig } from "@/lib/agent-types"
import type { DeepDiveItem } from "@/lib/deep-dive-directions"

function buildAgentHeaders(
  llmConfig: LlmConfig,
  traceId: string
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...buildLlmHeaders(llmConfig),
    "x-trace-id": traceId,
  }
}

async function fetchAgentDirections(
  llmConfig: LlmConfig,
  params: {
    context: {
      currentTable?: string | null
      schema?: { name: string; type: string; comment?: string }[]
      database?: string | null
    }
    clicked: {
      key: string
      value: number
      row: Record<string, unknown>
      seriesName?: string
    }
    visualization: {
      type: string
      xKey: string
      yKey?: string
      series?: { yKey: string; label?: string; chartType?: string }[]
    }
    columns: string[]
    localDirections: { label: string; prompt: string }[]
    lang: string
  }
): Promise<{ label: string; prompt: string }[]> {
  const traceId = getTraceId()
  const res = await fetch("/api/agent/directions", {
    method: "POST",
    headers: buildAgentHeaders(llmConfig, traceId),
    body: JSON.stringify(params),
  })
  if (!res.ok) return []
  const json = (await res.json()) as {
    directions?: { label: string; prompt: string }[]
  }
  return (json.directions || []).slice(0, 4)
}

async function fetchAgentQuestions(
  llmConfig: LlmConfig,
  params: {
    context: {
      currentTable?: string | null
      schema?: { name: string; type: string; comment?: string }[]
      database?: string | null
    }
    localQuestions: string[]
    previousQuestion?: string
    sql?: string
    columns?: string[]
    lang: string
  }
): Promise<string[]> {
  const traceId = getTraceId()
  const res = await fetch("/api/agent/questions", {
    method: "POST",
    headers: buildAgentHeaders(llmConfig, traceId),
    body: JSON.stringify(params),
  })
  if (!res.ok) return []
  const json = (await res.json()) as { questions?: string[] }
  return (json.questions || []).slice(0, 5)
}

interface UseAiSuggestionsParams {
  tableName?: string | null
  schema?: { name: string; type: string; comment?: string }[]
  selectedDatabase?: string | null
  lang: "zh" | "en"
}

export function useAiSuggestions({
  tableName,
  schema,
  selectedDatabase,
  lang,
}: UseAiSuggestionsParams) {
  const llmConfig = useLlmStore((s) => s.config)
  const suggestions = schema && schema.length > 0 ? suggestQuestions(schema, lang) : []

  const setAiDirections = useChartDetailStore((s) => s.setAiDirections)
  const setGeneratingDirections = useChartDetailStore((s) => s.setGeneratingDirections)
  const [aiInitialQuestions, setAiInitialQuestions] = useState<string[] | null>(null)
  const [aiFollowUpQuestions, setAiFollowUpQuestions] = useState<string[] | null>(null)
  const [isGeneratingInitialQuestions, setIsGeneratingInitialQuestions] = useState(false)
  const [isGeneratingFollowUpQuestions, setIsGeneratingFollowUpQuestions] = useState(false)

  const generateAiDirections = useCallback(async (
    msg: AssistantMessage,
    item: DeepDiveItem,
    localDirections: { label: string; prompt: string }[]
  ) => {
    if (!msg.visualization || !msg.columns) return
    setGeneratingDirections(true)
    try {
      if (!llmConfig.apiKey) return
      const directions = await fetchAgentDirections(llmConfig, {
        context: { currentTable: tableName, schema: schema ?? [], database: selectedDatabase },
        clicked: item,
        visualization: {
          type: msg.visualization.type || "bar",
          xKey: msg.visualization.config.xKey,
          yKey: msg.visualization.config.yKey,
          series: msg.visualization.config.series,
        },
        columns: msg.columns,
        localDirections,
        lang,
      })
      if (directions.length) setAiDirections(directions)
    } finally {
      setGeneratingDirections(false)
    }
  }, [llmConfig, tableName, schema, selectedDatabase, lang, setAiDirections, setGeneratingDirections])

  const generateAiQuestions = useCallback(async (input: {
    localQuestions: string[]
    previousQuestion?: string
    sql?: string
    columns?: string[]
    target: "initial" | "followUp"
  }) => {
    const setLoading = input.target === "initial" ? setIsGeneratingInitialQuestions : setIsGeneratingFollowUpQuestions
    const setQuestions = input.target === "initial" ? setAiInitialQuestions : setAiFollowUpQuestions
    setLoading(true)
    try {
      if (!llmConfig.apiKey) return
      const questions = await fetchAgentQuestions(llmConfig, {
        context: { currentTable: tableName, schema: schema ?? [], database: selectedDatabase },
        localQuestions: input.localQuestions,
        previousQuestion: input.previousQuestion,
        sql: input.sql,
        columns: input.columns,
        lang,
      })
      if (questions.length) setQuestions(questions)
    } finally {
      setLoading(false)
    }
  }, [llmConfig, tableName, schema, selectedDatabase, lang])

  const clearSuggestions = useCallback(() => {
    setAiInitialQuestions(null)
    setAiFollowUpQuestions(null)
  }, [])

  return {
    suggestions,
    generateAiDirections,
    aiInitialQuestions,
    aiFollowUpQuestions,
    isGeneratingInitialQuestions,
    isGeneratingFollowUpQuestions,
    generateAiQuestions,
    clearSuggestions,
  }
}
