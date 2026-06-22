"use client"

import { useCallback, useRef, useState } from "react"
import { useLlmStore } from "@/stores/llm-config"
import { appLog, getTraceId } from "@/lib/client-logger"
import { runChatSession } from "@/lib/agent-chat-session"
import type { AssistantMessage, Message, MessageUIState } from "@/lib/agent-types"
import { finalizeThinkingPanel, updatePlaceholderMessage } from "./use-stream-chat-helpers"

interface UseStreamChatParams {
  lang: "zh" | "en"
  tableName?: string | null
  schema?: { name: string; type: string; comment?: string }[]
  selectedDatabase?: string | null
  onSqlGenerated?: (sql: string) => void
  _t: (key: string) => string
  onMessagesChange: (messages: Message[]) => void
  onMessageUIChange: (updater: (prev: Map<number, MessageUIState>) => Map<number, MessageUIState>) => void
  getMessages: () => Message[]
  onLoadingChange?: (loading: boolean) => void
}

export function useStreamChat({
  lang,
  tableName,
  schema,
  selectedDatabase,
  onSqlGenerated,
  _t,
  onMessagesChange,
  onMessageUIChange,
  getMessages,
  onLoadingChange,
}: UseStreamChatParams) {
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const llmConfig = useLlmStore((s) => s.config)

  const sendMessage = useCallback(async (
    text: string,
    baseMessages?: Message[]
  ) => {
    if (!text.trim() || isLoading) return

    const prevMessages = baseMessages ?? getMessages()
    const userMsg: Message = { role: "user", content: text }
    const updated = [...prevMessages, userMsg]
    const placeholderIndex = updated.length
    let currentMessages: Message[] = [...updated, { role: "assistant", content: "" }]

    onMessagesChange(currentMessages)
    onMessageUIChange((prev) => {
      const next = new Map(prev)
      next.set(placeholderIndex, {
        thinkingExpanded: true,
        thinkingStartTime: Date.now(),
      })
      return next
    })
    setIsLoading(true)
    onLoadingChange?.(true)

    if (!llmConfig.apiKey) {
      onMessagesChange(currentMessages.slice(0, -1).concat([
        { role: "assistant", content: _t("agent.not_configured") }
      ]))
      onMessageUIChange((prev) => {
        const next = new Map(prev)
        next.delete(placeholderIndex)
        return next
      })
      setIsLoading(false)
      onLoadingChange?.(false)
      return
    }

    const traceId = getTraceId()
    appLog("[Agent]", traceId, "send:", text.slice(0, 80))

    const controller = new AbortController()
    abortRef.current = controller

    const session = runChatSession(
      {
        messages: updated,
        context: {
          currentTable: tableName,
          schema: schema ?? [],
          database: selectedDatabase,
        },
        lang,
      },
      {
        fetchSSE: async (url, init) => {
          const res = await fetch(url, { ...init, signal: controller.signal })
          if (!res.ok) {
            const err = await res.json().catch(() => ({ message: "Request failed" }))
            throw new Error(err.message || `Request failed: ${res.status}`)
          }
          return res.body as ReadableStream<Uint8Array>
        },
        getLlmConfig: () => llmConfig,
        getTraceId: () => traceId,
      }
    )

    let finalSql: string | null = null

    try {
      for await (const event of session) {
        if (controller.signal.aborted) break

        switch (event.type) {
          case "partial": {
            currentMessages = updatePlaceholderMessage(currentMessages, placeholderIndex, (m) => ({ ...m, content: event.message }) as AssistantMessage, onMessagesChange)
            break
          }

          case "done": {
            const finalContent = event.error
              ? `${event.message}\n\n⚠️ SQL ${_t("agent.sql_error") || "执行失败"}: ${event.error}`
              : event.message
            currentMessages = updatePlaceholderMessage(
              currentMessages,
              placeholderIndex,
              () => ({
                role: "assistant" as const,
                content: finalContent,
                sql: event.sql ?? undefined,
                rows: event.rows,
                columns: event.columns,
                visualization: event.visualization,
                reasoning: event.reasoning,
              }) satisfies AssistantMessage,
              onMessagesChange
            )
            finalSql = event.sql
            if (event.error) {
              appLog("[Agent]", getTraceId(), "sql-error:", event.error.slice(0, 200))
            }
            break
          }

          case "error": {
            if (controller.signal.aborted) break
            currentMessages = updatePlaceholderMessage(currentMessages, placeholderIndex, (m) => ({ ...m, content: event.message }) as AssistantMessage, onMessagesChange)
            break
          }
        }
      }

      // Post-loop: handle abort or empty response
      if (controller.signal.aborted) {
        const last = currentMessages[placeholderIndex] as AssistantMessage
        if (!last.content) {
          currentMessages = updatePlaceholderMessage(currentMessages, placeholderIndex, (m) => ({ ...m, content: _t("agent.stopped") }) as AssistantMessage, onMessagesChange)
        }
      } else {
        const last = currentMessages[placeholderIndex] as AssistantMessage | undefined
        if (last && !last.content) {
          currentMessages = updatePlaceholderMessage(currentMessages, placeholderIndex, (m) => ({ ...m, content: _t("agent.empty_response") || "服务器返回空响应，请重试" }) as AssistantMessage, onMessagesChange)
        }
      }

      if (finalSql && onSqlGenerated) {
        appLog("[Agent]", traceId, "done:", "sql:", finalSql.slice(0, 60))
        onSqlGenerated(finalSql)
      }

      finalizeThinkingPanel(placeholderIndex, onMessageUIChange)
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        const last = currentMessages[placeholderIndex] as AssistantMessage | undefined
        if (last && !last.content) {
          currentMessages = updatePlaceholderMessage(currentMessages, placeholderIndex, (m) => ({ ...m, content: _t("agent.stopped") }) as AssistantMessage, onMessagesChange)
        }
      } else {
        const errMsg = `${_t("agent.network_error") || "Network error"}: ${e instanceof Error ? e.message : "Unknown"}`
        const last = currentMessages[placeholderIndex] as AssistantMessage | undefined
        if (last) {
          currentMessages = updatePlaceholderMessage(currentMessages, placeholderIndex, (m) => ({ ...m, content: errMsg }) as AssistantMessage, onMessagesChange)
        } else {
          currentMessages = [...currentMessages, { role: "assistant" as const, content: errMsg }]
          onMessagesChange(currentMessages)
        }
      }
      finalizeThinkingPanel(placeholderIndex, onMessageUIChange)
    } finally {
      abortRef.current = null
      setIsLoading(false)
      onLoadingChange?.(false)
    }
  }, [isLoading, lang, tableName, schema, selectedDatabase, onSqlGenerated, _t, onMessagesChange, onMessageUIChange, onLoadingChange, getMessages, llmConfig])

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { isLoading, sendMessage, stopGeneration, abortRef }
}
