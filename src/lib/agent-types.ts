import type { VisualizationConfig } from "./chart-types"

export interface LlmConfig {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
}

export interface ChatContext {
  currentTable: string | null | undefined
  schema: { name: string; type: string; comment?: string }[]
  database: string | null | undefined
}

export interface AssistantMessage {
  role: "assistant"
  content: string
  sql?: string
  rows?: unknown[][]
  columns?: string[]
  visualization?: VisualizationConfig | null
  reasoning?: string
}

export type Message = { role: "user"; content: string } | AssistantMessage

export interface MessageUIState {
  thinkingExpanded?: boolean
  thinkingStartTime?: number
  thinkingElapsedMs?: number
}

export interface SSETokenFrame {
  t: "token"
  c: string
}

export interface SSEDoneFrame {
  t: "done"
  message: string
  sql: string | null
  rows: unknown[][]
  columns: string[]
  visualization: VisualizationConfig | null
  error?: string
  reasoning?: string
}

export interface SSEErrorFrame {
  t: "error"
  message: string
}

export type SSEFrame = SSETokenFrame | SSEDoneFrame | SSEErrorFrame
