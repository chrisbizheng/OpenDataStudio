import type { NextRequest } from "next/server"

export function getTraceId(request: NextRequest | Request): string {
  return request.headers.get("x-trace-id") || crypto.randomUUID()
}
