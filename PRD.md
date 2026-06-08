# PRD：Open Data Studio Workbench

**版本：** V1.0
**日期：** 2026-06-06
**状态：** 已批准

---

## 问题陈述

Hugging Face Data Studio 是业界最好的交互式数据集探索工具，但其 Viewer 前端和 Agent 后端是闭源的。企业、研究机构和独立开发者需要一个可在隔离环境（内网、私有云）中运行的自托管等效方案，并支持可定制的分析逻辑（例如自带 LLM 作为 Agent）。

现有的开源替代方案要么缺乏 Data Studio 精致的 UI/UX，要么需要复杂的服务器端基础设施。用户希望有一个单页应用，能直接连接到现有的数据仓库（ClickHouse），提供美观的数据网格、SQL 控制台和理解自然语言查询的 AI Agent —— 全部通过 Docker 在 5 分钟内部署完成。

---

## 解决方案

一个开源、自托管、具有高级感 UI 的数据探索工作台。它是一个 **Next.js** 应用，配合 **ClickHouse 原生后端代理**，提供：

- **1:1 复刻** Hugging Face Data Studio 的三栏布局
- **ClickHouse 作为主数据源** —— 查询通过 HTTP API 在服务端执行，结果流式传输到浏览器数据网格
- **Monaco Editor SQL 控制台**，支持语法高亮、自动补全、查询历史
- **AI Agent 标签页**，支持 NL2SQL、自动可视化和数据画像 —— 由可配置的 LLM（OpenAI / Ollama）驱动
- **深色/浅色模式**，百万行数据集的虚拟滚动，列类型感知渲染

除非用户明确连接外部 LLM API，否则数据不会离开部署环境。

---

## 用户故事

1. 作为数据科学家，我希望从侧边栏浏览 ClickHouse 中所有可用的表，以便快速找到所需的数据集。
2. 作为数据科学家，我希望选择一张表并在虚拟滚动的数据网格中查看前 100 行，以便无需编写 SQL 即可预览数据。
3. 作为数据科学家，我希望每列都按检测到的类型（String、Number、Boolean、List、Struct）渲染，以便一目了然地理解表结构。
4. 作为数据科学家，我希望点击列头进行升序/降序排序，以便快速检查值的分布。
5. 作为数据科学家，我希望通过文本搜索跨所有列过滤行，以便无需编写 WHERE 子句即可找到相关记录。
6. 作为数据科学家，我希望数据网格能流畅地滚动浏览百万行而不卡顿浏览器，以便交互式地探索大型数据集。
7. 作为算法工程师，我希望在 Monaco Editor 中编写任意 SQL 并对 ClickHouse 执行，以便运行复杂的分析查询。
8. 作为算法工程师，我希望有 ClickHouse 方言的 SQL 语法高亮和自动补全，以便更快地编写查询、减少错误。
9. 作为算法工程师，我希望有一个一键 "SELECT * LIMIT 100" 按钮，以便无需输入即可快速检查表结构。
10. 作为算法工程师，我希望一键将查询结果复制为 CSV 或 JSON，以便导出数据进行下游处理。
11. 作为算法工程师，我希望最近 20 条 SQL 查询保存在历史面板中，以便回忆和重新运行之前的分析。
12. 作为业务分析师，我希望在 Agent 聊天面板中输入自然语言问题，以便无需编写 SQL 即可探索数据。
13. 作为业务分析师，我希望 Agent 自动生成并执行 SQL，在聊天中以格式化的表格返回结果，以便内联查看答案。
14. 作为业务分析师，当结果适合可视化时，我希望 Agent 建议图表类型（柱状图、折线图、饼图），以便一目了然地理解趋势。
15. 作为业务分析师，我希望一键生成任何表的数据画像报告（缺失值、均值、分布），以便快速评估数据质量。
16. 作为业务分析师，当切换到 SQL 标签页时，我希望 Agent 生成的 SQL 自动填充，以便手动检查或调整查询。
17. 作为高级用户，我希望在设置面板中配置自己的 LLM API Key（OpenAI / Ollama 端点），以便使用偏好的模型。
18. 作为高级用户，我希望在浅色和深色主题之间切换并跨会话持久化，以便在任何环境中舒适工作。
19. 作为 DevOps 工程师，我希望将整个技术栈部署为单个 Docker 容器，并通过环境变量配置 ClickHouse 连接，以便在 5 分钟内启动。
20. 作为 DevOps 工程师，我希望通过环境变量配置 ClickHouse 的 host、port、user、password，以便不硬编码凭据。
21. 作为安全管理员，我希望确保除非用户明确配置 API Key，否则数据不会发送到外部 LLM 服务，以便敏感数据留在网络内。
22. 作为用户，我希望看到清晰的 "连接中..." → "已连接" 指示器显示 ClickHouse 连接状态，以便知道系统已就绪。
23. 作为用户，我希望错误消息是人类可读的（例如 "Column 'foo' not found" 而非原始的 ClickHouse 堆栈跟踪），以便无需阅读日志即可修复问题。
24. 作为用户，我希望侧边栏中的数据集树显示表名和行数，以便在查询前估算数据量。
25. 作为用户，我希望侧边栏可折叠，以便在需要时最大化数据网格区域。

---

## 实现决策

### 架构：后端代理而非浏览器直连

ClickHouse 的 HTTP API 支持 CORS，但将 8123 端口直接暴露给浏览器存在安全风险且使凭据管理复杂化。因此，使用 **Next.js API 路由层**代理所有 ClickHouse 查询：

```
浏览器 (React)  ──HTTP──>  Next.js API 路由  ──HTTP──>  ClickHouse :8123
```

- API 路由使用 `@clickhouse/client`（官方 Node.js 客户端），HTTP 传输
- ClickHouse 凭据在 API 路由层从环境变量读取（`CLICKHOUSE_HOST`、`CLICKHOUSE_PORT`、`CLICKHOUSE_USER`、`CLICKHOUSE_PASSWORD`、`CLICKHOUSE_DB`）
- 前端永远看不到原始凭据
- 每个 SQL 查询通过 `POST /api/query` 发送，请求体 `{ sql: string, params?: Record<string, unknown> }`，返回 `{ columns: string[], rows: unknown[][], stats: { elapsed: number, rows_read: number } }`

### 深度模块

#### 模块 1：`clickhouse-client`（后端工具）

对 `@clickhouse/client` 的薄封装，提供：

```typescript
interface ClickHouseClient {
  query(sql: string): Promise<QueryResult>
  getTables(): Promise<TableMeta[]>
  getTableSchema(table: string): Promise<ColumnMeta[]>
  getRowCount(table: string): Promise<number>
  queryWithStream(sql: string): AsyncIterable<Row[]>  // 用于大型结果集
}

interface QueryResult {
  columns: string[]
  rows: unknown[][]
  stats: { elapsed: number; rowsRead: number; bytesRead: number }
}
```

这是一个**深度模块** —— 它将所有 ClickHouse 特定的协议细节（HTTP 传输、查询格式化、错误规范化、超时处理）封装在一个简单接口之后。可通过指向测试 ClickHouse 实例进行独立测试。

#### 模块 2：`dataset-tree`（前端组件 + hook）

- 挂载时：请求 `GET /api/tables` → 将表列表和行数加载到 Zustand store
- 渲染可折叠的树结构，带搜索/过滤输入框
- 点击表触发：`GET /api/tables/{name}/schema` + `POST /api/query { sql: "SELECT * FROM {name} LIMIT 100" }`
- Schema 填充数据网格中的列类型注册表
- 行数据填充数据网格 store

#### 模块 3：`data-grid`（前端组件）

- 基于 `@tanstack/react-table` 构建，使用 `@tanstack/react-virtual` 实现虚拟滚动
- 列渲染注册表：
  | ClickHouse 类型 | 渲染器 |
  |---|---|
  | `Int*`、`Float*`、`Decimal*` | 右对齐、等宽字体、蓝色 |
  | `String` | 左对齐、灰色 |
  | `DateTime*`、`Date` | 本地化格式的日期字符串 |
  | `Array(...)` | 可折叠的标签胶囊（点击展开） |
  | `Tuple`、`Nested` | JSON 可折叠树 |
  | `Nullable(T)` | null 时显示 "∅" 徽章，非 null 时使用类型渲染器 |
  | `Bool` | 勾选/叉号图标 |
- 排序：`POST /api/query` 加 `ORDER BY col DESC LIMIT 100` —— 重置为服务端查询
- 过滤：客户端文本搜索，搜索当前已加载的行

#### 模块 4：`sql-console`（前端组件）

- Monaco Editor 配置 ClickHouse SQL 方言（自定义 `monarchTokensProvider` 支持 ClickHouse 函数：`arrayJoin`、`tuple`、`quantile` 等）
- 工具栏：▶ 运行 (Cmd+Enter)、⏹ 停止、📋 复制为 CSV、📋 复制为 JSON、↔ 格式化 SQL
- 历史面板（Zustand store，持久化到 localStorage，最多 20 条）
- 执行时：`POST /api/query` → 结果加载到编辑器下方的数据网格
- Agent 自动填充：当用户从 Agent 标签页切换到 SQL 标签页时，最近一次 Agent 生成的 SQL 会预填充

#### 模块 5：`agent`（前端组件 + 后端 API）

**前端：**
- 聊天面板，流式消息显示（文本用 Markdown 渲染，表格结果用内联 `<DataTable>`，可视化用 `<Chart>`）
- 输入栏带发送按钮（Enter 发送，Shift+Enter 换行）
- 系统提示词上下文包含：当前表 schema（列 + 类型）、ClickHouse SQL 方言说明，以及始终输出用 ```sql 块包裹的可执行 SQL 的指令
- Agent 消息存储在 Zustand + localStorage 中，按会话隔离

**后端 (`POST /api/agent/chat`)：**
- 接收：`{ messages: Message[], context: { currentTable?: string, schema?: ColumnMeta[] } }`
- 使用 Vercel AI SDK 流式传输 LLM 响应
- `execute_sql` 工具定义：
  ```json
  {
    "name": "execute_sql",
    "description": "执行 ClickHouse SQL 查询并返回结果",
    "parameters": {
      "type": "object",
      "properties": {
        "sql": { "type": "string", "description": "要执行的 ClickHouse SQL" }
      },
      "required": ["sql"]
    }
  }
  ```
- LLM 调用 `execute_sql` → 结果作为工具结果注入响应流
- 前端将工具结果渲染为格式化的表格
- LLM 配置：存储在浏览器 `localStorage` 的 `llm_config` 键下：
  ```json
  { "provider": "openai" | "ollama", "apiKey": "...", "baseUrl": "...", "model": "gpt-4o" }
  ```
  API 路由在每次调用时从请求头 `x-llm-config`（base64 编码）读取 —— 无服务端持久化。
- 自动可视化：LLM 的响应在工具结果元数据中包含 `visualization` 字段：
  ```json
  { "type": "bar" | "line" | "pie", "config": { "xKey": "...", "yKey": "..." } }
  ```

#### 模块 6：`chart`（前端组件）

- 使用 Recharts 渲染
- 接收：`{ data: Row[], config: { type, xKey, yKey, title? } }`
- 渲染交互式图表，支持悬停提示、图例
- Agent 图表类型检测：LLM 根据列类型推荐（分类 x → 柱状图，时间 x → 折线图，双分类 → 堆叠柱状图，单维度 + 度量 → 饼图）

#### 模块 7：`layout`（前端外壳）

三栏布局，使用 CSS Grid：

```
┌──────────────────────────────────────────┐
│  [☰] Open Data Studio    🌙 ⚙️          │  ← 头部 (40px)
├────────┬─────────────────┬───────────────┤
│        │                 │  Agent  │ SQL │
│ 表     │   数据网格       │  Schema  │    │
│ 树     │   (虚拟滚动)     │ ───────────── │  ← 右侧面板 (400px)
│        │                 │  聊天 /       │
│        │                 │  编辑器       │
│        │                 │               │
├────────┴─────────────────┴───────────────┤
│   状态：已连接 │ 共 95.92M 行              │  ← 状态栏 (24px)
└──────────────────────────────────────────┘
```

- 侧边栏可折叠（最小宽度 0，最大 280px）
- 右侧面板可折叠（最小宽度 0，最大 480px）
- Zustand store：`{ sidebarOpen, rightPanelOpen, activeTab, theme, llmConfig }`
- 主题：`next-themes`，默认跟随系统，持久化

### API 接口

| 方法 | 路径 | 请求 | 响应 |
|--------|------|---------|----------|
| GET | `/api/tables` | — | `{ tables: { name, rowCount, engine }[] }` |
| GET | `/api/tables/{name}/schema` | — | `{ columns: { name, type }[] }` |
| POST | `/api/query` | `{ sql }` | `{ columns, rows, stats }` |
| POST | `/api/agent/chat` | `{ messages, context }` + `x-llm-config` 请求头 | `Stream<ChatCompletionChunk>` |

### 数据流：Agent NL2SQL 场景

```
1. 用户输入："销售额前 10 的地区"
2. 前端发送 POST /api/agent/chat
   { messages: [{role:"user", content:"销售额前 10 的地区"}],
     context: { currentTable: "real_anonymized_sales" } }
   + 请求头 x-llm-config: <base64 编码的 llm 配置>
3. 后端流式传输 LLM 响应：
   - LLM 思考 → 返回 tool_call: execute_sql({ sql: "SELECT region, sum(sales) as total FROM real_anonymized_sales GROUP BY region ORDER BY total DESC LIMIT 10" })
   - 后端对 ClickHouse 执行查询
   - 返回包含行数据的 tool_result
   - LLM 格式化最终答案，附带 Markdown + 可视化建议
4. 前端渲染：Markdown 文本 + 数据表 + 图表（柱状图，x=region，y=total）
5. 用户点击 SQL 标签页 → SQL 从 Agent 最后一次工具调用自动填充
```

### ClickHouse 连接（环境变量）

```env
CLICKHOUSE_HOST=127.0.0.1
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_clickhouse_password
CLICKHOUSE_DB=default
```

这些值与运行中的 podman ClickHouse 实例匹配，包含 23 个演示表（95.92M 行 / 1.48 GiB）。

### 错误处理策略

- **ClickHouse 连接错误**（超时、认证失败）：API 返回 `{ error: "connection_failed", message: "无法连接到 ClickHouse at {host}:{port}。请确认服务器正在运行。" }`。前端在顶部显示黄色横幅。
- **SQL 语法错误**：解析并重新包装 ClickHouse 错误消息：`{ error: "sql_error", message: "第 1 行第 15 列语法错误：...", details: { raw } }`。前端通过 Monaco Editor 的 marker API 高亮错误位置。
- **Agent LLM 错误**（无效 API Key、速率限制）：流返回特殊的 `error` 块。前端在聊天面板中显示内联错误，附带设置面板的链接。
- **超时**：后端强制 30 秒查询超时。返回 `{ error: "timeout", message: "查询超过 30 秒限制。请添加 LIMIT 或过滤条件。" }`。
- **大型结果集**：如果结果超过 10,000 行，后端返回前 10,000 行 + `{ truncated: true, totalRows: n }`。前端显示 "显示 10,000 / 250,000 行"，附带 "加载更多" 按钮。

---

## 测试决策

### 测试理念

- 测试外部行为，不测试实现细节
- 对 ClickHouse 客户端进行集成测试，使用真实的 podman ClickHouse 实例
- 对数据网格、Agent 聊天和 SQL 编辑器进行组件测试，使用真实的 fixture 数据
- 不对图表进行快照测试（视觉回归不在 V1 范围内）

### 待测试模块

| 模块 | 测试类型 | 方法 |
|--------|-----------|----------|
| `clickhouse-client` | 集成 | 启动测试 ClickHouse（或使用运行中的 podman 实例），验证 `query()`、`getTables()`、`getTableSchema()` 返回正确的数据结构。测试错误情况：无效 SQL、超时、连接被拒。 |
| `dataset-tree` | 组件（Vitest + Testing Library） | Mock `GET /api/tables` 响应，渲染树结构，验证表名出现。点击表 → 验证 schema 请求被调用。 |
| `data-grid` | 组件 | 传入 mock 列元数据 + 行数据。验证虚拟滚动仅渲染可见行。验证列类型渲染器（数字 = 右对齐，Nullable = ∅ 徽章）。 |
| `sql-console` | 组件 | Mock `POST /api/query`。输入 SQL，点击运行 → 验证加载状态，然后验证结果表。验证历史面板显示过去的查询。 |
| `agent` | 组件 + 集成 | Mock `POST /api/agent/chat` 的流式响应。验证消息按顺序渲染（用户 → 助手思考 → 工具调用 → 工具结果 → 最终答案）。验证存在可视化配置时图表组件正确渲染。 |
| `API 路由` | 集成（Vitest + supertest） | 以测试模式启动 Next.js。调用 `/api/tables` → 验证表列表。用无效 SQL 调用 `/api/query` → 验证错误格式。 |

### 先前经验

- `/Users/chrisbi/Documents/KELI/workspaces/nextanalysis/` 现有的 `nextanalysis` 项目有类似的 ClickHouse 代理模式 —— 其测试结构可作为参考
- 组件测试遵循 `@shadcn/ui` 示例中建立的模式：渲染 → 断言 DOM → 模拟交互 → 断言更新后的状态

---

## 不在范围内

- **数据上传 / 回写**：V1 是只读的。用户无法通过 UI 执行 INSERT、UPDATE、DELETE 或 CREATE TABLE。
- **多用户认证**：无登录系统。V1 假设单用户或可信网络部署。ClickHouse 凭据由服务端配置，非按用户。
- **仪表盘 / 保存的报告**：无持久化仪表盘。V1 仅基于会话的探索。
- **Parquet / CSV / JSONL 文件上传**：V1 中 ClickHouse 是唯一数据源。文件上传推迟到 V2。
- **S3 / Hugging Face Hub 集成**：推迟到 V2。
- **移动端响应式**：布局仅限桌面端（最小宽度 1280px）。
- **服务端查询缓存**：每次查询都重新访问 ClickHouse。V1 不实现结果缓存。
- **多模型 LLM 路由**：Agent 一次使用一个 LLM（在设置中配置）。没有基于任务的自动模型选择。
- **导出为 Parquet**：仅从 SQL 控制台导出 CSV/JSON。无结构化数据导出。

---

## 补充说明

### 演示数据源

运行中的 ClickHouse 实例（podman，容器名 `clickhouse`）包含 23 个演示数据集，共 **95.92M 行 / 1.48 GiB**。主要表：

| 表名 | 行数 | 描述 |
|-------|------|-------------|
| `dunnhumby_causal` | 36.8M | 促销因果分析 |
| `real_anonymized_sales` | 29.4M | 匿名化销售记录 |
| `criteo_attribution` | 16.5M | 广告归因 |
| `salt_joined` | 2.3M | SAP 宽表（已关联） |
| `fmcg_multi_country` | 1.1M | 跨国快消品销售 |

连接详情在 `podman-servers.md` 中 —— 项目根目录的默认 `.env` 文件应与这些值保持一致。

### LLM 配置 UX

设置面板（头部齿轮图标）提供：
- 提供商下拉：OpenAI / Ollama
- API Key 输入（掩码显示，存储在 localStorage）
- Base URL 输入（OpenAI 默认 `https://api.openai.com/v1`，Ollama 默认 `http://localhost:11434/v1`）
- 模型名称输入（OpenAI 默认 `gpt-4o`，Ollama 默认 `llama3`）
- "测试连接" 按钮，发送最小聊天请求以验证配置

### Agent 系统提示词要点

每次 Agent 请求发送给 LLM 的系统提示词必须包含：

```
你是一个连接到 ClickHouse 数据库的数据分析助手。
当前表：{tableName}
Schema：{columns.map(c => `${c.name}: ${c.type}`).join(', ')}

规则：
1. 收到问题时，生成 ClickHouse SQL 查询。
2. 使用 execute_sql 工具执行查询。
3. 获取结果后，用自然语言解释。
4. 如果结果适合可视化，附带可视化建议。
5. 适当使用 ClickHouse 特定语法（如 arrayJoin、tuple、quantile）。
6. 始终限制结果数量 —— 默认 100，除非用户另有指定。
```

### Docker 部署

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/public ./public
COPY --from=base /app/package.json ./package.json

ENV CLICKHOUSE_HOST=clickhouse
ENV CLICKHOUSE_PORT=8123
ENV CLICKHOUSE_USER=default
ENV CLICKHOUSE_PASSWORD=your_clickhouse_password
ENV CLICKHOUSE_DB=default
ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "start"]
```
