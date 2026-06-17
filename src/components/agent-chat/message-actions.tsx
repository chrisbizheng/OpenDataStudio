"use client"

import type { AssistantMessage, Message } from "@/lib/agent-types"

export function MessageActions({ msg, index, messages, lang, _t, onSendMessage }: {
  msg: AssistantMessage
  index: number
  messages: Message[]
  lang: "zh" | "en"
  _t: (key: string) => string
  onSendMessage: (text: string, baseMessages?: Message[]) => void
}) {
  const copyContent = () => {
    const parts: string[] = []
    if (msg.content && msg.content !== "Done.") parts.push(msg.content)
    if (msg.sql) parts.push("\n\n```sql\n" + msg.sql + "\n```")
    if (msg.columns && msg.rows && msg.rows.length > 0) {
      parts.push("\n| " + msg.columns.join(" | ") + " |")
      parts.push("| " + msg.columns.map(() => "---").join(" | ") + " |")
      for (const row of msg.rows.slice(0, 20)) {
        parts.push("| " + row.map((c) => String(c ?? "")).join(" | ") + " |")
      }
      if (msg.rows.length > 20) parts.push("\n*" + msg.rows.length + " rows total*")
    }
    navigator.clipboard.writeText(parts.join("\n"))
  }
  const regenerate = () => {
    const userMsg = messages[index - 1]
    if (userMsg?.role === "user") onSendMessage(userMsg.content, messages.slice(0, index - 1))
  }
  return (
    <div className="flex items-center gap-1 mt-1 animate-fade-slide-in">
      <button
        onClick={copyContent}
        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted hover:shadow-sm"
        title={_t("agent.copy")}
      >
        <svg className="inline-block w-3 h-3 mr-0.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11"/></svg>
        {_t("agent.copy")}
      </button>
      <span className="text-muted-foreground/30">·</span>
      <button
        onClick={regenerate}
        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted hover:shadow-sm"
        title={_t("agent.regenerate")}
      >
        <svg className="inline-block w-3 h-3 mr-0.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 8a6.5 6.5 0 0 1 11.3-4.4"/><path d="M14.5 8a6.5 6.5 0 0 1-11.3 4.4"/><path d="M12.5 1v3.3h-3.3"/><path d="M3.5 15V11.7h3.3"/></svg>
        {_t("agent.regenerate")}
      </button>
    </div>
  )
}
