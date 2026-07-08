"use client"

import { useCallback, useRef, useEffect } from "react"
import { useLlmStore } from "@/stores/llm-config"
import { useLang } from "@/components/lang-provider"
import { useAgentChatSessionStore } from "@/stores/agent-chat-session"
import { appLog, getTraceId } from "@/lib/client-logger"
import { runChatSession } from "@/lib/agent-chat-session"
import type { AssistantMessage, Message } from "@/lib/agent-types"
import { finalizeThinkingPanel, updatePlaceholderMessage } from "./use-stream-chat-helpers"

interface UseStreamChatParams {
  chatKey: string
  tableName?: string | null
  schema?: { name: string; type: string; comment?: string }[]
  selectedDatabase?: string | null
  onSqlGenerated?: (sql: string) => void
}

export function useStreamChat({
  chatKey,
  tableName,
  schema,
  selectedDatabase,
  onSqlGenerated,
}: UseStreamChatParams) {
  const { lang, _t } = useLang()
  const isLoading = useAgentChatSessionStore((s) => s.sessions[chatKey]?.isLoading ?? false)
  const setIsLoading = useAgentChatSessionStore((s) => s.setIsLoading)
  const abortRef = useRef<AbortController | null>(null)
  const llmConfig = useLlmStore((s) => s.config)

  // Abort stream on table/db change
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [tableName, selectedDatabase])

  const sendMessage = useCallback(async (
    text: string,
    baseMessages?: Message[]
  ) => {
    if (!text.trim() || isLoading) return

    const store = useAgentChatSessionStore.getState()
    const prevMessages = baseMessages ?? store.sessions[chatKey]?.messages ?? []
    const userMsg: Message = { role: "user", content: text }
    const updated = [...prevMessages, userMsg]
    const placeholderIndex = updated.length
    let currentMessages: Message[] = [...updated, { role: "assistant", content: "" }]

    store.setMessages(chatKey, currentMessages)
    store.setMessageUI(chatKey, (prev) => ({
      ...prev,
      [placeholderIndex]: { thinkingExpanded: true, thinkingStartTime: Date.now() },
    }))
    setIsLoading(chatKey, true)

    if (!llmConfig.apiKey) {
      currentMessages = currentMessages.slice(0, -1).concat([
        { role: "assistant", content: _t("agent.not_configured") }
      ])
      store.setMessages(chatKey, currentMessages)
      store.setMessageUI(chatKey, (prev) => {
        const next = { ...prev }
        delete next[placeholderIndex]
        return next
      })
      setIsLoading(chatKey, false)
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
            currentMessages = updatePlaceholderMessage(currentMessages, placeholderIndex, (m) => ({ ...m, content: event.message }) as AssistantMessage, chatKey)
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
              chatKey,
            )
            finalSql = event.sql
            if (event.error) {
              appLog("[Agent]", getTraceId(), "sql-error:", event.error.slice(0, 200))
            }
            break
          }

          case "error": {
            if (controller.signal.aborted) break
            currentMessages = updatePlaceholderMessage(currentMessages, placeholderIndex, (m) => ({ ...m, content: event.message }) as AssistantMessage, chatKey)
            break
          }
        }
      }

      // Post-loop: handle abort or empty response
      if (controller.signal.aborted) {
        const last = currentMessages[placeholderIndex] as AssistantMessage
        if (!last.content) {
          currentMessages = updatePlaceholderMessage(currentMessages, placeholderIndex, (m) => ({ ...m, content: _t("agent.stopped") }) as AssistantMessage, chatKey)
        }
      } else {
        const last = currentMessages[placeholderIndex] as AssistantMessage | undefined
        if (last && !last.content) {
          currentMessages = updatePlaceholderMessage(currentMessages, placeholderIndex, (m) => ({ ...m, content: _t("agent.empty_response") || "服务器返回空响应，请重试" }) as AssistantMessage, chatKey)
        }
      }

      if (finalSql && onSqlGenerated) {
        appLog("[Agent]", traceId, "done:", "sql:", finalSql.slice(0, 60))
        onSqlGenerated(finalSql)
      }

      finalizeThinkingPanel(placeholderIndex, chatKey)
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        const last = currentMessages[placeholderIndex] as AssistantMessage | undefined
        if (last && !last.content) {
          currentMessages = updatePlaceholderMessage(currentMessages, placeholderIndex, (m) => ({ ...m, content: _t("agent.stopped") }) as AssistantMessage, chatKey)
        }
      } else {
        const errMsg = `${_t("agent.network_error") || "Network error"}: ${e instanceof Error ? e.message : "Unknown"}`
        const last = currentMessages[placeholderIndex] as AssistantMessage | undefined
        if (last) {
          currentMessages = updatePlaceholderMessage(currentMessages, placeholderIndex, (m) => ({ ...m, content: errMsg }) as AssistantMessage, chatKey)
        }
      }
      finalizeThinkingPanel(placeholderIndex, chatKey)
    } finally {
      abortRef.current = null
      setIsLoading(chatKey, false)
    }
  }, [isLoading, lang, tableName, schema, selectedDatabase, onSqlGenerated, _t, llmConfig, setIsLoading, chatKey])

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { isLoading, sendMessage, stopGeneration, abortRef }
}
