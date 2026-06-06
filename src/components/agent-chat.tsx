"use client"

import { useState, useRef, useEffect } from "react"
import { useLlmStore } from "./settings-panel"
import { useLang } from "@/components/lang-provider"

interface Message {
  role: "user" | "assistant"
  content: string
  sql?: string
  rows?: unknown[][]
  columns?: string[]
  visualization?: { type: string; config: { xKey: string; yKey: string; title?: string } } | null
}

interface AgentChatProps {
  tableName?: string | null
  schema?: { name: string; type: string }[]
  selectedDatabase?: string | null
  onSqlGenerated?: (sql: string) => void
}

export function AgentChat({ tableName, schema, selectedDatabase, onSqlGenerated }: AgentChatProps) {
  const { _t } = useLang()
  const { config } = useLlmStore()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: _t("agent.welcome"),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: Message = { role: "user", content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput("")
    setIsLoading(true)

    try {
      const llmConfig = localStorage.getItem("llm-config")
        ? JSON.parse(localStorage.getItem("llm-config")!).state?.config
        : null

      if (!llmConfig || !llmConfig.apiKey) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: _t("agent.not_configured"),
          },
        ])
        setIsLoading(false)
        return
      }

      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-llm-config": btoa(JSON.stringify(llmConfig)),
        },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          context: {
            currentTable: tableName,
            schema: schema ?? [],
            database: selectedDatabase,
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }))
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.message}` },
        ])
        setIsLoading(false)
        return
      }

      const data = await res.json()

      const assistantMsg: Message = {
        role: "assistant",
        content: data.message || "Done.",
        sql: data.sql,
        rows: data.rows,
        columns: data.columns,
        visualization: data.visualization ?? null,
      }
      setMessages((prev) => [...prev, assistantMsg])

      if (data.sql && onSqlGenerated) {
        onSqlGenerated(data.sql)
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Network error: ${e instanceof Error ? e.message : "Unknown"}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const generateProfile = async () => {
    if (!tableName) return
    await sendMessage(
      `Generate a data profile for the table "${tableName}". Run queries to get: total row count, column count, and for each column: null count, min/max/avg for numeric types, distinct count for string types.`
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0">
        <span className="text-xs font-medium">Agent</span>
        <button
          onClick={generateProfile}
          disabled={!tableName || isLoading}
          className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {_t("agent.generate_profile")}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-3" ref={chatRef}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-xs ${
              msg.role === "user" ? "text-right" : "text-left"
            }`}
          >
            {msg.role === "user" ? (
              <div className="inline-block bg-primary/10 text-foreground rounded-lg px-3 py-1.5 max-w-[85%] text-left">
                {msg.content}
              </div>
            ) : (
              <div className="space-y-2">
                {msg.content !== "Done." && (
                  <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                )}
                {msg.sql && (
                  <div className="bg-muted rounded p-2 font-mono text-[10px] text-muted-foreground overflow-x-auto">
                    <div className="text-[10px] font-medium text-foreground mb-1">{_t("agent.sql_label")}</div>
                    <pre>{msg.sql}</pre>
                  </div>
                )}
                {msg.rows && msg.columns && msg.rows.length > 0 && (
                  <div className="overflow-x-auto border border-border rounded">
                    <table className="w-full text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-muted/50">
                          {msg.columns.map((col) => (
                            <th key={col} className="px-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.rows.slice(0, 20).map((row, ri) => (
                          <tr key={ri} className="border-t border-border">
                            {row.map((cell: unknown, ci: number) => (
                              <td key={ci} className="px-2 py-1 truncate max-w-[150px]">
                                {String(cell ?? "∅")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {msg.rows.length > 20 && (
                      <div className="px-2 py-1 text-[10px] text-muted-foreground border-t border-border">
                        {_t("agent.showing_rows")} {msg.rows.length} {_t("agent.rows")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="inline-block w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="inline-block w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            <span className="ml-1">{_t("agent.thinking")}</span>
          </div>
        )}
      </div>
      <div className="border-t border-border p-2 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder={_t("agent.placeholder")}
            disabled={isLoading}
            className="flex-1 px-2 py-1.5 text-xs rounded border border-border bg-background text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-ring disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="px-2.5 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {_t("agent.send")}
          </button>
        </div>
      </div>
    </div>
  )
}