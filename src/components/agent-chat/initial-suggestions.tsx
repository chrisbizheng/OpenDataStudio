"use client"

import { useLang } from "@/components/lang-provider"

export function InitialSuggestions({ isLoading, messagesLength, tableName, suggestions, aiInitialQuestions, isGeneratingInitialQuestions, onSend, onGenerateAiQuestions }: {
  isLoading: boolean
  messagesLength: number
  tableName?: string | null
  suggestions: string[]
  aiInitialQuestions: string[] | null
  isGeneratingInitialQuestions: boolean
  onSend: (text: string) => void
  onGenerateAiQuestions: (input: { localQuestions: string[]; target: "initial" | "followUp" }) => Promise<void>
}) {
  const { _t } = useLang()
  if (isLoading || messagesLength !== 1 || !tableName || suggestions.length === 0) return null
  const initialQuestions = aiInitialQuestions ?? suggestions
  return (
    <div className="space-y-1.5 mt-2 animate-fade-slide-in">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] text-muted-foreground font-medium">{_t("agent.try_asking")}</div>
        <button
          onClick={() => onGenerateAiQuestions({ localQuestions: suggestions, target: "initial" })}
          disabled={isGeneratingInitialQuestions}
          className="text-[10px] text-primary hover:underline disabled:opacity-50"
        >
          {isGeneratingInitialQuestions ? _t("agent.generating") : _t("agent.ai_suggest_questions")}
        </button>
      </div>
      {initialQuestions.map((q, i) => (
        <button
          key={i}
          onClick={() => onSend(q)}
          className="flex items-center gap-1.5 w-full text-left text-[10px] px-2 py-1.5 rounded bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-primary shrink-0">›</span>
          <span className="truncate">{q}</span>
        </button>
      ))}
    </div>
  )
}
