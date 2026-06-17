"use client"

export function InputBar({ input, isLoading, hasAbort, onInputChange, onSend, onStop, _t, lang }: {
  input: string
  isLoading: boolean
  hasAbort: boolean
  onInputChange: (v: string) => void
  onSend: (text: string) => void
  onStop: () => void
  _t: (k: string) => string
  lang: "zh" | "en"
}) {
  return (
    <div className="border-t border-border p-2 shrink-0">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              if (isLoading) onStop()
              else onSend(input)
            }
          }}
          placeholder={_t("agent.placeholder")}
          disabled={isLoading && !hasAbort}
          aria-label={_t("agent.placeholder")}
          className="flex-1 px-2 py-1.5 text-xs rounded border border-border bg-background text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-ring disabled:opacity-50"
        />
        {isLoading ? (
          <button
            onClick={onStop}
            className="px-2.5 py-1.5 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {_t("agent.stop")}
          </button>
        ) : (
          <button
            onClick={() => onSend(input)}
            disabled={!input.trim()}
            className="px-2.5 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {_t("agent.send")}
          </button>
        )}
      </div>
    </div>
  )
}
