# Issue 8: Docker 部署 + 错误处理打磨

**Type:** AFK
**Blocked by:** #1, #2, #3, #4, #5, #6, #7
**User Stories:** 19, 23

---

## What to build

Production-ready Docker deployment, comprehensive error handling across all surfaces, and README documentation.

### Docker Deployment

- **`Dockerfile`** — Multi-stage build:
  ```dockerfile
  FROM node:20-alpine AS base
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production

  FROM base AS build
  RUN npm ci
  COPY . .
  RUN npm run build

  FROM node:20-alpine AS production
  WORKDIR /app
  COPY --from=build /app/.next ./.next
  COPY --from=base /app/node_modules ./node_modules
  COPY --from=base /app/package.json ./package.json
  COPY --from=base /app/public ./public

  ENV NODE_ENV=production
  EXPOSE 3000
  CMD ["npm", "start"]
  ```
- **`docker-compose.yml`** — Simplifies local deployment:
  ```yaml
  services:
    app:
      build: .
      ports:
        - "3000:3000"
      environment:
        CLICKHOUSE_HOST: clickhouse
        CLICKHOUSE_PORT: 8123
        CLICKHOUSE_USER: default
        CLICKHOUSE_PASSWORD: afUm4SOHIvGZnhnf
        CLICKHOUSE_DB: default
    clickhouse:
      image: clickhouse/clickhouse-server:latest
      ports:
        - "8123:8123"
        - "9000:9000"
      environment:
        CLICKHOUSE_DB: default
        CLICKHOUSE_USER: default
        CLICKHOUSE_PASSWORD: afUm4SOHIvGZnhnf
      volumes:
        - clickhouse_data:/var/lib/clickhouse
  volumes:
    clickhouse_data:
  ```
- **`.dockerignore`** — Exclude `node_modules`, `.next`, `*.md`, `issues/`

### Error Handling Polish

**Backend:**
- **ClickHouse error normalization** (`src/lib/clickhouse.ts`):
  ```typescript
  // Catch ClickHouse HTTP errors and normalize to structured errors
  // { error: string, message: string, details?: object }
  // Error types: 'connection_failed', 'sql_error', 'timeout', 'internal'
  ```
- **Timeout enforcement**: 30s query timeout via ClickHouse's `max_execution_time` setting
- **Large result handling**: If result exceeds 10000 rows, return first 10000 + `{ truncated: true, totalRows: number }`

**Frontend:**
- **Error boundary** (`src/components/error-boundary.tsx`): Catches React render errors, shows a friendly "Something went wrong" panel with "Reload" button
- **SQL errors**: Monaco Editor highlights error line (via `monaco.editor.setModelMarkers`) showing the exact position
- **Agent errors**:
  - LLM auth failure: inline message "API key invalid. Check Settings → LLM"
  - LLM timeout: inline message "LLM request timed out. Try a simpler question."
  - SQL execution error: inline message with the SQL error (parsed to remove raw ClickHouse internals)
- **ClickHouse connection loss**: Yellow banner at top: "⚠️ ClickHouse connection lost. Retrying..." with auto-retry (3 attempts, 5s interval)

### README

**`README.md`** with sections:
- Product overview + screenshot placeholder
- Quick start (2-minute deploy):
  1. `cp .env.example .env.local`
  2. `docker compose up`
  3. Open `http://localhost:3000`
- Configuration reference (all env vars)
- Demo data overview (referencing the 23 tables)
- LLM setup guide (OpenAI API key, Ollama local setup)
- Development guide: `npm run dev` workflow
- Architecture diagram (ASCII)
- License information

## Acceptance criteria

- [ ] `docker build -t open-data-studio .` builds successfully
- [ ] `docker compose up` starts both app and ClickHouse
- [ ] App is accessible at `http://localhost:3000`
- [ ] ClickHouse connection works from within the Docker network
- [ ] `.env.example` contains all required env vars with placeholder values
- [ ] `/.dockerignore` excludes unnecessary files (image size < 300MB)
- [ ] SQL error shows readable message (not raw ClickHouse stack trace)
- [ ] Monaco Editor highlights error location for SQL syntax errors
- [ ] ClickHouse connection loss shows yellow banner with auto-retry
- [ ] Error boundary catches React crashes and shows reload button
- [ ] Agent shows inline error for invalid API key
- [ ] Query timeout (>30s) returns a clear "timeout" error message
- [ ] Large result sets (>10000 rows) show "Showing 10K of N rows" with "Load more"
- [ ] README has working quick-start instructions

## Blocked by

- All previous issues (#1 through #7)