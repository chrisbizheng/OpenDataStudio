# PRD：Open Data Studio Workbench

**Version:** V1.0
**Date:** 2026-06-06
**Status:** Approved

---

## Problem Statement

Hugging Face Data Studio is the industry's best interactive dataset exploration tool, but its Viewer frontend and Agent backend are closed-source. Enterprises, research institutions, and individual developers need a self-hosted equivalent that works in air-gapped environments (intranet, private cloud) with customizable analysis logic (e.g., bring-your-own LLM as Agent).

Existing open-source alternatives either lack the polished UI/UX of Data Studio or require complex server-side infrastructure. Users want a single-page application that connects directly to their existing data warehouse (ClickHouse), provides a beautiful data grid, a SQL console, and an AI agent that understands natural language queries — all deployable via Docker in under 5 minutes.

---

## Solution

An open-source, self-hosted, premium-look data exploration workbench. It is a **Next.js** application with a **ClickHouse-native backend proxy**, delivering:

- **1:1 UI/UX replica** of Hugging Face Data Studio's three-panel layout
- **ClickHouse as primary data source** — queries execute server-side via HTTP API, results stream to the browser data grid
- **Monaco Editor SQL console** with syntax highlighting, auto-complete, query history
- **AI Agent tab** with NL2SQL, auto-visualization, and data profiling — powered by configurable LLM (OpenAI / Ollama)
- **Dark/Light mode**, virtual scrolling for million-row datasets, column-type-aware rendering

No data ever leaves the deployment environment unless the user explicitly connects an external LLM API.

---

## User Stories

1. As a data scientist, I want to browse all available tables in ClickHouse from a sidebar, so that I can quickly find the dataset I need.
2. As a data scientist, I want to select a table and see its first 100 rows in a virtual-scrolled data grid, so that I can preview data without writing SQL.
3. As a data scientist, I want each column to be rendered with its detected type (String, Number, Boolean, List, Struct), so that I can understand the schema at a glance.
4. As a data scientist, I want to click a column header to sort ascending/descending, so that I can quickly inspect value distributions.
5. As a data scientist, I want to filter rows by text search across all columns, so that I can find relevant records without writing WHERE clauses.
6. As a data scientist, I want the data grid to smoothly scroll through millions of rows without freezing the browser, so that I can explore large datasets interactively.
7. As an algorithm engineer, I want to write arbitrary SQL in a Monaco Editor and execute it against ClickHouse, so that I can run complex analytical queries.
8. As an algorithm engineer, I want SQL syntax highlighting and auto-complete for ClickHouse dialect, so that I can write queries faster with fewer errors.
9. As an algorithm engineer, I want a one-click "SELECT * LIMIT 100" button, so that I can quickly inspect a table without typing.
10. As an algorithm engineer, I want to copy query results as CSV or JSON with one click, so that I can export data for downstream processing.
11. As an algorithm engineer, I want my last 20 SQL queries saved in a history panel, so that I can recall and re-run previous analyses.
12. As a business analyst, I want to type natural language questions in an Agent chat panel, so that I can explore data without writing SQL.
13. As a business analyst, I want the Agent to generate and execute SQL automatically, returning results as a formatted table in the chat, so that I see answers inline.
14. As a business analyst, I want the Agent to suggest charts (bar, line, pie) when the result is visualizable, so that I can understand trends at a glance.
15. As a business analyst, I want to one-click generate a data profile report (missing values, mean, distribution) for any table, so that I can assess data quality quickly.
16. As a business analyst, I want the Agent's generated SQL to be auto-filled into the SQL tab when I switch, so that I can inspect or tweak the query manually.
17. As a power user, I want to configure my own LLM API key (OpenAI / Ollama endpoint) in the settings panel, so that I can use my preferred model.
18. As a power user, I want to toggle between Light and Dark themes that persist across sessions, so that I work comfortably in any environment.
19. As a devops engineer, I want to deploy the entire stack as a single Docker container with environment variables for ClickHouse connection, so that I can stand it up in 5 minutes.
20. As a devops engineer, I want to configure ClickHouse host, port, user, password via environment variables, so that credentials are not hard-coded.
21. As a security-conscious admin, I want to ensure no data is sent to external LLM services unless the user explicitly configures an API key, so that sensitive data stays in the network.
22. As a user, I want to see a clean "Connecting..." → "Connected" indicator for the ClickHouse connection status, so that I know the system is ready.
23. As a user, I want error messages to be human-readable (e.g., "Column 'foo' not found" instead of a raw ClickHouse stack trace), so that I can fix issues without reading logs.
24. As a user, I want the dataset tree in the sidebar to show table names and row counts, so that I can estimate data size before querying.
25. As a user, I want the sidebar to be collapsible, so that I can maximize the data grid when needed.

---

## Implementation Decisions

### Architecture: Backend Proxy over Direct Browser Connection

ClickHouse's HTTP API supports CORS, but exposing port 8123 directly to the browser is a security risk and complicates credential management. Instead, a **Next.js API route layer** proxies all ClickHouse queries:

```
Browser (React)  ──HTTP──>  Next.js API Route  ──HTTP──>  ClickHouse :8123
```

- The API route uses `@clickhouse/client` (official Node.js client) with HTTP transport
- ClickHouse credentials are read from environment variables (`CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DB`) at the API route level
- The frontend never sees the raw credentials
- Each SQL query is sent as `POST /api/query` with `{ sql: string, params?: Record<string, unknown> }` and returns `{ columns: string[], rows: unknown[][], stats: { elapsed: number, rows_read: number } }`

### Deep Modules

#### Module 1: `clickhouse-client` (backend utility)

A thin wrapper around `@clickhouse/client` that provides:

```typescript
interface ClickHouseClient {
  query(sql: string): Promise<QueryResult>
  getTables(): Promise<TableMeta[]>
  getTableSchema(table: string): Promise<ColumnMeta[]>
  getRowCount(table: string): Promise<number>
  queryWithStream(sql: string): AsyncIterable<Row[]>  // for large result sets
}

interface QueryResult {
  columns: string[]
  rows: unknown[][]
  stats: { elapsed: number; rowsRead: number; bytesRead: number }
}
```

This is a **deep module** — it encapsulates all ClickHouse-specific protocol details (HTTP transport, query formatting, error normalization, timeout handling) behind a simple interface. Testable in isolation by pointing at a test ClickHouse instance.

#### Module 2: `dataset-tree` (frontend component + hook)

- On mount: fetches `GET /api/tables` → loads table list with row counts into Zustand store
- Renders a collapsible tree with search/filter input
- Clicking a table triggers: `GET /api/tables/{name}/schema` + `POST /api/query { sql: "SELECT * FROM {name} LIMIT 100" }`
- Schema populates the column type registry in the data grid
- Row data populates the data grid store

#### Module 3: `data-grid` (frontend component)

- Built on `@tanstack/react-table` with `@tanstack/react-virtual` for virtual scrolling
- Column rendering registry:
  | ClickHouse type | Renderer |
  |---|---|
  | `Int*`, `Float*`, `Decimal*` | Right-aligned, monospace, blue color |
  | `String` | Left-aligned, gray |
  | `DateTime*`, `Date` | Locale-formatted date string |
  | `Array(...)` | Collapsible tag pills (click to expand) |
  | `Tuple`, `Nested` | JSON collapsible tree |
  | `Nullable(T)` | "∅" badge when null, type renderer when non-null |
  | `Bool` | Checkmark / cross icon |
- Sorting: `POST /api/query` with `ORDER BY col DESC LIMIT 100` — resets to server-side query
- Filtering: client-side text search across currently loaded rows

#### Module 4: `sql-console` (frontend component)

- Monaco Editor configured with ClickHouse SQL dialect (custom ` monarchTokensProvider` for ClickHouse functions: `arrayJoin`, `tuple`, `quantile`, etc.)
- Toolbar: ▶ Run (Cmd+Enter), ⏹ Stop, 📋 Copy as CSV, 📋 Copy as JSON, ↔ Format SQL
- History panel (Zustand store, persisted to localStorage, max 20)
- On execute: `POST /api/query` → results load into data grid below the editor
- Auto-fill from Agent: when user switches from Agent tab to SQL tab, the last Agent-generated SQL is pre-populated

#### Module 5: `agent` (frontend component + backend API)

**Frontend:**
- Chat panel with streaming message display (Markdown rendering for text, inline `<DataTable>` for tabular results, `<Chart>` for visualizations)
- Input bar with Send button (Enter to send, Shift+Enter for newline)
- System prompt context includes: current table schema (columns + types), ClickHouse SQL dialect notes, and instructions to ALWAYS output executable SQL wrapped in ```sql blocks
- Agent messages stored in Zustand + localStorage per session

**Backend (`POST /api/agent/chat`):**
- Accepts: `{ messages: Message[], context: { currentTable?: string, schema?: ColumnMeta[] } }`
- Uses Vercel AI SDK to stream LLM response
- Tool definition for `execute_sql`:
  ```json
  {
    "name": "execute_sql",
    "description": "Execute a ClickHouse SQL query and return results",
    "parameters": {
      "type": "object",
      "properties": {
        "sql": { "type": "string", "description": "ClickHouse SQL to execute" }
      },
      "required": ["sql"]
    }
  }
  ```
- LLM calls `execute_sql` → results injected into the response stream as a tool result
- Frontend renders the tool result as a formatted table
- LLM configuration: stored in browser `localStorage` under key `llm_config`:
  ```json
  { "provider": "openai" | "ollama", "apiKey": "...", "baseUrl": "...", "model": "gpt-4o" }
  ```
  The API route reads these from the request header `x-llm-config` (base64-encoded) on each call — no server-side persistence.
- Auto-visualization: the LLM's response includes a `visualization` field in the tool result metadata:
  ```json
  { "type": "bar" | "line" | "pie", "config": { "xKey": "...", "yKey": "..." } }
  ```

#### Module 6: `chart` (frontend component)

- Uses Recharts for rendering
- Accepts: `{ data: Row[], config: { type, xKey, yKey, title? } }`
- Renders interactive chart with hover tooltip, legend
- Chart type detection from Agent: the LLM recommends based on column types (categorical x → bar, temporal x → line, categorical both → stacked bar, single dimension + measure → pie)

#### Module 7: `layout` (frontend shell)

Three-panel layout using CSS Grid:

```
┌──────────────────────────────────────────┐
│  [☰] Open Data Studio    🌙 ⚙️          │  ← Header (40px)
├────────┬─────────────────┬───────────────┤
│        │                 │  Agent  │ SQL │
│ Table  │   Data Grid     │  Schema  │    │
│ Tree   │   (virtual      │ ───────────── │  ← Right Panel (400px)
│        │    scroll)       │  Chat /       │
│        │                 │  Editor       │
│        │                 │               │
├────────┴─────────────────┴───────────────┤
│   Status: Connected │ 95.92M rows total  │  ← Footer bar (24px)
└──────────────────────────────────────────┘
```

- Sidebar collapsible (min width 0, max 280px)
- Right panel collapsible (min width 0, max 480px)
- Zustand store: `{ sidebarOpen, rightPanelOpen, activeTab, theme, llmConfig }`
- Theme: `next-themes` with `system` default, persisted

### API Surface

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/tables` | — | `{ tables: { name, rowCount, engine }[] }` |
| GET | `/api/tables/{name}/schema` | — | `{ columns: { name, type }[] }` |
| POST | `/api/query` | `{ sql }` | `{ columns, rows, stats }` |
| POST | `/api/agent/chat` | `{ messages, context }` + `x-llm-config` header | `Stream<ChatCompletionChunk>` |

### Data Flow: Agent NL2SQL Scenario

```
1. User types: "top 10 regions by sales"
2. Frontend sends POST /api/agent/chat
   { messages: [{role:"user", content:"top 10 regions by sales"}],
     context: { currentTable: "real_anonymized_sales" } }
   + header x-llm-config: <base64 llm config>
3. Backend streams LLM response:
   - LLM thinks → returns tool_call: execute_sql({ sql: "SELECT region, sum(sales) as total FROM real_anonymized_sales GROUP BY region ORDER BY total DESC LIMIT 10" })
   - Backend executes query against ClickHouse
   - Returns tool_result with rows
   - LLM formats final answer with markdown + visualization suggestion
4. Frontend renders: markdown text + data table + chart (bar chart, x=region, y=total)
5. User clicks SQL tab → SQL auto-filled from Agent's last tool call
```

### ClickHouse Connection (Environment Variables)

```env
CLICKHOUSE_HOST=127.0.0.1
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=afUm4SOHIvGZnhnf
CLICKHOUSE_DB=default
```

These match the running podman ClickHouse instance with 23 demo tables (95.92M rows / 1.48 GiB).

### Error Handling Strategy

- **ClickHouse connection errors** (timeout, auth failure): API returns `{ error: "connection_failed", message: "Cannot connect to ClickHouse at {host}:{port}. Verify the server is running." }` Frontend shows a yellow banner at the top.
- **SQL syntax errors**: ClickHouse error message is parsed and re-wrapped: `{ error: "sql_error", message: "Syntax error at line 1, column 15: ...", details: { raw } }`. Frontend highlights the error location in Monaco Editor via marker API.
- **Agent LLM errors** (invalid API key, rate limit): Stream returns a special `error` chunk. Frontend shows inline error in the chat panel with a link to the Settings panel.
- **Timeout**: Backend enforces a 30s query timeout. Returns `{ error: "timeout", message: "Query exceeded 30 second limit. Try adding a LIMIT or filtering." }`.
- **Large result sets**: If result exceeds 10,000 rows, backend returns first 10,000 + `{ truncated: true, totalRows: n }`. Frontend shows "Showing 10,000 of 250,000 rows" with a "Load more" button.

---

## Testing Decisions

### Testing Philosophy

- Test external behavior, not implementation details
- Integration tests for the ClickHouse client against the real podman ClickHouse instance
- Component tests for the data grid, agent chat, and SQL editor using realistic fixture data
- No snapshot tests for charts (visual regression is out of scope for V1)

### Modules to Test

| Module | Test Type | Approach |
|--------|-----------|----------|
| `clickhouse-client` | Integration | Spin up test ClickHouse (or use the running podman instance), verify `query()`, `getTables()`, `getTableSchema()` return correct shapes. Test error cases: invalid SQL, timeout, connection refused. |
| `dataset-tree` | Component (Vitest + Testing Library) | Mock `GET /api/tables` response, render tree, verify table names appear. Click on table → verify schema fetch is called. |
| `data-grid` | Component | Pass mock column metadata + row data. Verify virtual scrolling renders visible rows only. Verify column type renderers (Number = right-aligned, Nullable = ∅ badge). |
| `sql-console` | Component | Mock `POST /api/query`. Type SQL, click Run → verify loading state, then result table. Verify history panel shows past queries. |
| `agent` | Component + Integration | Mock `POST /api/agent/chat` with streaming response. Verify messages render in order (user → assistant thinking → tool call → tool result → final answer). Verify chart component renders when visualization config is present. |
| `API routes` | Integration (Vitest + supertest) | Start Next.js in test mode. Call `/api/tables` → verify table list. Call `/api/query` with invalid SQL → verify error shape. |

### Prior Art

- The existing `nextanalysis` project at `/Users/chrisbi/Documents/KELI/workspaces/nextanalysis/` has a similar ClickHouse proxy pattern — its test structure can serve as reference
- Component tests follow the patterns established in `@shadcn/ui` examples: render → assert DOM → simulate interaction → assert updated state

---

## Out of Scope

- **Data upload / write-back**: V1 is read-only. Users cannot INSERT, UPDATE, DELETE, or CREATE TABLE through the UI.
- **Multi-user auth**: No login system. V1 assumes a single-user or trusted-network deployment. ClickHouse credentials are server-configured, not per-user.
- **Dashboard / saved reports**: No persistent dashboard. V1 is session-based exploration only.
- **Parquet / CSV / JSONL file upload**: ClickHouse is the exclusive data source in V1. File upload is deferred to V2.
- **S3 / Hugging Face Hub integration**: Deferred to V2.
- **Mobile responsiveness**: The layout is desktop-only (min 1280px width).
- **Server-side query caching**: Every query hits ClickHouse fresh. V1 does not implement result caching.
- **Multi-model LLM routing**: The Agent uses one LLM at a time (configured in settings). No automatic model selection based on task.
- **Export to Parquet**: Only CSV/JSON export from the SQL console. No structured data export.

---

## Further Notes

### Demo Data Source

The running ClickHouse instance (podman, container name `clickhouse`) contains 23 demo datasets totaling **95.92M rows / 1.48 GiB**. Notable tables:

| Table | Rows | Description |
|-------|------|-------------|
| `dunnhumby_causal` | 36.8M | Promotion causality |
| `real_anonymized_sales` | 29.4M | Anonymized sales records |
| `criteo_attribution` | 16.5M | Ad attribution |
| `salt_joined` | 2.3M | SAP wide table (joined) |
| `fmcg_multi_country` | 1.1M | Cross-country FMCG sales |

Connection details are in `podman-servers.md` — the default `.env` file in the project root should mirror these values.

### LLM Configuration UX

The Settings panel (gear icon in header) exposes:
- Provider dropdown: OpenAI / Ollama
- API Key input (masked, stored in localStorage)
- Base URL input (defaults to `https://api.openai.com/v1` for OpenAI, `http://localhost:11434/v1` for Ollama)
- Model name input (defaults: `gpt-4o` for OpenAI, `llama3` for Ollama)
- "Test Connection" button that sends a minimal chat request to verify the configuration

### Agent System Prompt Essentials

The system prompt sent to the LLM on every Agent request must include:

```
You are a data analysis assistant connected to a ClickHouse database.
Current table: {tableName}
Schema: {columns.map(c => `${c.name}: ${c.type}`).join(', ')}

Rules:
1. When asked a question, generate a ClickHouse SQL query.
2. Use the execute_sql tool to run the query.
3. After getting results, explain them in natural language.
4. If the result is suitable for visualization, include a visualization suggestion.
5. Use ClickHouse-specific syntax where appropriate (e.g., arrayJoin, tuple, quantile).
6. Always LIMIT results — default to 100 unless the user specifies otherwise.
```

### Docker Deployment

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/public ./public
COPY --from=base /app/package.json ./package.json

ENV CLICKHOUSE_HOST=clickhouse
ENV CLICKHOUSE_PORT=8123
ENV CLICKHOUSE_USER=default
ENV CLICKHOUSE_PASSWORD=afUm4SOHIvGZnhnf
ENV CLICKHOUSE_DB=default
ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "start"]
```
