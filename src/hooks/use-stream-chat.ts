"use client"

import { useCallback, useRef, useState } from "react"
import { useLlmStore } from "@/stores/llm-config"
import { appLog, getTraceId } from "@/lib/client-logger"
import { runChatSession, type ChatEvent } from "@/lib/agent-chat-session"
import type { AssistantMessage, Message, MessageUIState } from "@/lib/agent-types"

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

  const sendMessage = useCallback(async (
    text: string,
    baseMessages?: Message[]
  ) => {
    if (!text.trim() || isLoading) return

    const prevMessages = baseMessages ?? getMessages()
    const userMsg: Message = { role: "user", content: text }
    const updated = [...prevMessages, userMsg]
    const placeholderIndex = updated.length
    const initialMessages: Message[] = [...updated, { role: "assistant", content: "" }]

    onMessagesChange(initialMessages)
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

    try {
      const currentLlmConfig = useLlmStore.getState().config

      if (!currentLlmConfig.apiKey) {
        onMessagesChange(initialMessages.slice(0, -1).concat([
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
          getLlmConfig: () => currentLlmConfig,
          getTraceId: () => traceId,
        }
      )

      let finalSql: string | null = null
      let finalReasoning: string | undefined

      for await (const event of session) {
        if (controller.signal.aborted) break

        switch (event.type) {
          case "partial": {
            const msgs = getMessages()
            msgs[placeholderIndex] = { ...msgs[placeholderIndex], content: event.message } as AssistantMessage
            onMessagesChange([...msgs])
            break
          }

          case "done": {
            const msgs = getMessages()
            const finalContent = event.error
              ? `${event.message}\n\n⚠️ SQL ${_t("agent.sql_error") || "执行失败"}: ${event.error}`
              : event.message
            msgs[placeholderIndex] = {
              role: "assistant",
              content: finalContent,
              sql: event.sql ?? undefined,
              rows: event.rows,
              columns: event.columns,
              visualization: event.visualization,
              reasoning: event.reasoning,
            } satisfies AssistantMessage
            onMessagesChange([...msgs])
            finalSql = event.sql
            finalReasoning = event.reasoning
            if (event.error) {
              appLog("[Agent]", getTraceId(), "sql-error:", event.error.slice(0, 200))
            }
            break
          }

          case "error": {
            const msgs = getMessages()
            msgs[placeholderIndex] = { ...msgs[placeholderIndex], content: event.message } as AssistantMessage
            onMessagesChange([...msgs])
            break
          }
        }
      }

      if (controller.signal.aborted) {
        const msgs = getMessages()
        const last = msgs[placeholderIndex] as AssistantMessage
        if (!last.content) {
          msgs[placeholderIndex] = { ...last, content: _t("agent.stopped") } as AssistantMessage
          onMessagesChange([...msgs])
        }
      } else {
        const msgs = getMessages()
        const last = msgs[placeholderIndex] as AssistantMessage | undefined
        if (last && !last.content) {
          msgs[placeholderIndex] = { ...last, content: _t("agent.empty_response") || "服务器返回空响应，请重试" } as AssistantMessage
          onMessagesChange([...msgs])
        }
      }

      if (finalSql) {
        appLog("[Agent]", traceId, "done:", (getMessages()[placeholderIndex] as AssistantMessage)?.visualization?.type, "sql:", finalSql.slice(0, 60))
        if (onSqlGenerated) onSqlGenerated(finalSql)
      }

      onMessageUIChange((prev) => {
        const next = new Map(prev)
        const existing = next.get(placeholderIndex) ?? {}
        next.set(placeholderIndex, {
          thinkingExpanded: false,
          thinkingStartTime: existing.thinkingStartTime,
          thinkingElapsedMs: existing.thinkingStartTime ? Date.now() - existing.thinkingStartTime : undefined,
        })
        return next
      })
    } catch (e) {
      const currentMessages = getMessages()
      const last = currentMessages[placeholderIndex] as AssistantMessage | undefined
      if (e instanceof DOMException && e.name === "AbortError") {
        if (last && !last.content) {
          currentMessages[placeholderIndex] = { ...last, content: _t("agent.stopped") } as AssistantMessage
          onMessagesChange([...currentMessages])
        }
      } else {
        const errMsg = `${_t("agent.network_error") || "Network error"}: ${e instanceof Error ? e.message : "Unknown"}`
        if (last) {
          currentMessages[placeholderIndex] = { ...last, content: errMsg } as AssistantMessage
          onMessagesChange([...currentMessages])
        } else {
          onMessagesChange([...currentMessages, { role: "assistant", content: errMsg }])
        }
      }
      onMessageUIChange((prev) => {
        const next = new Map(prev)
        const existing = next.get(placeholderIndex) ?? {}
        next.set(placeholderIndex, {
          thinkingExpanded: false,
          thinkingStartTime: existing.thinkingStartTime,
          thinkingElapsedMs: existing.thinkingStartTime ? Date.now() - existing.thinkingStartTime : undefined,
        })
        return next
      })
    } finally {
      abortRef.current = null
      setIsLoading(false)
      onLoadingChange?.(false)
    }
  }, [isLoading, lang, tableName, schema, selectedDatabase, onSqlGenerated, _t, onMessagesChange, onMessageUIChange, getMessages])

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { isLoading, sendMessage, stopGeneration, abortRef }
}
