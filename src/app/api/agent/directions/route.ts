import { NextRequest, NextResponse } from "next/server"
import { buildDirectionsSystemPrompt, parseDirections } from "@/lib/prompts/directions"
import { handleAgentRoute } from "@/lib/agent-route-handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  return handleAgentRoute(request, {
    buildSystemPrompt: (lang) => buildDirectionsSystemPrompt(lang),
    buildUserPrompt: (body) => JSON.stringify(body),
    parseResponse: (content) => parseDirections(content),
    responseKey: "directions",
    logPrefix: "agent:directions",
    temperature: 0.4,
  })
}
