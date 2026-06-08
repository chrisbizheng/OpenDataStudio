import pino from "pino"
import { mkdirSync } from "fs"
import { join } from "path"

const logDir = join(process.cwd(), "logs")
try { mkdirSync(logDir, { recursive: true }) } catch {}

export const logger = pino({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          targets: [
            { target: "pino-pretty", options: { colorize: true }, level: "info" },
            { target: "pino/file", options: { destination: join(logDir, "app.log") }, level: "debug" },
          ],
        }
      : { target: "pino/file", options: { destination: join(logDir, "app.log") } },
})
