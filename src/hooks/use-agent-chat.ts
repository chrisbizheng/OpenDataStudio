"use client"

import { useState, useMemo, useCallback } from "react"
import { buildChatKey } from "@/stores/agent-chats"
import { useStreamChat } from "@/hooks/use-stream-chat"
import { useAiSuggestions } from "@/hooks/use-ai-suggestions"
import { useMessageHistory } from "@/hooks/use-message-history"

export function useAgentChat({
  tableName,
  schema,
  selectedDatabase,
  onSqlGenerated,
}: {
  tableName?: string | null
  schema?: { name: string; type: string; comment?: string }[]
  selectedDatabase?: string | null
  onSqlGenerated?: (sql: string) => void
}) {
  const [input, setInput] = useState("")
  const chatKey = useMemo(() => buildChatKey(selectedDatabase, tableName), [selectedDatabase, tableName])

  const history = useMessageHistory({
    selectedDatabase,
    tableName,
  })

  const ai = useAiSuggestions({
    chatKey,
    tableName,
    schema,
    selectedDatabase,
  })

  const stream = useStreamChat({
    chatKey,
    tableName,
    schema,
    selectedDatabase,
    onSqlGenerated,
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
    isGeneratingInitialQuestions: ai.isGeneratingInitialQuestions,
    chatRef: history.chatRef,
    abortRef: stream.abortRef,
    chatKey,
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
