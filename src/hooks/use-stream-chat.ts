"use client"

import { useCallback, useRef, useState } from "react"
import { useLlmStore } from "@/stores/llm-config"
import { appLog, getTraceId } from "@/lib/client-logger"
import { processStream } from "@/lib/agent-stream"
import { buildAgentHeaders } from "@/lib/agent-client"
import type { Message, MessageUIState } from "@/lib/agent-types"

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
    const initialMessages = [...updated, { role: "assistant" as const, content: "" }]

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

      const res = await fetch("/api/agent/chat", {
        method: "POST",
        signal: controller.signal,
        headers: buildAgentHeaders(currentLlmConfig, traceId),
        body: JSON.stringify({
          lang,
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          context: {
            currentTable: tableName,
            schema: schema ?? [],
            database: selectedDatabase,
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }))
        onMessagesChange(initialMessages.slice(0, -1).concat([
          { role: "assistant", content: `Error: ${err.message}` }
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

      const reader = res.body!.getReader()
      const result = await processStream(
        reader,
        initialMessages,
        (updatedMessages) => onMessagesChange(updatedMessages),
        controller.signal,
      )

      if (result.aborted) {
        onMessagesChange(getMessages().map((m, i) => {
          if (i === getMessages().length - 1 && !m.content) {
            return { ...m, content: _t("agent.stopped") }
          }
          return m
        }))
      }

      if (result.sql) {
        appLog("[Agent]", traceId, "done:", result.messages[placeholderIndex]?.visualization?.type, "sql:", result.sql.slice(0, 60))
        if (onSqlGenerated) onSqlGenerated(result.sql)
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
      if (e instanceof DOMException && e.name === "AbortError") {
        const currentMessages = getMessages()
        onMessagesChange(currentMessages.map((m, i) => {
          if (i === currentMessages.length - 1 && !m.content) {
            return { ...m, content: _t("agent.stopped") }
          }
          return m
        }))
        onMessageUIChange((prev) => {
          const next = new Map(prev)
          const pi = prev.size > 0 ? Math.max(...prev.keys()) : 0
          const existing = next.get(pi) ?? {}
          next.set(pi, {
            thinkingExpanded: false,
            thinkingStartTime: existing.thinkingStartTime,
            thinkingElapsedMs: existing.thinkingStartTime ? Date.now() - existing.thinkingStartTime : undefined,
          })
          return next
        })
      } else {
        onMessagesChange([
          ...getMessages(),
          { role: "assistant", content: `Network error: ${e instanceof Error ? e.message : "Unknown"}` },
        ])
      }
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
