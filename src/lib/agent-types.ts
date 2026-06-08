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

export interface Message {
  role: "user" | "assistant"
  content: string
  sql?: string
  rows?: unknown[][]
  columns?: string[]
  visualization?: VisualizationConfig | null
  thinkingExpanded?: boolean
  streamingContent?: string
}

export interface VisualizationConfig {
  type: string
  config: {
    xKey: string
    yKey: string
    title?: string
    showLegend?: boolean
  }
}

export interface SSEEvent {
  type: "token" | "done" | "error"
  data: Record<string, unknown>
}
