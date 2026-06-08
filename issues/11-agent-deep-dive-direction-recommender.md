# Issue 11: AI 深度分析方向推荐器

**Type:** AFK
**Labels:** ready-for-agent
**Blocked by:** #10
**User Stories:** 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22

---

## Parent

#9 Agent 图表节点详情增强 + AI 深度分析方向选择 PRD

## What to build

Build a pure frontend direction recommender for AI Deep Dive. Given the clicked chart node context, visualization config, result columns, schema, and current language, it should return up to four direction options. Each option should include a display label and a prompt to send to Agent Chat.

The recommender should not call the LLM, not request the backend, not parse SQL, and not depend on React state. It should use only:

- Clicked value and clicked row context
- Clicked metric or series context
- Chart type
- Schema field types

Primary direction priority:

1. Drill down
2. Compare
3. Time trend
4. Detail query

If primary directions are not applicable, fill from this ordered fallback pool:

1. Percentage share
2. Metric relationship
3. Outlier / anomaly
4. Period-over-period change

Prompts should use natural language plus structured context, explicitly including the locked dimension condition, analysis action, group field when relevant, and metric field.

## Acceptance criteria

- [ ] The recommender returns no more than 4 directions.
- [ ] The recommender always returns a detail query direction for valid clicked context.
- [ ] Drill-down is recommended before other directions when another dimension field is available.
- [ ] Compare is recommended when the current chart has comparable values on the same dimension.
- [ ] Time trend is recommended when schema includes a Date or DateTime field.
- [ ] Missing primary directions are filled in fallback order: percentage share, metric relationship, anomaly, period-over-period.
- [ ] Each returned prompt includes the locked condition such as `field = 'value'`.
- [ ] Each returned prompt includes the metric field when a metric is available.
- [ ] Chinese UI receives Chinese labels and prompts.
- [ ] English UI receives English labels and prompts.
- [ ] The recommender behaves safely when schema is empty or incomplete.
- [ ] The module is a pure function that can be tested in isolation later.

## Blocked by

- #10
