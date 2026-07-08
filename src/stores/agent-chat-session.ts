"use client"

import { create } from "zustand"
import type { Message, MessageUIState } from "@/lib/agent-types"

interface SessionState {
  messages: Message[]
  messageUI: Record<number, MessageUIState>
  isLoading: boolean
  aiInitialQuestions: string[] | null
  aiFollowUpQuestions: string[] | null
  isGeneratingInitialQuestions: boolean
  isGeneratingFollowUpQuestions: boolean
}

const defaultSession: SessionState = {
  messages: [],
  messageUI: {},
  isLoading: false,
  aiInitialQuestions: null,
  aiFollowUpQuestions: null,
  isGeneratingInitialQuestions: false,
  isGeneratingFollowUpQuestions: false,
}

interface AgentChatSessionState {
  sessions: Record<string, SessionState>
  getSession: (chatKey: string) => SessionState
  setMessages: (chatKey: string, m: Message[]) => void
  setMessageUI: (chatKey: string, updater: (prev: Record<number, MessageUIState>) => Record<number, MessageUIState>) => void
  setIsLoading: (chatKey: string, v: boolean) => void
  setAiInitialQuestions: (chatKey: string, q: string[] | null) => void
  setAiFollowUpQuestions: (chatKey: string, q: string[] | null) => void
  setIsGeneratingInitialQuestions: (chatKey: string, v: boolean) => void
  setIsGeneratingFollowUpQuestions: (chatKey: string, v: boolean) => void
  resetSession: (chatKey: string) => void
  clearSession: (chatKey: string) => void
}

export const useAgentChatSessionStore = create<AgentChatSessionState>((set, get) => ({
  sessions: {},
  getSession: (chatKey) => get().sessions[chatKey] ?? defaultSession,
  setMessages: (chatKey, m) => set((s) => ({
    sessions: { ...s.sessions, [chatKey]: { ...(s.sessions[chatKey] ?? defaultSession), messages: m } },
  })),
  setMessageUI: (chatKey, updater) => set((s) => {
    const prev = s.sessions[chatKey] ?? defaultSession
    return {
      sessions: { ...s.sessions, [chatKey]: { ...prev, messageUI: updater(prev.messageUI) } },
    }
  }),
  setIsLoading: (chatKey, v) => set((s) => ({
    sessions: { ...s.sessions, [chatKey]: { ...(s.sessions[chatKey] ?? defaultSession), isLoading: v } },
  })),
  setAiInitialQuestions: (chatKey, q) => set((s) => ({
    sessions: { ...s.sessions, [chatKey]: { ...(s.sessions[chatKey] ?? defaultSession), aiInitialQuestions: q } },
  })),
  setAiFollowUpQuestions: (chatKey, q) => set((s) => ({
    sessions: { ...s.sessions, [chatKey]: { ...(s.sessions[chatKey] ?? defaultSession), aiFollowUpQuestions: q } },
  })),
  setIsGeneratingInitialQuestions: (chatKey, v) => set((s) => ({
    sessions: { ...s.sessions, [chatKey]: { ...(s.sessions[chatKey] ?? defaultSession), isGeneratingInitialQuestions: v } },
  })),
  setIsGeneratingFollowUpQuestions: (chatKey, v) => set((s) => ({
    sessions: { ...s.sessions, [chatKey]: { ...(s.sessions[chatKey] ?? defaultSession), isGeneratingFollowUpQuestions: v } },
  })),
  resetSession: (chatKey) => set((s) => ({
    sessions: { ...s.sessions, [chatKey]: { ...defaultSession } },
  })),
  clearSession: (chatKey) => set((s) => {
    const next = { ...s.sessions }
    delete next[chatKey]
    return { sessions: next }
  }),
}))
