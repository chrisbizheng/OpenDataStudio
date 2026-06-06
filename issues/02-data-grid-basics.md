# Issue 2: Data Grid 基础（虚拟滚动 + 列类型渲染）

**Type:** AFK
**Blocked by:** #1
**User Stories:** 2, 3, 6, 24

---

## What to build

When the user clicks a table in the sidebar, fetch the first 100 rows and render them in a virtual-scrolled data grid with column-type-aware styling.

**End-to-end behavior:**
1. User clicks "real_anonymized_sales" in the sidebar
2. Backend call: `POST /api/query { sql: "SELECT * FROM real_anonymized_sales LIMIT 100" }`
3. Frontend also calls `GET /api/tables/real_anonymized_sales/schema` for column metadata
4. Data grid renders 100 rows with virtual scrolling
5. Column rendering varies by type:
   - Int/Float → right-aligned, monospace, blue
   - String → left-aligned
   - DateTime/Date → locale-formatted
   - Array → collapsible tag pills
   - Nullable → "∅" badge when null

### Implementation

**Backend:**
- **`src/app/api/query/route.ts`** — `POST /api/query` accepts `{ sql: string }`, returns `{ columns: string[], rows: unknown[][], stats: { elapsed: number, rowsRead: number, bytesRead: number } }`. Uses the ClickHouse client's `query()` method. Returns 400 for invalid SQL with a parsed error message.

**Frontend:**
- Install: `npm install @tanstack/react-table @tanstack/react-virtual`
- **`src/stores/query.ts`** — Zustand store: `{ columns: string[], rows: unknown[][], isLoading: boolean, error: string | null }`
- **`src/components/data-grid.tsx`** — Main data grid component:
  - Uses `@tanstack/react-table` with `useReactTable()` and `getCoreRowModel()`
  - Virtual scrolling via `@tanstack/react-virtual` for both vertical and horizontal scroll
  - Columns defined dynamically from `columns` response
  - Row virtualizer configured for 1000px viewport height
- **`src/components/column-renderer.ts`** — Column rendering registry:
  ```typescript
  const RENDERERS: Record<string, ColumnRenderer> = {
    number: (value) => <span className="font-mono text-right text-blue-600 tabular-nums">{value}</span>,
    string: (value) => <span className="text-gray-900 dark:text-gray-100">{value ?? "∅"}</span>,
    date: (value) => <span>{new Date(value).toLocaleDateString()}</span>,
    array: (value) => <ColumnArray value={value} />,
    null: () => <span className="text-gray-400 dark:text-gray-600">∅</span>,
    boolean: (value) => value ? "✓" : "✗",
  }
  ```
  Type detection logic maps ClickHouse types to renderer keys:
  - `Int*|Float*|Decimal*` → `number`
  - `String|FixedString|Enum*` → `string`
  - `DateTime*|Date` → `date`
  - `Array(...)` → `array`
  - `Nullable(T)` → delegates to inner type's renderer, or `null` renderer when value is null
  - `Bool` → `boolean`
- **`src/app/page.tsx`** — Wire sidebar click → trigger data fetch → render data grid in center panel

## Acceptance criteria

- [ ] Clicking a table in sidebar fetches first 100 rows and renders in the grid
- [ ] Virtual scrolling works: only visible rows are in the DOM (check with DevTools)
- [ ] Int/Float columns are right-aligned, monospace, blue-colored
- [ ] String columns are left-aligned
- [ ] Date columns show locale-formatted dates
- [ ] NULL values show "∅" badge
- [ ] Array columns show collapsible tag pills
- [ ] Horizontal scrolling works for wide tables
- [ ] Loading state shows a skeleton/spinner
- [ ] Error state shows a readable message (e.g., "Table 'foo' not found")

## Blocked by

- #1: ClickHouse connection and table list must exist first