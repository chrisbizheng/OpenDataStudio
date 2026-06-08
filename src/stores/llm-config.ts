import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { LlmConfig } from "@/lib/agent-types"

interface LlmState {
  config: LlmConfig
  setConfig: (config: LlmConfig) => void
}

const defaultConfig: LlmConfig = {
  provider: "openai",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o",
}

export const useLlmStore = create<LlmState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      setConfig: (config) => set({ config }),
    }),
    { name: "llm-config" }
  )
)
