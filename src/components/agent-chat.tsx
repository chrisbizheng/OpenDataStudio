"use client"

import { useState, useRef, useEffect, useMemo } from "react"
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
  schema?: { name: string; type: string; comment?: string }[]
  selectedDatabase?: string | null
  onSqlGenerated?: (sql: string) => void
}

const NUM_KEYWORDS = ["amount", "total", "price", "quantity", "revenue", "cost", "sales", "value", "count", "volume", "budget", "profit", "sum", "balance", "fee", "rate"]

function suggestQuestions(schema: { name: string; type: string; comment?: string }[], lang: string): string[] {
  const suggestions: string[] = []
  const nums = schema.filter((c) => /^(Int|UInt|Float|Decimal)/.test(c.type.replace(/^Nullable\((.+)\)$/, "$1")))
  const strs = schema.filter((c) => /^(String|FixedString|LowCardinality)/.test(c.type.replace(/^Nullable\((.+)\)$/, "$1")))
  const dates = schema.filter((c) => /^(Date|DateTime)/.test(c.type.replace(/^Nullable\((.+)\)$/, "$1")))

  const isZh = lang === "zh"

  if (nums.length > 0 && strs.length > 0) {
    const metric = nums.find((c) => NUM_KEYWORDS.some((k) => c.name.toLowerCase().includes(k))) || nums[0]
    const dim = strs[0]
    suggestions.push(isZh
      ? `按 ${dim.name} 分组显示 ${metric.name} 前 10`
      : `Show top 10 by ${metric.name} grouped by ${dim.name}`)
  }
  if (nums.length > 0) {
    const metric = nums.find((c) => NUM_KEYWORDS.some((k) => c.name.toLowerCase().includes(k))) || nums[0]
    suggestions.push(isZh ? `${metric.name} 的平均值是多少？` : `What is the average ${metric.name}?`)
  }
  if (strs.length > 0) {
    suggestions.push(isZh ? `列出所有不同的 ${strs[0].name}` : `List distinct ${strs[0].name}`)
  }
  if (dates.length > 0) {
    suggestions.push(isZh ? `按 ${dates[0].name} 显示趋势` : `Show trend over ${dates[0].name}`)
  }
  if (schema.length > 0) {
    suggestions.push(isZh ? "生成此表的数据画像" : "Generate a data profile for this table")
  }
  return suggestions.slice(0, 5)
}

export function AgentChat({ tableName, schema, selectedDatabase, onSqlGenerated }: AgentChatProps) {
  const { _t, lang } = useLang()
  const { config } = useLlmStore()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: _t("agent.welcome"),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [thinkingExpanded, setThinkingExpanded] = useState(true)
  const chatRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => schema && schema.length > 0 ? suggestQuestions(schema, lang) : [], [schema, lang])

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
  }, [messages, isLoading])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: Message = { role: "user", content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput("")
    setIsLoading(true)
    setThinkingExpanded(true)

    try {
      const llmConfig = localStorage.getItem("llm-config")
        ? JSON.parse(localStorage.getItem("llm-config")!).state?.config
        : null

      if (!llmConfig || !llmConfig.apiKey) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: _t("agent.not_configured") },
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
      setThinkingExpanded(false)
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
            className={`text-xs ${msg.role === "user" ? "text-right" : "text-left"}`}
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
          <div className="text-xs">
            <button
              onClick={() => setThinkingExpanded(!thinkingExpanded)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors w-full text-left"
            >
              <span className="text-[10px]">{thinkingExpanded ? "▼" : "▶"}</span>
              <span className="inline-block w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="inline-block w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="inline-block w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="ml-1">{_t("agent.thinking")}</span>
            </button>
            {thinkingExpanded && (
              <div className="mt-2 text-[10px] text-muted-foreground/60 space-y-1 pl-4 border-l-2 border-muted">
                <div>1. Calling LLM...</div>
                <div>2. Executing query...</div>
                <div>3. Analyzing results...</div>
              </div>
            )}
          </div>
        )}
        {!isLoading && messages.length === 1 && tableName && suggestions.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-muted-foreground font-medium">{_t("agent.try_asking")}</div>
            {suggestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="block w-full text-left text-[10px] px-2 py-1.5 rounded bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {q}
              </button>
            ))}
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
