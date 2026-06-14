"use client"

import { useState, useCallback } from "react"
import { useStreamChat } from "@/hooks/use-stream-chat"
import { useAiSuggestions } from "@/hooks/use-ai-suggestions"
import { useMessageHistory } from "@/hooks/use-message-history"

export function useAgentChat({
  tableName,
  schema,
  selectedDatabase,
  onSqlGenerated,
  lang,
  welcomeContent,
  _t,
}: {
  tableName?: string | null
  schema?: { name: string; type: string; comment?: string }[]
  selectedDatabase?: string | null
  onSqlGenerated?: (sql: string) => void
  lang: "zh" | "en"
  welcomeContent: string
  _t: (key: string) => string
}) {
  const [input, setInput] = useState("")

  const history = useMessageHistory({
    selectedDatabase,
    tableName,
    welcomeContent,
  })

  const ai = useAiSuggestions({
    tableName,
    schema,
    selectedDatabase,
    lang,
  })

  const stream = useStreamChat({
    lang,
    tableName,
    schema,
    selectedDatabase,
    onSqlGenerated,
    _t,
    onMessagesChange: history.setMessages,
    onMessageUIChange: history.setMessageUI,
    getMessages: history.getMessages,
    onLoadingChange: history.setIsLoadingRef,
  })

  const clearConversation = useCallback(() => {
    history.clearConversation()
    ai.clearSuggestions()
  }, [history, ai])

  const generateProfile = useCallback(async () => {
    if (!tableName) return
    await stream.sendMessage(
      `Generate a data profile for the table "${tableName}". Run queries to get: total row count, column count, and for each column: null count, min/max/avg for numeric types, distinct count for string types.`
    )
  }, [tableName, stream])

  const sendMessage = useCallback((text: string, baseMessages?: import("@/lib/agent-types").Message[]) => {
    ai.clearSuggestions()
    stream.sendMessage(text, baseMessages)
  }, [ai, stream])

  return {
    messages: history.messages,
    messageUI: history.messageUI,
    input,
    isLoading: stream.isLoading,
    suggestions: ai.suggestions,
    aiInitialQuestions: ai.aiInitialQuestions,
    aiFollowUpQuestions: ai.aiFollowUpQuestions,
    isGeneratingInitialQuestions: ai.isGeneratingInitialQuestions,
    isGeneratingFollowUpQuestions: ai.isGeneratingFollowUpQuestions,
    chatRef: history.chatRef,
    abortRef: stream.abortRef,
    setInput,
    sendMessage,
    stopGeneration: stream.stopGeneration,
    clearConversation,
    generateProfile,
    toggleThinking: history.toggleThinking,
    generateAiDirections: ai.generateAiDirections,
    generateAiQuestions: ai.generateAiQuestions,
  }
}
