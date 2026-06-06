# Issue 4: SQL Console（Monaco Editor + 查询执行）

**Type:** AFK
**Blocked by:** #1
**User Stories:** 7, 8, 9, 10

---

## What to build

A full SQL console in the right panel with Monaco Editor, ClickHouse dialect support, query execution, and result export.

**End-to-end behavior:**
1. User navigates to the SQL tab (right panel, second tab named "SQL")
2. Editor shows a placeholder: `-- Write your SQL query here...`
3. User types `SELECT region, sum(sales) FROM real_anonymized_sales GROUP BY region`
4. User presses Cmd+Enter or clicks ▶ Run
5. Loading spinner appears in the editor toolbar
6. Results render in a table below the editor (reuse the data grid from Issue 2)
7. User clicks "📋 CSV" or "📋 JSON" to copy results
8. User clicks "SELECT * LIMIT 100" quick button to auto-fill the editor

### Implementation

- Install: `npm install @monaco-editor/react`
- **`src/components/sql-editor.tsx`** — Monaco Editor wrapper:
  - Height: 200px (resizable via drag handle)
  - Language: `sql` (default Monaco grammer handles basic SQL)
  - ClickHouse-specific keywords as `monarchTokensProvider` via `beforeMount`:
    ```typescript
    monaco.languages.setMonarchTokensProvider('sql', {
      keywords: [
        'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'LIMIT',
        'JOIN', 'LEFT', 'RIGHT', 'INNER', 'ON', 'AS', 'DISTINCT',
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ARRAY_JOIN',
        'QUANTILE', 'UNIQ', 'ANY', 'ALL', 'IN', 'EXISTS',
      ],
      // ... standard monarch config
    })
    ```
  - `Cmd+Enter` / `Ctrl+Enter` triggers execution
- **`src/components/sql-console.tsx`** — Parent component:
  - Toolbar with: ▶ Run, ⏹ Stop, 📋 CSV, 📋 JSON, ↔ Format (basic), "SELECT * LIMIT 100" quick button
  - Result area below editor: reuses `<DataGrid>` from Issue 2 with query results
  - Error display: red alert box with parsed ClickHouse error message
- **`src/stores/query.ts`** — Add SQL-specific state: `{ sql: string, results: QueryResult | null, isExecuting: boolean, executionTime: number }`
- **Result export:**
  - CSV: convert rows to CSV string using a simple `rows.map(r => r.join(','))` (handle commas/quotes in values)
  - JSON: `JSON.stringify(results.rows.map((r, i) => Object.fromEntries(results.columns.map((c, j) => [c, r[j]]))))`
  - Copy to clipboard via `navigator.clipboard.writeText()`
  - Toast notification: "Copied N rows as CSV"

## Acceptance criteria

- [ ] Monaco Editor renders with SQL syntax highlighting
- [ ] Cmd+Enter / Ctrl+Enter executes the query
- [ ] ▶ Run button executes the query
- [ ] "SELECT * LIMIT 100" auto-fills the editor and executes
- [ ] Results render in a table below the editor
- [ ] Loading spinner shows during execution
- [ ] SQL errors show a readable error message (not a raw ClickHouse stack trace)
- [ ] Copy as CSV copies properly formatted CSV to clipboard
- [ ] Copy as JSON copies JSON array to clipboard
- [ ] Clipboard copy shows a toast notification

## Blocked by

- #1: ClickHouse connection must exist for queries to execute