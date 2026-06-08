# Open Data Studio

A modern ClickHouse data exploration and visualization workbench built with Next.js.

**[English](README.en.md)** | **[中文](README.md)**

![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![React](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8)

## Features

- **SQL Console** — Write, run, and autocomplete SQL queries with syntax highlighting (CodeMirror + ClickHouse dialect)
- **AI Agent Chat** — Natural language to SQL with automatic query execution, chart rendering, and drill-down analysis
- **Data Grid** — Virtual-scrolling table with type-aware cell rendering
- **Pivot Table** — Drag-and-drop pivot config panel powered by VTable
- **Charts** — ECharts-based with 9 chart types (bar, line, area, pie, scatter, radar, radialBar, treemap, composed), flexible series composition, dataZoom, brush selection, toolbox, enhanced tooltip (percentage), click-to-drilldown
- **Dual Theme** — VS Code themed SQL editor with custom syntax colors; system-aware dark/light mode
- **Data Export** — CSV and JSON format export
- **I18n** — Chinese and English interface
- **Logging** — Backend pino + frontend localStorage logging with traceId correlation
- **Docker** — One-command startup with ClickHouse

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4
- **Database**: ClickHouse (via `@clickhouse/client`)
- **UI**: shadcn/ui (`base-nova` style) + ECharts + VTable
- **State**: Zustand (5 stores, persist middleware)
- **Editor**: CodeMirror 6 (`@codemirror/lang-sql` + custom ClickHouse dialect)
- **Theme**: Custom VS Code theme override with distinct keyword/identifier colors
- **AI**: OpenAI-compatible / Ollama API with streaming JSON response
- **Logging**: pino (backend) + custom client-logger (frontend)

## Quick Start

### Prerequisites

- Node.js 18+
- ClickHouse instance (or use Docker)

### Installation

```bash
git clone https://github.com/chrisbizheng/OpenDataStudio.git
cd OpenDataStudio

npm install

cp .env.example .env.local
```

### Configuration

Edit `.env.local` with your ClickHouse connection:

```env
CLICKHOUSE_HOST=127.0.0.1
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_password
CLICKHOUSE_DB=default
```

### Running

```bash
# Development (port 4000)
npm run dev

# Production build (standalone output for Docker)
npm run build

# Or use Docker
docker compose up          # app + ClickHouse
docker compose up clickhouse   # ClickHouse only
```

Visit [http://localhost:4000](http://localhost:4000).

## Project Structure

```
src/
├── app/api/              # API routes
│   ├── agent/chat/       # AI agent streaming endpoint
│   ├── databases/        # List databases
│   ├── tables/           # List tables + schema
│   └── query/            # SQL execution proxy
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── sidebar.tsx       # DB selector, table list, schema panel
│   ├── sql-console.tsx   # CodeMirror SQL editor
│   ├── data-grid.tsx     # Virtual-scroll data table
│   ├── agent-chat.tsx    # AI chat with streaming + charts
│   ├── chart.tsx         # ECharts wrapper (9 types + composed)
│   ├── pivot-config.tsx  # Pivot table config panel
│   └── column-renderer.tsx # Type-aware cell renderers
├── lib/
│   ├── clickhouse.ts     # ClickHouse client singleton
│   ├── ch-dialect.ts     # Custom CodeMirror ClickHouse dialect
│   ├── ch-completion.ts  # Auto-completion source
│   ├── vscode-theme-override.ts # Custom VS Code theme
│   ├── logger.ts         # pino backend logger
│   ├── client-logger.ts  # frontend localStorage logger
│   └── i18n.ts           # Chinese/English dictionary
└── stores/
    ├── dataset.ts        # Database/tables/schema state
    ├── query.ts          # SQL query state
    ├── ui.ts             # UI preferences (persisted)
    ├── saved-queries.ts  # Saved SQL queries (persisted)
    ├── sql-history.ts    # Query history (persisted)
    └── agent-chats.ts    # Agent conversation store
```

## Usage

1. **Select a database and table** from the sidebar — schema loads automatically
2. **Write SQL** in the CodeMirror editor with ClickHouse-aware autocompletion
3. **Run queries** — results display in the virtual-scroll data grid
4. **Pivot view** — drag dimensions and measures for cross-tab analysis
5. **AI Agent** — type a question in natural language; the agent generates SQL, executes it, shows a chart, and explains insights
6. **Export** — download query results as CSV or JSON

## License

MIT
