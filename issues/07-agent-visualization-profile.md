# Issue 7: Agent 自动可视化 + 数据画像

**Type:** AFK
**Blocked by:** #6
**User Stories:** 14, 15

---

## What to build

Extend the Agent's capabilities: automatic chart rendering when results are visualizable, and a one-click data profile report.

### Auto-Visualization

When the LLM agent returns query results that are suitable for a chart, the frontend renders the appropriate chart inline.

**How it works:**

1. The LLM's tool response includes a metadata field for visualization:
   ```json
   {
     "type": "bar" | "line" | "pie",
     "config": {
       "xKey": "region",
       "yKey": "total_sales",
       "title": "Top 10 Regions by Sales"
     }
   }
   ```
2. The frontend's `onToolCall` handler reads this metadata and renders a chart below the data table
3. Supported chart types:
   - **Bar chart**: Categorical x-axis, numeric y-axis (most common)
   - **Line chart**: Temporal x-axis (datetime), numeric y-axis
   - **Pie chart**: Single dimension + single measure

**LLM prompting for visualization:**

The system prompt is extended with:
```
When returning query results, if the data is suitable for visualization
(2+ columns, at least 1 numeric), include a visualization suggestion
in the tool result metadata with the structure:
{ "type": "bar"|"line"|"pie", "config": { "xKey": "...", "yKey": "..." } }

Rules for picking chart type:
- Categorical x + numeric y → bar chart
- DateTime/Date x + numeric y → line chart
- Single categorical dimension + numeric measure → pie chart
- 2+ categorical columns + numeric → stacked bar chart
```

### Data Profile Report

A one-click button "📊 Generate Profile" in the Agent tab's quick-actions bar.

When clicked:
1. Agent receives a system-prompted request to analyze the current table
2. Agent executes multiple SQL queries:
   - `SELECT count() FROM table` — total row count
   - For each column:
     - String types: `SELECT col, count() FROM table GROUP BY col ORDER BY count() DESC LIMIT 10` — top values + null count
     - Numeric types: `SELECT min(col), max(col, avg(col), quantile(0.5)(col), count() - count(col) AS nulls FROM table` — min, max, avg, median, null count
     - Date types: `SELECT min(col), max(col) FROM table` — range
3. Agent formats a "Data Profile" report with:
   - Summary stats header (total rows, total columns, overall null %)
   - Per-column card: type, null count + %, distinct count (string), min/max/avg (numeric), range (date)
4. Report renders as markdown in the chat

**Implementation:**

- Install: `npm install recharts`
- **`src/components/chart.tsx`** — Chart rendering component:
  ```typescript
  interface ChartProps {
    data: Record<string, unknown>[]
    config: {
      type: 'bar' | 'line' | 'pie'
      xKey: string
      yKey: string
      title?: string
    }
  }
  ```
  - Uses Recharts: `<BarChart>`, `<LineChart>`, `<PieChart>` with responsive container
  - Tooltip on hover, legend, axis labels
  - Color palette: consistent blue-based (matching app theme)
  - Dark mode aware (uses CSS variables for axis/text colors)
- **`src/components/agent-chat.tsx`** — Update tool result renderer:
  - After data table, check if `visualization` config exists → render `<Chart>`
  - "📊 Generate Profile" quick-action button
- **`src/hooks/use-agent-chat.ts`** — Add:
  - `generateProfile()` function that sends a predefined system message to trigger profile analysis
  - Visualization config extraction from tool response metadata

## Acceptance criteria

- [ ] Agent query with 2 columns (categorical + numeric) shows a bar chart
- [ ] Agent query with datetime + numeric shows a line chart
- [ ] Agent query with single dimension + measure shows a pie chart
- [ ] Chart has tooltip on hover showing exact values
- [ ] Chart respects dark/light theme
- [ ] Chart is responsive (resizes with panel)
- [ ] "📊 Generate Profile" button triggers profile generation
- [ ] Profile report shows total rows, total columns, overall null %
- [ ] Per-column stats display correctly (nulls, min/max/avg for numeric, top values for strings)
- [ ] Profile renders without errors for all 23 demo tables

## Blocked by

- #6: Agent NL2SQL must exist first