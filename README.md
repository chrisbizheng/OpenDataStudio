# Open Data Studio

基于 Next.js 构建的现代化 ClickHouse 数据探索与可视化工作台。

**[English](README.en.md)** | **[中文](README.md)**

![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![React](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8)

## 功能特性

- **SQL 控制台** — CodeMirror 编辑器 + ClickHouse 方言语法高亮 + 自动补全
- **AI 代理助手** — 自然语言转 SQL，自动执行查询、渲染图表、下钻分析
- **数据网格** — 虚拟滚动表格，类型感知单元格渲染
- **透视表** — 拖拽配置面板，基于 VTable 实现
- **图表** — 基于 ECharts，支持 9 种图表类型（柱状、折线、面积、饼图、散点、雷达、径向柱、矩形树、组合图），灵活 series 组合，dataZoom 缩放、brush 框选、toolbox 工具栏、Tooltip 增强（百分比）、点击下钻
- **双主题** — VS Code 风格 SQL 编辑器，自定义关键字/标识符颜色区分，跟随系统亮暗切换
- **数据导出** — CSV / JSON 格式
- **国际化** — 中文 / 英文界面
- **日志系统** — 后端 pino + 前端 localStorage 日志，traceId 关联
- **Docker** — 一键启动应用 + ClickHouse

## 技术栈

- **前端**: Next.js 16 + React 19 + Tailwind CSS 4
- **数据库**: ClickHouse（`@clickhouse/client`）
- **UI 组件**: shadcn/ui（`base-nova` 风格）+ ECharts + VTable
- **状态管理**: Zustand（5 个 store，部分持久化）
- **编辑器**: CodeMirror 6（`@codemirror/lang-sql` + 自定义 ClickHouse 方言）
- **主题**: 自定义 VS Code 主题覆盖，区分关键字和标识符颜色
- **AI**: OpenAI 兼容 / Ollama API，流式 JSON 响应
- **日志**: pino（后端）+ 自定义 client-logger（前端）

## 快速开始

### 前置要求

- Node.js 18+
- ClickHouse 实例（或使用 Docker）

### 安装

```bash
git clone https://github.com/chrisbizheng/OpenDataStudio.git
cd OpenDataStudio

npm install

cp .env.example .env.local
```

### 配置

编辑 `.env.local`，填写 ClickHouse 连接信息：

```env
CLICKHOUSE_HOST=127.0.0.1
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_password
CLICKHOUSE_DB=default
```

### 运行

```bash
# 开发模式（端口 4000）
npm run dev

# 构建生产版本（standalone 输出，适合 Docker）
npm run build

# 或使用 Docker
docker compose up               # 应用 + ClickHouse
docker compose up clickhouse    # 仅 ClickHouse
```

访问 [http://localhost:4000](http://localhost:4000) 开始使用。

## 项目结构

```
src/
├── app/api/              # API 路由
│   ├── agent/chat/       # AI 代理流式接口
│   ├── databases/        # 数据库列表
│   ├── tables/           # 表列表 + Schema
│   └── query/            # SQL 执行代理
├── components/
│   ├── ui/               # shadcn/ui 基础组件
│   ├── sidebar.tsx       # 数据库选择、表列表、Schema 面板
│   ├── sql-console.tsx   # CodeMirror SQL 编辑器
│   ├── data-grid.tsx     # 虚拟滚动数据表格
│   ├── agent-chat.tsx    # AI 对话 + 流式渲染 + 图表
│   ├── chart.tsx         # ECharts 封装（9 种图表 + 组合图）
│   ├── pivot-config.tsx  # 透视表配置面板
│   └── column-renderer.tsx # 类型感知单元格渲染
├── lib/
│   ├── clickhouse.ts     # ClickHouse 客户端单例
│   ├── ch-dialect.ts     # CodeMirror ClickHouse 方言
│   ├── ch-completion.ts  # 自动补全源
│   ├── vscode-theme-override.ts # 自定义 VS Code 主题
│   ├── logger.ts         # pino 后端日志
│   ├── client-logger.ts  # 前端 localStorage 日志
│   └── i18n.ts           # 中英文词典
└── stores/
    ├── dataset.ts        # 数据库/表/Schema 状态
    ├── query.ts          # SQL 查询状态
    ├── ui.ts             # UI 偏好（持久化）
    ├── saved-queries.ts  # 已存查询（持久化）
    ├── sql-history.ts    # 查询历史（持久化）
    └── agent-chats.ts    # Agent 对话存储
```

## 使用说明

1. **选择数据库和表** — 侧边栏选择后自动加载 Schema
2. **编写 SQL** — CodeMirror 编辑器，ClickHouse 语法高亮 + 自动补全
3. **执行查询** — 结果在虚拟滚动数据网格中展示
4. **透视分析** — 拖拽维度和指标，进行交叉分析
5. **AI 代理** — 用自然语言提问，AI 自动生成 SQL、执行、展示图表并分析结论
6. **导出数据** — 支持 CSV / JSON 格式下载

## 许可证

MIT
