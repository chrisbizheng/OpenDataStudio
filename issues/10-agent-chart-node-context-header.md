# Issue 10: 图表点击节点显示完整维度与度量上下文

**Type:** AFK
**Labels:** ready-for-agent
**Blocked by:** #9
**User Stories:** 1, 2, 3, 4, 5, 6, 23, 24

---

## Parent

#9 Agent 图表节点详情增强 + AI 深度分析方向选择 PRD

## What to build

When a user clicks a chart node in Agent Chat, the node detail card should clearly show the full dimension and metric context for the selected node.

The existing single-line `{key} → {value}` header should become a two-line header:

- First line: dimension context, formatted as `field = value · field = value`, using raw field names.
- Second line: metric context, formatted as `metric = value`, showing the clicked metric or series focus.

The chart click payload should include the clicked series name so the detail card can distinguish which series was clicked in multi-series charts. The detail table below the header should keep its existing behavior.

## Acceptance criteria

- [ ] Clicking a single-dimension chart node shows `{xKey field} = {clicked value}` in the first header line.
- [ ] Clicking a multi-dimension chart node shows all available dimension fields as `{field} = {value}` separated by `·`.
- [ ] The header uses raw field names, not schema comments or translated labels.
- [ ] The second header line shows the clicked metric name and formatted value.
- [ ] Multi-series chart clicks preserve the clicked series name and display the correct clicked series focus.
- [ ] Numeric values continue to use locale formatting.
- [ ] The dimension line wraps instead of truncating when there are many dimensions.
- [ ] The existing node detail table below the header remains unchanged in columns, filtering, truncation, and row count.
- [ ] Existing Agent messages without the new series field still render without errors.

## Blocked by

- #9
