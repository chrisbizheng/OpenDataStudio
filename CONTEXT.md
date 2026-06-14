# Open Data Studio — 领域术语

## 核心概念

- **目录 (Catalog)**：ClickHouse 元数据的深模块，隐藏获取、缓存、去重、错误恢复。接口：`loadDatabases/loadTables/loadSchema` + `getTables/getSchema` + `invalidate`。缝合点：`CatalogPort`（2 个适配器：HTTP 生产、Memory 测试）
- **查询引擎 (Query Engine)**：SQL 执行的深模块，隐藏 HTTP 传输、请求中止、并发去重。接口：`execute(sql, database?) → QueryResult | null` + `cancel()`。缝合点：`QueryPort`（2 个适配器：HTTP 生产、Memory 测试）。新请求自动取消前一次，中止返回 null 而非抛异常
- **选择 (Selection)**：用户当前选中的数据库和表，存储在 dataset store 中，与目录数据无关
- **表 (Table)**：ClickHouse 中的数据表，是数据探索的基本单位
- **列 (Column)**：表中的字段，有类型信息（String、Int、DateTime 等）
- **Schema**：表的列定义集合，包含列名、类型、注释
- **查询 (Query)**：发送给 ClickHouse 的 SQL 语句，仅支持只读操作
- **结果窗口 (Result Window)**：Data Grid 当前已加载并可浏览的查询结果子集，不等同于全量查询结果
- **窗口导出 (Window Export)**：导出当前结果窗口中的已加载数据
- **全量导出 (Full Export)**：导出查询对应的完整结果集，不依赖 Data Grid 当前已加载的数据
- **增量加载 (Incremental Loading)**：Data Grid 在用户接近结果窗口底部时继续加载后续结果页的浏览方式
- **稳定结果顺序 (Stable Result Order)**：查询结果在分页加载时使用确定性排序，使不同结果页之间的顺序可预期
- **窗口搜索 (Window Search)**：仅在结果窗口的已加载数据中执行的 Data Grid 搜索
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
- **维度分类 (Dimension Classification)**：根据列类型自动判断字段适合做维度还是指标
  - 维度候选：String、FixedString、LowCardinality、Date、DateTime、Bool、Enum
  - 指标候选：Int、UInt、Float、Decimal
- **字段角色 (Field Role)**：字段在分析配置中的用途标记，取值为维度或指标
- **默认角色 (Default Role)**：由维度分类规则自动推断出的字段角色
- **角色覆盖 (Role Override)**：用户手动设置的字段角色，优先于默认角色
- **BETWEEN 算子**：筛选器中的范围条件，用于数值或日期区间

## 用户界面术语

- **三栏布局**：侧边栏（表浏览）→ 中心（数据网格）→ 右侧面板（Schema/SQL/Agent）
- **数据网格 (Data Grid)**：虚拟滚动的表格视图，展示查询结果
- **SQL 控制台 (SQL Console)**：Monaco Editor 编写的 SQL 编辑器
- **Agent 聊天**：AI 助手对话面板，支持 NL2SQL
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
