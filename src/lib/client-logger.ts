const KEY = "ods_logs"
const MAX = 2000

function getLogs(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]")
  } catch {
    return []
  }
}

export function appLog(...args: unknown[]) {
  const ts = new Date().toISOString()
  const line = `[${ts}] ${args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")}`
  console.log(line)

  try {
    const logs = getLogs()
    logs.push(line)
    if (logs.length > MAX) logs.splice(0, logs.length - MAX)
    localStorage.setItem(KEY, JSON.stringify(logs))
  } catch {
    // localStorage full or unavailable
  }
}

export function getTraceId(): string {
  return crypto.randomUUID()
}
