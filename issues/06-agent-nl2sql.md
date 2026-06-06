# Issue 6: Agent NL2SQL（流式对话 + SQL 工具调用）

**Type:** AFK
**Blocked by:** #1
**User Stories:** 12, 13, 16, 17

---

## What to build

The Agent tab — a ChatGPT-like chat panel where users ask natural language questions about their data, and the LLM generates and executes ClickHouse SQL automatically.

**End-to-end behavior:**
1. User clicks "Agent" tab in the right panel
2. Chat panel shows: "Ask me anything about your data. Try 'Show me the top 10 regions by sales'"
3. User types: "找出销售额最高的前 10 个地区"
4. LLM receives the current table schema as context, generates a ClickHouse SQL query
5. LLM calls the `execute_sql` tool → backend runs the query
6. LLM receives results → formats a natural language answer with a markdown table
7. Frontend renders: thinking indicator → markdown answer with inline table
8. User clicks "SQL" tab → Agent's generated SQL is auto-filled into the Monaco editor

### Implementation

**LLM Configuration (Settings Panel):**
- **`src/stores/llm.ts`** — Zustand store with `persist` (localStorage):
  ```typescript
  interface LlmConfig {
    provider: 'openai' | 'ollama'
    apiKey: string
    baseUrl: string
    model: string
  }
  // Defaults:
  //   provider: 'openai'
  //   apiKey: ''
  //   baseUrl: 'https://api.openai.com/v1'
  //   model: 'gpt-4o'
  ```
- **`src/components/settings-panel.tsx`** — Modal/dialog opened from ⚙️ in header:
  - Provider dropdown (OpenAI / Ollama)
  - API Key input (password field, masked)
  - Base URL input
  - Model name input
  - "Test Connection" button → sends `POST /api/agent/chat` with a simple test message, shows success/failure
  - Save/Cancel buttons

**Backend (`POST /api/agent/chat`):**
- **`src/app/api/agent/chat/route.ts`** — Streaming endpoint using Vercel AI SDK:
  ```typescript
  import { streamText, tool } from 'ai'
  import { z } from 'zod'
  ```
  - Reads `x-llm-config` header (base64 JSON): `{ provider, apiKey, baseUrl, model }`
  - Constructs the appropriate provider:
    - OpenAI: `createOpenAI({ apiKey, baseURL: baseUrl })`
    - Ollama: `createOllama({ baseURL: baseUrl })`
  - System prompt includes current table schema:
    ```
    You are a data analysis assistant connected to a ClickHouse database.
    Current table: {tableName}
    Schema: {columns.map(c => `${c.name}: ${c.type}`).join(', ')}

    Rules:
    1. When asked a question, generate a ClickHouse SQL query.
    2. Use the execute_sql tool to run the query.
    3. After getting results, explain them in natural language.
    4. Use ClickHouse-specific syntax where appropriate.
    5. Always LIMIT results — default to 100 unless specified.
    ```
  - Tool definition:
    ```typescript
    const executeSqlTool = tool({
      description: 'Execute a ClickHouse SQL query and return results',
      parameters: z.object({
        sql: z.string().describe('ClickHouse SQL to execute'),
      }),
      execute: async ({ sql }) => {
        const result = await clickhouseClient.query(sql)
        return {
          columns: result.columns,
          rows: result.rows,
          rowCount: result.rows.length,
        }
      },
    })
    ```
  - Returns `StreamTextResult` → frontend consumes via `useChat` from `ai/react`

**Frontend Chat:**
- Install: `npm install ai @ai-sdk/openai @ai-sdk/ollama`
- **`src/components/agent-chat.tsx`** — Chat panel:
  - Message list (scrollable, auto-scroll to bottom on new message)
  - Message renderers:
    - User message: right-aligned, gray bubble
    - Assistant message: left-aligned, markdown rendered with `react-markdown`
    - Tool call: collapsed "🔧 Executing SQL..." with expand to see raw SQL
    - Tool result: rendered as a data table (inline, max 20 rows with "Show all" toggle)
  - Input bar: textarea with Send button. Enter to send, Shift+Enter for newline
  - "Thinking..." indicator while LLM responds
  - "Generate data profile" quick-action button
- **`src/hooks/use-agent-chat.ts`** — Custom hook wrapping Vercel AI SDK's `useChat`:
  ```typescript
  import { useChat } from 'ai/react'
  ```
  - Passes `body: { context: { currentTable } }` with each message
  - Passes `headers: { 'x-llm-config': base64Config }`
  - Option `onToolCall` to handle the `execute_sql` tool result

**Auto-fill SQL:**
- When Agent finishes (last message has a tool call), store the generated SQL in a shared Zustand slice
- When user switches to SQL tab, check if `agentGeneratedSql` exists → pre-fill editor
- Clear `agentGeneratedSql` on user edit or new Agent query

## Acceptance criteria

- [ ] Settings panel opens from ⚙️ button, saves LLM config to localStorage
- [ ] "Test Connection" button verifies the LLM endpoint
- [ ] User types a question → Agent responds with thinking indicator
- [ ] Agent generates SQL and executes it via the `execute_sql` tool
- [ ] Tool result shows as an inline data table in the chat
- [ ] Agent's final answer renders markdown correctly
- [ ] Switching to SQL tab auto-fills the Agent's last generated SQL
- [ ] Error handling: invalid API key shows "Authentication failed" in chat
- [ ] Error handling: SQL execution error shows "Query failed: <message>" in chat
- [ ] Messages are not persisted across page reloads (session-only)

## Blocked by

- #1: ClickHouse connection must exist