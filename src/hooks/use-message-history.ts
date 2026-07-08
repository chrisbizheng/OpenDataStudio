"use client"

import { useRef, useEffect, useMemo, useCallback } from "react"
import { useAgentChatsStore, buildChatKey } from "@/stores/agent-chats"
import { useLang } from "@/components/lang-provider"
import { useAgentChatSessionStore } from "@/stores/agent-chat-session"
import type { Message, MessageUIState } from "@/lib/agent-types"

const EMPTY_MESSAGES: Message[] = []
const EMPTY_MESSAGE_UI: Record<number, MessageUIState> = {}

interface UseMessageHistoryParams {
  selectedDatabase?: string | null
  tableName?: string | null
}

export function useMessageHistory({
  selectedDatabase,
  tableName,
}: UseMessageHistoryParams) {
  const { _t } = useLang()
  const welcomeContent = _t("agent.welcome")
  const chatKey = useMemo(() => buildChatKey(selectedDatabase, tableName), [selectedDatabase, tableName])
  const setStoredConversation = useAgentChatsStore((s) => s.setConversation)
  const clearStoredConversation = useAgentChatsStore((s) => s.clearConversation)

  const welcomeMessage: Message = useMemo(
    () => ({ role: "assistant", content: welcomeContent }),
    [welcomeContent]
  )

  const messages = useAgentChatSessionStore((s) => s.sessions[chatKey]?.messages ?? EMPTY_MESSAGES)
  const messageUI = useAgentChatSessionStore((s) => s.sessions[chatKey]?.messageUI ?? EMPTY_MESSAGE_UI)
  const setMessages = useAgentChatSessionStore((s) => s.setMessages)
  const setMessageUI = useAgentChatSessionStore((s) => s.setMessageUI)
  const resetSession = useAgentChatSessionStore((s) => s.resetSession)

  const chatRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)
  const prevChatKeyRef = useRef(chatKey)
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true
      prevChatKeyRef.current = chatKey
      const stored = useAgentChatsStore.getState().conversations[chatKey]
      const next = stored && stored.length > 0 ? stored : [welcomeMessage]
      setMessages(chatKey, next)
      prevCountRef.current = next.length
      return
    }
    if (prevChatKeyRef.current === chatKey) return
    prevChatKeyRef.current = chatKey
    resetSession(chatKey)
    const stored = useAgentChatsStore.getState().conversations[chatKey]
    const next = stored && stored.length > 0 ? stored : [welcomeMessage]
    setMessages(chatKey, next)
    prevCountRef.current = next.length
  }, [chatKey, welcomeMessage, setMessages, resetSession])

  useEffect(() => {
    if (useAgentChatSessionStore.getState().sessions[chatKey]?.isLoading) return
    const isInitialOnly = messages.length === 1 && messages[0].role === "assistant" && messages[0].content === welcomeMessage.content
    if (isInitialOnly) return
    setStoredConversation(chatKey, messages)
  }, [messages, chatKey, welcomeMessage.content, setStoredConversation])

  useEffect(() => {
    if (messages.length !== prevCountRef.current) {
      prevCountRef.current = messages.length
      chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
    }
  }, [messages])

  const toggleThinking = useCallback((index: number) => {
    setMessageUI(chatKey, (prev) => {
      const existing = prev[index] ?? {}
      return { ...prev, [index]: { ...existing, thinkingExpanded: !existing.thinkingExpanded } }
    })
  }, [setMessageUI, chatKey])

  const clearConversation = useCallback(() => {
    clearStoredConversation(chatKey)
    setMessages(chatKey, [welcomeMessage])
    setMessageUI(chatKey, () => ({}))
    prevCountRef.current = 1
  }, [chatKey, clearStoredConversation, welcomeMessage, setMessages, setMessageUI])

  return {
    messages,
    messageUI,
    chatRef,
    toggleThinking,
    clearConversation,
  }
}
