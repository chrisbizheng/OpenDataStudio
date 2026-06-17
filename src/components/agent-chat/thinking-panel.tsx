"use client"

import { SnakeSpinner } from "@/components/snake-spinner"
import type { MessageUIState } from "@/lib/agent-types"

export function ThinkingPanel({ ui, isLoading, isLast, onToggle, _t }: {
  ui: MessageUIState | undefined
  isLoading: boolean
  isLast: boolean
  onToggle: () => void
  _t: (key: string) => string
}) {
  if (ui === undefined) return null
  const isThinking = isLoading && isLast
  const elapsed = ui.thinkingElapsedMs ?? 0
  const timeStr = elapsed >= 1000 ? `${(elapsed / 1000).toFixed(1)}s` : `${elapsed}ms`
  const label = isThinking
    ? _t("agent.thinking")
    : `${_t("agent.thought")} ${timeStr}`

  return (
    <div className="text-xs">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors w-full text-left"
      >
        <span
          className="text-[10px] inline-block transition-transform duration-200"
          style={{ transform: ui.thinkingExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          ▼
        </span>
        {isThinking ? <SnakeSpinner size={12} /> : null}
        <span className="ml-1">{label}</span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: ui.thinkingExpanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          {isThinking && ui.thinkingExpanded && (
            <div
              className="mt-2 text-[10px] text-muted-foreground/60 space-y-1 pl-4 border-l-2 border-muted transition-opacity duration-200"
            >
              <div className="flex items-center gap-1">
                <SnakeSpinner size={12} />
                <span className="ml-1">{_t("agent.thinking")}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
