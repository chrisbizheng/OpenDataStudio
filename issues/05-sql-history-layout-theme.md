# Issue 5: SQL 历史 + 三栏布局 + 主题切换

**Type:** AFK
**Blocked by:** #4
**User Stories:** 11, 18, 25, 22

---

## What to build

Polish the shell: query history persistence, a resizable three-panel layout, collapsible sidebar/right panel, and full dark/light theme support.

### Query History

- Every executed SQL query is saved to localStorage (key: `sql_history`)
- Max 20 entries, oldest evicted first
- History panel accessible from the SQL console toolbar (clock icon)
- Clicking a history entry auto-fills the editor (does NOT auto-execute)
- History entries show: SQL snippet (truncated to 80 chars) + timestamp + execution time
- Clear history button

### Three-Panel Layout

- CSS Grid layout: `grid-template-columns: [sidebar] auto [main] 1fr [right] 400px`
- Sidebar collapsible: toggle button in header ☰ → min-width 0 (animation: `grid-template-columns: 0px 1fr 400px`)
- Right panel collapsible: toggle button → same treatment
- Resizable dividers between panels (using a simple drag handle, no library needed — ~30 lines of custom logic)
- Save panel widths to localStorage

### Theme Toggle

- Integrate `next-themes` (already installed in Issue 1)
- Theme toggle button in header: 🌙 / ☀️ icon
- Options: System (default) / Light / Dark
- Theme persisted in localStorage
- All shadcn components should respond to theme correctly (they use Tailwind dark: variants)
- Custom dark mode colors for the data grid and Monaco Editor (Monaco has built-in `vs-dark` theme)

### Footer Bar

- Left: ClickHouse connection status (from Issue 1)
- Right: "23 tables · 95.92M rows total" (from table list data)

### Implementation

- **`src/stores/ui.ts`** — Zustand store: `{ sidebarOpen, rightPanelOpen, panelWidths: { sidebar, right }, theme }`
- **`src/stores/sql-history.ts`** — Zustand store with `persist` middleware:
  ```typescript
  interface SqlHistoryEntry {
    id: string
    sql: string
    timestamp: number
    executionTime: number
    tableName: string | null
  }
  ```
- **`src/components/header.tsx`** — App header: logo/text "Open Data Studio", ☰ sidebar toggle, theme toggle, ⚙️ settings (placeholder for Issue 6)
- **`src/components/resizable-panel.tsx`** — Generic resizable divider component
- **`src/components/sql-history.tsx`** — History panel (popover or dropdown from SQL toolbar)
- **`src/app/layout.tsx`** — Wire `ThemeProvider` from `next-themes`
- **`src/app/globals.css`** — Custom dark mode variables for data grid (alternating row colors, border colors)

## Acceptance criteria

- [ ] Query history saves to localStorage (max 20)
- [ ] History panel shows past queries with timestamps
- [ ] Clicking a history entry fills the editor
- [ ] Clear history button works
- [ ] ☰ button collapses/expands sidebar with animation
- [ ] Right panel collapse/expand toggle works
- [ ] Panel dividers are draggable to resize
- [ ] Theme toggle switches between Light/Dark/System
- [ ] Data grid looks correct in both themes
- [ ] Monaco Editor uses `vs-dark` in dark mode
- [ ] Panel widths persist across page reloads
- [ ] Footer bar shows connection status + table/row counts

## Blocked by

- #4: SQL console must exist for history to track queries