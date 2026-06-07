# Issue 1: 项目脚手架 + ClickHouse 连接 + 表列表

**Type:** HITL
**Blocked by:** None - can start immediately
**User Stories:** 1, 20, 21, 22

---

## What to build

Initialize the Next.js project with all foundational dependencies, establish the ClickHouse connection from the backend, expose a table listing API, and render the table tree in the left sidebar.

**End-to-end behavior:**
1. User runs `npm run dev` → Next.js app starts
2. Backend connects to ClickHouse using env vars (host, port, user, password, db)
3. Sidebar fetches `GET /api/tables` → renders a scrollable list of all tables with row counts
4. Clicking a table name highlights it (no data grid yet — that's Issue 2)
5. A status indicator shows "Connected" or "Connection failed" in the footer bar

### Concrete setup steps (HITL - requires human execution):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npx shadcn@latest init
npx shadcn@latest add button scroll-area separator badge tooltip
npm install @clickhouse/client zustand next-themes
```

### Backend

- **`src/lib/clickhouse.ts`** — ClickHouse client singleton using `@clickhouse/client` with HTTP transport. Reads env vars `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DB`. Exports:
  ```typescript
  async function getTables(): Promise<TableMeta[]>
  async function getTableSchema(table: string): Promise<ColumnMeta[]>
  async function query(sql: string, params?: Record<string, unknown>): Promise<QueryResult>
  ```
- **`src/app/api/tables/route.ts`** — `GET /api/tables` → calls `getTables()`, returns `{ tables: { name: string, rowCount: number, engine: string }[] }`
- **`src/app/api/tables/[name]/schema/route.ts`** — `GET /api/tables/{name}/schema` → calls `getTableSchema(name)`, returns `{ columns: { name: string, type: string }[] }`

### Frontend

- **`src/stores/dataset.ts`** — Zustand store: `{ tables: TableMeta[], selectedTable: string | null, isLoading: boolean }`
- **`src/components/sidebar.tsx`** — Left sidebar panel. Calls `GET /api/tables` on mount. Renders a `<ScrollArea>` with `shadcn/button` for each table. Shows row count formatted (e.g., "36.8M"). Highlights selected table.
- **`src/components/status-bar.tsx`** — Footer bar showing "⬤ Connected" (green) or "⬤ Disconnected" (red). Fetches `GET /api/tables` on mount as a health check.
- **`src/app/page.tsx`** — Three-column CSS Grid layout skeleton: sidebar | main (empty) | right panel (empty)
- **`.env.local`** — Check in a `.env.example`, not the actual `.env.local`:
  ```
  CLICKHOUSE_HOST=127.0.0.1
  CLICKHOUSE_PORT=8123
  CLICKHOUSE_USER=default
  CLICKHOUSE_PASSWORD=your_clickhouse_password
  CLICKHOUSE_DB=default
  ```

## Acceptance criteria

- [ ] `npm run dev` starts without errors
- [ ] `GET /api/tables` returns the list of 23 demo tables from ClickHouse
- [ ] `GET /api/tables/{name}/schema` returns columns for a given table
- [ ] Sidebar renders the table list with correct row counts
- [ ] Clicking a table highlights it and updates `selectedTable` in store
- [ ] Status bar shows "⬤ Connected" when ClickHouse is reachable
- [ ] Status bar shows "⬤ Connection failed" with a readable message when unreachable
- [ ] Dark/Light theme toggle placeholder (just the button, actual toggle is Issue 5)

## Blocked by

None - can start immediately