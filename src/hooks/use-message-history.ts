"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { useAgentChatsStore, buildChatKey } from "@/stores/agent-chats"
import type { Message, MessageUIState } from "@/lib/agent-types"

interface UseMessageHistoryParams {
  selectedDatabase?: string | null
  tableName?: string | null
  welcomeContent: string
}

export function useMessageHistory({
  selectedDatabase,
  tableName,
  welcomeContent,
}: UseMessageHistoryParams) {
  const chatKey = useMemo(() => buildChatKey(selectedDatabase, tableName), [selectedDatabase, tableName])
  const storedConversation = useAgentChatsStore((s) => s.conversations[chatKey])
  const setStoredConversation = useAgentChatsStore((s) => s.setConversation)
  const clearStoredConversation = useAgentChatsStore((s) => s.clearConversation)

  const welcomeMessage: Message = useMemo(
    () => ({ role: "assistant", content: welcomeContent }),
    [welcomeContent]
  )

  const [messages, setMessages] = useState<Message[]>(
    () => storedConversation && storedConversation.length > 0 ? storedConversation : [welcomeMessage]
  )
  const [messageUI, setMessageUI] = useState<Map<number, MessageUIState>>(new Map())
  const chatRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)
  const prevChatKeyRef = useRef(chatKey)
  const hydratedRef = useRef(false)
  const isLoadingRef = useRef(false)

  const setIsLoadingRef = useCallback((v: boolean) => {
    isLoadingRef.current = v
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true
      prevChatKeyRef.current = chatKey
      return
    }
    if (prevChatKeyRef.current === chatKey) return
    prevChatKeyRef.current = chatKey
    if (isLoadingRef.current) return
    const next = storedConversation && storedConversation.length > 0 ? storedConversation : [welcomeMessage]
    setMessages(next)
    setMessageUI(new Map())
    prevCountRef.current = next.length
  }, [chatKey, storedConversation, welcomeMessage])

  useEffect(() => {
    if (isLoadingRef.current) return
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
    setMessageUI((prev) => {
      const next = new Map(prev)
      const existing = next.get(index) ?? {}
      next.set(index, { ...existing, thinkingExpanded: !existing.thinkingExpanded })
      return next
    })
  }, [])

  const clearConversation = useCallback(() => {
    clearStoredConversation(chatKey)
    setMessages([welcomeMessage])
    setMessageUI(new Map())
    prevCountRef.current = 1
  }, [chatKey, clearStoredConversation, welcomeMessage])

  const getMessages = useCallback(() => messages, [messages])

  return {
    messages,
    setMessages,
    messageUI,
    setMessageUI,
    chatRef,
    chatKey,
    welcomeMessage,
    toggleThinking,
    clearConversation,
    getMessages,
    setIsLoadingRef,
  }
}
