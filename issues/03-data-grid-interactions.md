# Issue 3: Data Grid 交互（排序 + 筛选 + 加载更多）

**Type:** AFK
**Blocked by:** #2
**User Stories:** 4, 5

---

## What to build

Add column sorting, client-side text search filtering, and a "Load more" pagination to the data grid.

### Sorting

- Click a column header → toggle sort direction (none → ASC → DESC → none)
- Sort is server-side: sends `POST /api/query { sql: "SELECT * FROM table ORDER BY col DESC LIMIT 100" }`
- Active sort indicator shown in column header (▲/▼ arrow + highlighted column)

### Text Search Filter

- A search input above the data grid: "🔍 Search across all columns..."
- Client-side filtering across currently loaded rows (case-insensitive substring match on any column)
- As user types, rows filter in real-time
- "Showing N of M rows" counter updates live
- Debounced (300ms) to avoid excessive re-renders

### Load More

- A "Load next 100 rows" button at the bottom of the grid (only visible if not all rows have been loaded — ClickHouse doesn't expose total count easily, so always show it)
- Appends next batch to existing rows (cumulative, not replace)
- Shows "Loaded 200 rows" counter

### Implementation

- **`src/stores/query.ts`** — Add: `{ sortColumn: string | null, sortDirection: 'asc' | 'desc' | null, searchQuery: string, loadedRows: number, loadMore(): Promise<void> }`
- **`src/components/data-grid.tsx`** — Add sortable column headers, search bar, load more button
- Wire `onMouseDown` on column headers to toggle sort → fetch new data
- Wire search input to client-side filter using `useMemo`

## Acceptance criteria

- [ ] Clicking a column header sorts ASC on first click, DESC on second, removes sort on third
- [ ] Sorted column header shows ▲/▼ indicator
- [ ] Sort re-fetches data from server with `ORDER BY`
- [ ] Search input filters visible rows client-side
- [ ] Filtered row count updates as user types
- [ ] "Load more" button appends next 100 rows
- [ ] Loaded row counter is accurate
- [ ] Search + sort interact correctly (search filters the displayed sorted rows)

## Blocked by

- #2: Data grid must exist to add interactions