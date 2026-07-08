import { describe, it, expect, beforeEach } from "vitest"
import { useAgentChatSessionStore } from "../agent-chat-session"

describe("agent-chat-session store", () => {
  beforeEach(() => {
    useAgentChatSessionStore.setState({ sessions: {} })
  })

  it("getSession returns default for unknown chatKey", () => {
    const session = useAgentChatSessionStore.getState().getSession("unknown")
    expect(session.messages).toEqual([])
    expect(session.messageUI).toEqual({})
    expect(session.isLoading).toBe(false)
    expect(session.aiInitialQuestions).toBeNull()
    expect(session.aiFollowUpQuestions).toBeNull()
    expect(session.isGeneratingInitialQuestions).toBe(false)
    expect(session.isGeneratingFollowUpQuestions).toBe(false)
  })

  it("setMessages sets messages for a chatKey", () => {
    useAgentChatSessionStore.getState().setMessages("k1", [{ role: "user", content: "hi" }])
    expect(useAgentChatSessionStore.getState().getSession("k1").messages).toEqual([
      { role: "user", content: "hi" },
    ])
  })

  it("setMessageUI applies updater function", () => {
    useAgentChatSessionStore.getState().setMessageUI("k1", () => ({
      0: { thinkingExpanded: true },
    }))
    expect(useAgentChatSessionStore.getState().getSession("k1").messageUI).toEqual({
      0: { thinkingExpanded: true },
    })
  })

  it("setIsLoading sets loading flag", () => {
    useAgentChatSessionStore.getState().setIsLoading("k1", true)
    expect(useAgentChatSessionStore.getState().getSession("k1").isLoading).toBe(true)
  })

  it("setAiInitialQuestions sets questions", () => {
    useAgentChatSessionStore.getState().setAiInitialQuestions("k1", ["q1", "q2"])
    expect(useAgentChatSessionStore.getState().getSession("k1").aiInitialQuestions).toEqual(["q1", "q2"])
  })

  it("setAiFollowUpQuestions sets questions", () => {
    useAgentChatSessionStore.getState().setAiFollowUpQuestions("k1", ["q3"])
    expect(useAgentChatSessionStore.getState().getSession("k1").aiFollowUpQuestions).toEqual(["q3"])
  })

  it("setIsGeneratingInitialQuestions sets flag", () => {
    useAgentChatSessionStore.getState().setIsGeneratingInitialQuestions("k1", true)
    expect(useAgentChatSessionStore.getState().getSession("k1").isGeneratingInitialQuestions).toBe(true)
  })

  it("setIsGeneratingFollowUpQuestions sets flag", () => {
    useAgentChatSessionStore.getState().setIsGeneratingFollowUpQuestions("k1", true)
    expect(useAgentChatSessionStore.getState().getSession("k1").isGeneratingFollowUpQuestions).toBe(true)
  })

  it("per-chatKey isolation — 2 keys do not interfere", () => {
    useAgentChatSessionStore.getState().setMessages("k1", [{ role: "user", content: "k1-msg" }])
    useAgentChatSessionStore.getState().setMessages("k2", [{ role: "user", content: "k2-msg" }])
    useAgentChatSessionStore.getState().setIsLoading("k1", true)

    expect(useAgentChatSessionStore.getState().getSession("k1").messages[0].content).toBe("k1-msg")
    expect(useAgentChatSessionStore.getState().getSession("k1").isLoading).toBe(true)
    expect(useAgentChatSessionStore.getState().getSession("k2").messages[0].content).toBe("k2-msg")
    expect(useAgentChatSessionStore.getState().getSession("k2").isLoading).toBe(false)
  })

  it("resetSession resets specific chatKey to defaults but preserves others", () => {
    useAgentChatSessionStore.getState().setMessages("k1", [{ role: "user", content: "keep" }])
    useAgentChatSessionStore.getState().setMessages("k2", [{ role: "user", content: "reset-me" }])
    useAgentChatSessionStore.getState().setIsLoading("k2", true)

    useAgentChatSessionStore.getState().resetSession("k2")

    expect(useAgentChatSessionStore.getState().getSession("k2").messages).toEqual([])
    expect(useAgentChatSessionStore.getState().getSession("k2").isLoading).toBe(false)
    // k1 untouched
    expect(useAgentChatSessionStore.getState().getSession("k1").messages[0].content).toBe("keep")
  })

  it("clearSession deletes chatKey entirely", () => {
    useAgentChatSessionStore.getState().setMessages("k1", [{ role: "user", content: "temp" }])
    useAgentChatSessionStore.getState().clearSession("k1")

    // After clear, getSession returns default (chatKey no longer in sessions map)
    const session = useAgentChatSessionStore.getState().getSession("k1")
    expect(session.messages).toEqual([])
    expect(useAgentChatSessionStore.getState().sessions).not.toHaveProperty("k1")
  })
})
