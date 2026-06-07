# Open Data Studio

A modern ClickHouse data management and visualization platform built with Next.js.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![React](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8)

## Features

- **ClickHouse Connection Management** - Easily connect to and manage ClickHouse databases
- **SQL Console** - Write, autocomplete, and execute SQL queries
- **AI Assistant** - Intelligent SQL generation and query suggestions
- **Data Visualization** - Display query results with multiple chart types
- **Data Export** - Export data in CSV and JSON formats
- **Multilingual Support** - Chinese and English interface
- **Theme Switching** - Light and dark themes
- **Responsive Design** - Adapts to different screen sizes

## Tech Stack

- **Frontend**: Next.js 16 + React 19
- **Database**: ClickHouse
- **UI Components**: shadcn/ui + Tailwind CSS
- **State Management**: Zustand
- **AI Integration**: Vercel AI SDK + OpenAI/Ollama
- **Code Editor**: Monaco Editor + CodeMirror
- **Charts**: Recharts

## Quick Start

### Prerequisites

- Node.js 18+
- ClickHouse database instance

### Installation

```bash
# Clone the repository
git clone https://github.com/chrisbizheng/OpenDataStudio.git
cd OpenDataStudio

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### Configuration

Edit `.env.local` file with your ClickHouse connection details:

```env
CLICKHOUSE_HOST=127.0.0.1
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_password
CLICKHOUSE_DB=default
```

### Running

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Visit [http://localhost:4000](http://localhost:4000) to get started.

## Project Structure

```
src/
├── app/              # Next.js app routes
│   ├── api/          # API routes
│   └── page.tsx      # Main page
├── components/       # React components
│   ├── ui/           # Base UI components
│   ├── sidebar.tsx   # Sidebar
│   ├── data-grid.tsx # Data grid
│   ├── sql-console.tsx # SQL console
│   └── agent-chat.tsx # AI assistant
├── lib/              # Utility functions
│   ├── clickhouse.ts # ClickHouse connection
│   └── format.ts     # Formatting utilities
└── stores/           # State management
    ├── dataset.ts    # Dataset state
    └── query.ts      # Query state
```

## Usage

1. **Connect Database**: Configure ClickHouse connection in settings after launching the app
2. **Browse Data**: Select databases and tables from the sidebar
3. **Execute Queries**: Write and run queries in the SQL console
4. **AI Assistant**: Describe what you need in natural language, and AI generates the SQL
5. **Export Data**: Export query results as CSV or JSON

## License

MIT

## Contributing

Issues and Pull Requests are welcome!