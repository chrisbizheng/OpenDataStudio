"use client"

import { useCallback, useState } from "react"
import { useLlmStore } from "@/stores/llm-config"
import { fetchAgentDirections, fetchAgentQuestions } from "@/lib/agent-client"
import { suggestQuestions } from "@/lib/suggestions"
import type { AssistantMessage } from "@/lib/agent-types"
import type { DeepDiveItem } from "@/lib/deep-dive-directions"

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

  const [aiDirections, setAiDirections] = useState<{ label: string; prompt: string }[] | null>(null)
  const [isGeneratingDirections, setIsGeneratingDirections] = useState(false)
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
    setIsGeneratingDirections(true)
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
      setIsGeneratingDirections(false)
    }
  }, [llmConfig, tableName, schema, selectedDatabase, lang])

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
    aiDirections,
    setAiDirections,
    isGeneratingDirections,
    generateAiDirections,
    aiInitialQuestions,
    aiFollowUpQuestions,
    isGeneratingInitialQuestions,
    isGeneratingFollowUpQuestions,
    generateAiQuestions,
    clearSuggestions,
  }
}
