# Open Data Studio — 领域术语

## 核心概念

- **目录 (Catalog)**：ClickHouse 元数据的深模块，隐藏获取、缓存、去重、错误恢复。接口：`loadDatabases/loadTables/loadSchema` + `getTables/getSchema` + `invalidate`。缝合点：`CatalogPort`（2 个适配器：HTTP 生产、Memory 测试）
- **查询引擎 (Query Engine)**：SQL 执行的深模块，隐藏 HTTP 传输、请求中止、并发去重。接口：`execute(sql, database?) → QueryResult | null` + `cancel()`。缝合点：`QueryPort`（生产唯一适配器 HTTP）。新请求自动取消前一次，中止返回 null 而非抛异常
- **查询生命周期 (Query Lifecycle)**：查询全流程的深模块，隐藏执行状态机、排序策略、搜索过滤、增量加载、稳定排序推断。接口：`execute(sql, table, append?)` + `sort(column, db, table, schema)` + `setSearchQuery(q)` + `loadMore()` + `getFilteredRows()` + `subscribe(listener)` + `state → QueryLifecycleState`。缝合点：`QueryLifecycleDeps`（1 适配器：`executeSql` 委托给 QueryEngine）。状态机：idle → executing → ok/error，排序内化客户端/服务端策略切换，搜索内化行过滤缓存
- **选择 (Selection)**：用户当前选中的数据库和表，存储在 dataset store 中，与目录数据无关
- **表 (Table)**：ClickHouse 中的数据表，是数据探索的基本单位
- **列 (Column)**：表中的字段，有类型信息（String、Int、DateTime 等）
- **Schema**：表的列定义集合，包含列名、类型、注释
- **查询 (Query)**：发送给 ClickHouse 的 SQL 语句，仅支持只读操作
- **结果窗口 (Result Window)**：Data Grid 当前已加载并可浏览的查询结果子集，不等同于全量查询结果
- **窗口导出 (Window Export)**：导出当前结果窗口中的已加载数据
- **全量导出 (Full Export)**：导出查询对应的完整结果集，不依赖 Data Grid 当前已加载的数据
- **增量加载 (Incremental Loading)**：QueryLifecycle 在用户接近结果窗口底部时继续加载后续结果页的浏览方式，由 `loadMore()` 和 `shouldLoadMore()` 内部管理
- **稳定结果顺序 (Stable Result Order)**：QueryLifecycle 内部推断确定性排序字段（时间/ID优先），使增量加载时结果顺序可预期，由 `inferStableOrder()` 管理
- **窗口搜索 (Window Search)**：QueryLifecycle 内部在已加载数据中执行的搜索过滤，由 `getFilteredRows()` 管理并缓存
- **窗口排序 (Window Sort)**：仅对结果窗口中的已加载数据进行排序，不代表全量查询结果顺序

## Pivot 术语

- **Pivot（透视表）**：多维度交叉分析视图，将行数据按维度聚合为二维表格
- **行维度 (Row Dimension)**：Pivot 表格的行轴字段，例如"地区"、"产品类别"
- **列维度 (Column Dimension)**：Pivot 表格的列轴字段，例如"年份"、"月份"
- **指标 (Indicator)**：被聚合计算的数值字段，例如"销售额(SUM)"、"订单数(COUNT)"
- **基础指标 (Basic Indicator)**：直接对原始字段做聚合的指标，如 `SUM(sales)`
- **计算指标 (Calculated Indicator)**：由其他指标通过表达式派生的指标，如 `[[profit_sum]] / [[sales_sum]]`
- **表达式 (Expression)**：计算指标的公式，用 `[[key]]` 引用其他指标
- **聚合方式 (Aggregation)**：SUM、AVG、COUNT、MIN、MAX、DISTINCT_COUNT
- **小计 (Subtotal)**：按维度分组的部分汇总
- **总计 (Grand Total)**：全部数据的汇总
- **Drill-down（下钻）**：点击聚合值查看底层明细数据
- **列类型分类器 (Column Type Classifier)**：ClickHouse 列类型系统的深模块，位于 `src/lib/column-type-classifier.ts`。隐藏类型分类（维度/指标）、Nullable 解包、类型格式化、metric 名字检测、FieldRole 解析与 override 注入。接口：`classifyColumnType(type) → ColumnKind` + `isDimensionType / isIndicatorType / isMetricColumn` + `unwrapNullable / formatType` + `resolveFieldRole(field, schema, overrides, db, table)` + `getNextFieldRole / createFieldRoleKey`。纯函数模块，无 deps 缝合点。**注意**：渲染逻辑不在分类器内，分类器是纯逻辑模块，无 React 依赖；React 单元格渲染由独立的「单元格渲染器」模块负责
- **单元格渲染器 (Cell Renderer)**：Data Grid 单元格 React 渲染的浅模块，位于 `src/components/column-renderer.tsx`。接口：命名导出 `renderValue(value, type?, columnName?) → ReactNode`。子组件：`NullBadge` / `NumberCell` / `DateCell` / `ArrayCell` / `ObjectCell`。依赖列类型分类器查类型分类，但本身只关心 React 渲染，不重定义类型语义
- **维度分类 (Dimension Classification)**：根据列类型自动判断字段适合做维度还是指标
  - 维度候选：String、FixedString、LowCardinality、Date、DateTime、Bool、Enum
  - 指标候选：Int、UInt、Float、Decimal
- **字段角色 (Field Role)**：字段在分析配置中的用途标记，取值为维度或指标
- **默认角色 (Default Role)**：由维度分类规则自动推断出的字段角色
- **角色覆盖 (Role Override)**：用户手动设置的字段角色，优先于默认角色
- **BETWEEN 算子**：筛选器中的范围条件，用于数值或日期区间
- **透视执行生命周期 (Pivot Execution Lifecycle)**：透视查询执行全流程的深模块，隐藏 SQL 生成、执行、中止/错误分类、生命周期事件发射。接口：`runPivotExecution(input, deps) → AsyncGenerator<PivotExecutionEvent>`。事件类型：`started` / `succeeded(sql, result, config)` / `error(sql, message)` / `aborted`。缝合点：`PivotExecutionDeps`（1 适配器：`executeSql` 委托给 QueryEngine）。input 必须是已校验的 `PivotConfig`（校验由 caller 用 `validatePivotExecution` 完成，执行模块不混"不能启动"与"启动后失败"）。同构于服务端 `runAgentPipeline`、客户端 `runChatSession`、Query Lifecycle。中止（executeSql 返回 null）发射 `aborted` 事件，caller 负责重置 isExecuting，避免按钮卡死
- **Widget 执行 (Widget Execution)**：Dashboard widget SQL 查询执行的浅模块，位于 `widget-execution.ts`。接口：`executeWidgetQuery(sql) → Promise<QueryResult>`。fire-and-forget fetch 模式，无生命周期事件、无 cancel。**故意保持浅模块**：dashboard widget 刷新短暂、无并发取消需求，不与 Pivot Execution Lifecycle 强制对称化以避免过度抽象。若未来出现"批量刷新所有 widget"或"取消刷新"等场景，再升级为 AsyncGenerator 同构模式

## 用户界面术语

- **三栏布局**：侧边栏（库/表/Schema）→ 中心（网格视图 / 透视视图）→ 右侧面板（硬装 AgentChat）
- **数据网格 (Data Grid)**：虚拟滚动的表格视图，展示查询结果
- **SQL 控制台 (SQL Console)**：Monaco Editor 编写的 SQL 编辑器
- **Agent 聊天**：AI 助手对话面板，支持 NL2SQL
- **AgentChatSession**：客户端对话流的深模块，隐藏 SSE 解析、消息增量构建、header 构建。接口：`runChatSession(input, deps) → AsyncGenerator<ChatEvent>`。缝合点：`ChatSessionDeps`（3 适配器：fetchSSE、getLlmConfig、getTraceId）。ChatEvent 类型：token/partial/done/error，done 帧含 reasoning。对等服务端 `runAgentPipeline`
- **Agent Route Handler**：非流式 Agent 路由的共享 LLM 调用模板，位于 `agent-route-handler.ts`。接口：`handleAgentRoute(request, config) → NextResponse`，config 含 `buildSystemPrompt/buildUserPrompt/parseResponse/responseKey/logPrefix/temperature?`。缝合点：`AgentRouteConfig`（2 适配器：`questions/route.ts` 和 `directions/route.ts`）。**两 adapter = 真 seam**，故保留独立模块；route 文件仅负责 config 注入，HTTP 入口和 LLM 实现解耦
- **SSE 帧类型**：`SSETokenFrame { t: "token", c: string }` / `SSEDoneFrame { t: "done", message, sql, rows, columns, visualization, error?, reasoning? }` / `SSEErrorFrame { t: "error", message }`。客户端和服务端共享类型定义
- **Message 可辨识联合**：`{ role: "user", content }` | `AssistantMessage { role: "assistant", content, sql?, rows?, columns?, visualization?, reasoning? }`。UI 组件按 role 分支渲染，assistant 属性仅 `AssistantMessage` 可访问
- **可视化类型 hub (chart-types.ts)**：图表与 widget 的纯类型契约模块，位于 `src/lib/chart-types.ts`。导出 `SeriesConfig / VisualizationConfig / RawViz / ChartConfig`。type-only consumer 拉此模块即可，不会拖入 echarts builder（chart-helpers）的体积。`agent-types.ts` 因 `AssistantMessage.visualization` 字段引用 `VisualizationConfig`，反向 type-only 依赖 chart-types
- **prompts/ 目录**：Agent 路由的提示词与 parser 同位文件夹，位于 `src/lib/prompts/`。每路由一文件 `chat.ts / questions.ts / directions.ts / calc-indicator.ts`，含 `buildSystemPrompt / buildUserPrompt / parseResponse`（chat 例外，parser 在 agent-pipeline.ts 内联）。同位放置使提示词改动只影响一个文件，路由单适配器 = 假 seam
- **设置面板**：LLM 配置弹窗（齿轮图标）
- **状态栏**：底部连接状态指示器

## 数据类型映射

- `Int*`、`UInt*`、`Float*`、`Decimal*` → 数值型（指标候选）
- `String*`、`FixedString*`、`LowCardinality*` → 字符串型（维度候选）
- `Date*`、`DateTime*` → 日期型（维度候选）
- `Bool` → 布尔型（维度候选）
- `Enum*` → 枚举型（维度候选）
- `Array(...)` → 数组型（不参与 pivot）
- `Nullable(T)` → 可空类型，按内部类型 T 分类
