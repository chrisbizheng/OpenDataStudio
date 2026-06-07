# Open Data Studio

基于 Next.js 构建的现代化 ClickHouse 数据管理与可视化平台。

**[English](README.md)** | **[中文](README.zh-CN.md)**

![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![React](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8)

## 功能特性

- **ClickHouse 连接管理** - 轻松连接和管理 ClickHouse 数据库
- **SQL 控制台** - 支持 SQL 查询编写、自动补全和执行
- **AI 代理助手** - 智能 SQL 生成和查询建议
- **数据可视化** - 支持多种图表类型展示查询结果
- **数据导出** - 支持 CSV 和 JSON 格式导出
- **多语言支持** - 支持中文和英文界面
- **主题切换** - 支持亮色和暗色主题
- **响应式设计** - 适配不同屏幕尺寸

## 技术栈

- **前端框架**: Next.js 16 + React 19
- **数据库**: ClickHouse
- **UI 组件**: shadcn/ui + Tailwind CSS
- **状态管理**: Zustand
- **AI 集成**: Vercel AI SDK + OpenAI/Ollama
- **代码编辑器**: Monaco Editor + CodeMirror
- **图表库**: Recharts

## 快速开始

### 前置要求

- Node.js 18+
- ClickHouse 数据库实例

### 安装

```bash
# 克隆项目
git clone https://github.com/chrisbizheng/OpenDataStudio.git
cd OpenDataStudio

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
```

### 配置

编辑 `.env.local` 文件，配置 ClickHouse 连接信息：

```env
CLICKHOUSE_HOST=127.0.0.1
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_password
CLICKHOUSE_DB=default
```

### 运行

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务
npm start
```

访问 [http://localhost:4000](http://localhost:4000) 开始使用。

## 项目结构

```
src/
├── app/              # Next.js 应用路由
│   ├── api/          # API 路由
│   └── page.tsx      # 主页面
├── components/       # React 组件
│   ├── ui/           # 基础 UI 组件
│   ├── sidebar.tsx   # 侧边栏
│   ├── data-grid.tsx # 数据表格
│   ├── sql-console.tsx # SQL 控制台
│   └── agent-chat.tsx # AI 助手
├── lib/              # 工具函数
│   ├── clickhouse.ts # ClickHouse 连接
│   └── format.ts     # 格式化工具
└── stores/           # 状态管理
    ├── dataset.ts    # 数据集状态
    └── query.ts      # 查询状态
```

## 使用说明

1. **连接数据库**: 启动应用后，在设置中配置 ClickHouse 连接
2. **浏览数据**: 通过侧边栏选择数据库和表
3. **执行查询**: 在 SQL 控制台中编写并执行查询
4. **AI 助手**: 使用自然语言描述，AI 会生成对应的 SQL
5. **导出数据**: 支持将查询结果导出为 CSV 或 JSON

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！