import { NextRequest, NextResponse } from "next/server"
import { parseAiQuestions } from "@/lib/ai-questions"
import { buildQuestionsSystemPrompt } from "@/lib/prompts/questions"
import { handleAgentRoute } from "@/lib/agent-route-handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  return handleAgentRoute(request, {
    buildSystemPrompt: (lang) => buildQuestionsSystemPrompt(lang),
    buildUserPrompt: (body) => JSON.stringify(body),
    parseResponse: (content) => parseAiQuestions(content),
    responseKey: "questions",
    logPrefix: "agent:questions",
    temperature: 0.5,
  })
}
