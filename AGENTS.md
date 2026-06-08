# Open Data Studio — Agent Guide

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 语言要求

- 回复使用中文，思考使用中文
- 不要说"好的"、"当然"等无意义开场白，直接回答

## Developer Commands

```bash
npm run dev      # Dev server on port 4000 (NOT default 3000)
npm run build    # Production build (output: "standalone" for Docker)
npm run lint     # ESLint 9 flat config
```

**No `typecheck` or `test` scripts exist.** To type-check manually: `npx tsc --noEmit`. There is no test framework configured — do not assume Vitest/Jest/Playwright are available.

## 诊断流程（日志系统）

项目集成了 pino 日志 + 前端 localStorage 日志，agent 可直接读取日志文件诊断问题。

### 日志架构

```
前端 (client-logger.ts)  →  localStorage["ods_logs"]  →  📋 按钮下载 .txt
后端 (pino)              →  logs/app.log (JSON)        →  Read 工具直接读取
```

### 后端日志

- **库**: `pino` + `pino-pretty`（dev 模式终端彩色 + 文件写入）
- **文件**: `logs/app.log`（JSON 格式，每行一条）
- **配置**: `src/lib/logger.ts`
- **所有 API 路由已接入**:
  - `/api/databases` — 记录数据库数量
  - `/api/tables` — 记录表数量、database
  - `/api/tables/[name]/schema` — 记录表名、列数
  - `/api/query` — 记录 SQL、行数、列数、错误
  - `/api/agent/chat` — 记录 traceId、LLM 返回的 visualization/SQL、最终结果

### 前端日志

- **库**: `src/lib/client-logger.ts`
- **函数**: `appLog()` 写 console + localStorage，`downloadLogs()` 下载 .txt
- **AgentChat**: 每次发送请求生成 `traceId`（UUID），请求头带 `x-trace-id`
- **📋 按钮**: Agent 面板头部，点击下载前端日志

### TraceId 关联

前端 `sendMessage` 生成 `traceId` → 请求头 `x-trace-id` → 后端 `logger.child({ traceId })` → 所有日志共享同一 traceId。

### Agent 诊断步骤

1. **读取后端日志**:
   ```
   Read logs/app.log
   ```
   可按 traceId 过滤：`grep "traceId" logs/app.log`

2. **分析日志结构**:
   - `agent:chat:start` — 请求开始，记录 table/db
   - `agent:chat:llm-parsed` — LLM 返回的 SQL 和 visualization
   - `agent:chat:done` — 最终 visualization 类型、xKey、行数
   - `query:start` / `query:done` — SQL 执行详情
   - `schema:done` — 表结构加载

3. **常见问题诊断**:
   - **图表类型错误**: 查 `agent:chat:done` 的 `finalViz` 和 `xKey`
   - **SQL 执行失败**: 查 `query:error` 的 `err`
   - **数据为空**: 查 `query:done` 的 `rows` 是否为 0
   - **LLM 返回异常**: 查 `agent:chat:llm-parsed` 的 `viz` 和 `sql`

4. **前端日志**（需要用户配合）:
   - 用户点 📋 下载 `ods-log-*.txt`
   - 或打开浏览器 Console 查看 `[Agent]` 前缀日志

### 注意事项

- `logs/` 目录已加入 `.gitignore`
- 日志文件是 JSON 格式，可用 `jq` 过滤：`cat logs/app.log | jq '.traceId=="xxx"'`
- dev 模式下 pino-pretty 终端输出 info 级别，文件写入 debug 级别

## Architecture

Single-page ClickHouse data exploration workbench. Three-panel layout:

- **Sidebar** — database selector, table list, resizable schema section (drag handle, 80–600px), data source description below database selector.
- **Center** — two views toggled by tabs ("网格" / "透视"):
  - **Grid view**: SQL console (CodeMirror, w-80 left panel) + data grid (hand-rolled `<table>` + virtual scrolling on right).
  - **Pivot view**: pivot config panel (rows/columns/measures) + VTable pivot grid.
- **Right panel** — AgentChat only (no TabButton, no tabs).

```
Browser (React 19)  →  Next.js API routes  →  ClickHouse (HTTP :8123)
```

- **API routes** (`src/app/api/`) proxy all ClickHouse queries. Frontend never sees credentials.
- **5 Zustand stores** (`src/stores/`): `dataset`, `query`, `saved-queries`, `sql-history`, `ui`. Some use `persist` middleware (localStorage).
- **`src/stores/ui.ts`**: `activeTab` / `setActiveTab` removed — right panel is hard-wired to AgentChat. Old persisted `"schema"` value is ignored on rehydrate.
- **i18n**: custom `useLang()` hook + `src/lib/i18n.ts` dictionary (`zh` | `en`). Not next-intl.
- **Theme**: custom `ThemeProvider` in `src/components/theme-provider.tsx` — exports `{ theme, setTheme, resolved }`. Uses `resolved` (`"light"`/`"dark"`) for VTable / Chart keys.

## Key Conventions

- **Every component uses `"use client"`** — there is no server component usage in this project.
- **Path alias**: `@/*` maps to `./src/*`. Use `@/components/...`, `@/lib/...`, `@/stores/...`.
- **UI components**: shadcn/ui (`base-nova` style) in `src/components/ui/`. Primitives: `@/components/ui/dialog`, `@/components/ui/button`, etc. Styling: Tailwind CSS 4 + `cn()` utility from `@/lib/utils`.
- **Sidebar schema**: `src/components/sidebar.tsx` has resizable schema section (drag handle, `schemaHeight` state, range 80–600px) below table list, with independent scroll area.
- **`@tanstack/react-table` is installed but NOT used.** The data grid (`src/components/data-grid.tsx`) is hand-rolled HTML `<table>` + `@tanstack/react-virtual` for virtual scrolling. Do not import `@tanstack/react-table` for new features.
- **`@tanstack/react-virtual` IS actively used** for virtual scrolling in the data grid.
- **SQL formatting**: `sql-formatter` with `{ language: "clickhouse" }` — used in the agent chat route.

## ClickHouse Integration

- **Env vars**: `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DB` (see `.env.example`).
- **Client**: `src/lib/clickhouse.ts` — singleton `@clickhouse/client` with HTTP transport. Exports: `query()`, `getTables()`, `getTableSchema()`, `getDatabases()`, `getTotalRowCount()`.
- **Read-only enforcement**: `/api/query` route only allows `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, `WITH` prefixes. Returns 403 for anything else.
- **Query timeout**: 30 seconds (`max_execution_time` setting).

## Agent / LLM

- LLM config stored in browser `localStorage` under key `llm-config`.
- Sent to `/api/agent/chat` via `x-llm-config` header (base64-encoded JSON).
- Supports OpenAI-compatible and Ollama providers.
- Agent executes SQL server-side via the same `query()` function — also read-only enforced.

## Docker

```bash
docker compose up          # Starts app (port 4000) + ClickHouse
docker compose up clickhouse  # ClickHouse only (useful for local dev)
```

Dockerfile uses `output: "standalone"` — the production image runs `node server.js` directly.

## Project-Specific Notes

- **Monaco Editor** (`@monaco-editor/react`) for the SQL console, **CodeMirror** (`@uiw/react-codemirror`) for a secondary editor.
- **Recharts** for chart visualization (bar, line, area, pie, scatter, radar, radialBar, treemap, composed — 9 types). Charts support `onClick` for drill-down (detail card + AI follow-up), `CustomTooltip` with colored dots, `Legend`, `ReferenceLine` (average), `ReferenceDot` (max), and entrance animation.
- **`src/components/column-renderer.tsx`**: type-aware cell renderers for ClickHouse types (numbers, dates, arrays, nulls, booleans). Uses metric column detection by name pattern.
- **Demo data**: 23 ClickHouse tables, ~96M rows total. Key tables: `real_anonymized_sales` (29.4M), `dunnhumby_causal` (36.8M), `criteo_attribution` (16.5M).
- **Issue tracker**: local markdown files in `issues/` directory (01 through 08).
