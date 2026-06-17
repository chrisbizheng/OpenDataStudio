"use client"

export function SuggestionList({ questions, onSend, lang, _t, title, aiLabel, isGenerating, onGenerateAi }: {
  questions: string[]
  onSend: (text: string) => void
  lang: "zh" | "en"
  _t: (key: string) => string
  title: string
  aiLabel: string
  isGenerating: boolean
  onGenerateAi: () => void
}) {
  if (questions.length === 0) return null
  return (
    <div className="space-y-1 mt-3 pt-2 border-t border-border/50 animate-fade-slide-in">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] text-muted-foreground font-medium">{title}</div>
        <button onClick={onGenerateAi} disabled={isGenerating} className="text-[10px] text-primary hover:underline disabled:opacity-50">
          {isGenerating ? _t("agent.generating") : aiLabel}
        </button>
      </div>
      {questions.map((q, i) => (
        <button key={i} onClick={() => onSend(q)} className="flex items-center gap-1.5 w-full text-left text-[10px] px-2 py-1.5 rounded bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <span className="text-primary shrink-0">›</span>
          <span className="truncate">{q}</span>
        </button>
      ))}
    </div>
  )
}
