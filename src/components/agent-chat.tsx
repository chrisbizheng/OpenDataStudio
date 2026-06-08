"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import { useLang } from "@/components/lang-provider"
import { Chart } from "@/components/chart"
import { useAgentChatsStore, buildChatKey } from "@/stores/agent-chats"
import { appLog, downloadLogs, getTraceId } from "@/lib/client-logger"
import { parseSSEStream } from "@/lib/sse-parser"
import { extractField, stripMarkdownTables } from "@/lib/llm-response"
import { suggestQuestions } from "@/lib/suggestions"
import type { Message } from "@/lib/agent-types"

interface AgentChatProps {
  tableName?: string | null
  schema?: { name: string; type: string; comment?: string }[]
  selectedDatabase?: string | null
  onSqlGenerated?: (sql: string) => void
}

export function AgentChat({ tableName, schema, selectedDatabase, onSqlGenerated }: AgentChatProps) {
  const { _t, lang } = useLang()
  const chatKey = useMemo(() => buildChatKey(selectedDatabase, tableName), [selectedDatabase, tableName])
  const storedConversation = useAgentChatsStore((s) => s.conversations[chatKey])
  const setStoredConversation = useAgentChatsStore((s) => s.setConversation)
  const clearStoredConversation = useAgentChatsStore((s) => s.clearConversation)

  const welcomeMessage: Message = useMemo(
    () => ({ role: "assistant", content: _t("agent.welcome") }),
    [_t]
  )

  const [messages, setMessages] = useState<Message[]>(
    () => storedConversation && storedConversation.length > 0 ? storedConversation : [welcomeMessage]
  )
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [clickedChart, setClickedChart] = useState<{
    messageIndex: number
    item: { key: string; value: number; row: Record<string, unknown> }
  } | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => schema && schema.length > 0 ? suggestQuestions(schema, lang) : [], [schema, lang])
  const prevCountRef = useRef(0)
  const prevChatKeyRef = useRef(chatKey)
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true
      prevChatKeyRef.current = chatKey
      return
    }
    if (prevChatKeyRef.current === chatKey) return
    prevChatKeyRef.current = chatKey
    if (isLoading) return
    const next = storedConversation && storedConversation.length > 0 ? storedConversation : [welcomeMessage]
    setMessages(next)
    prevCountRef.current = next.length
  }, [chatKey, storedConversation, welcomeMessage, isLoading])

  useEffect(() => {
    if (isLoading) return
    const isInitialOnly = messages.length === 1 && messages[0].role === "assistant" && messages[0].content === welcomeMessage.content
    if (isInitialOnly) return
    const persistable: Message[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
      sql: m.sql,
      rows: m.rows,
      columns: m.columns,
      visualization: m.visualization,
    }))
    setStoredConversation(chatKey, persistable)
  }, [messages, chatKey, isLoading, welcomeMessage.content, setStoredConversation])

  useEffect(() => {
    if (messages.length !== prevCountRef.current) {
      prevCountRef.current = messages.length
      chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
    }
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: Message = { role: "user", content: text }
    const placeholderMsg: Message = {
      role: "assistant",
      content: "",
      thinkingExpanded: true,
      streamingContent: "",
    }
    const updated = [...messages, userMsg]
    setMessages([...updated, placeholderMsg])
    setInput("")
    setIsLoading(true)

    try {
      const raw = localStorage.getItem("llm-config")
      const llmConfig = raw ? JSON.parse(raw).state?.config : null

      if (!llmConfig || !llmConfig.apiKey) {
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = {
            role: "assistant",
            content: _t("agent.not_configured"),
          }
          return next
        })
        setIsLoading(false)
        return
      }

      const traceId = getTraceId()
      appLog("[Agent]", traceId, "send:", text.slice(0, 80))

      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-llm-config": btoa(JSON.stringify(llmConfig)),
          "x-trace-id": traceId,
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
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = {
            role: "assistant",
            content: `Error: ${err.message}`,
          }
          return next
        })
        setIsLoading(false)
        return
      }

      const reader = res.body!.getReader()
      let rawJson = ""

      for await (const event of parseSSEStream(reader)) {
        const d = event.data
        if (event.type === "token" && d.c) {
          rawJson += d.c as string
          const msg = extractMessageFromPartial(rawJson)
          setMessages((prev) => {
            const next = [...prev]
            const last = { ...next[next.length - 1] }
            last.streamingContent = rawJson
            if (msg !== null) last.content = msg
            next[next.length - 1] = last
            return next
          })
        } else if (event.type === "done") {
          appLog("[Agent]", traceId, "done:", (d.visualization as { type?: string })?.type, "xKey:", (d.visualization as { config?: { xKey?: string } })?.config?.xKey, "cols:", (d.columns as string[])?.length, "rows:", (d.rows as unknown[][])?.length)
          setMessages((prev) => {
            const next = [...prev]
            const last = { ...next[next.length - 1] }
            last.content = (d.message as string) || "Done."
            last.sql = (d.sql as string) || undefined
            last.rows = (d.rows as unknown[][]) || undefined
            last.columns = (d.columns as string[]) || undefined
            last.visualization = (d.visualization as Message["visualization"]) ?? null
            last.thinkingExpanded = false
            next[next.length - 1] = last
            return next
          })
          if (d.sql && onSqlGenerated) {
            onSqlGenerated(d.sql as string)
          }
        } else if (event.type === "error") {
          setMessages((prev) => {
            const next = [...prev]
            const last = { ...next[next.length - 1] }
            last.content = (d.message as string) || "Unknown error"
            last.thinkingExpanded = false
            next[next.length - 1] = last
            return next
          })
        }
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
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Agent</span>
          {tableName && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={tableName}>
              · {tableName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              clearStoredConversation(chatKey)
              setMessages([welcomeMessage])
              prevCountRef.current = 1
            }}
            disabled={isLoading || messages.length <= 1}
            className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30"
            title={_t("agent.clear_conversation")}
          >
            {_t("agent.clear")}
          </button>
          <button
            onClick={generateProfile}
            disabled={!tableName || isLoading}
            className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {_t("agent.generate_profile")}
          </button>
          <button
            onClick={downloadLogs}
            className="text-[10px] text-muted-foreground hover:text-foreground"
            title="下载日志"
          >
            📋
          </button>
        </div>
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
                {msg.thinkingExpanded !== undefined && (
                  <div className="text-xs">
                    <button
                      onClick={() => {
                        setMessages((prev) => {
                          const next = [...prev]
                          next[i] = { ...next[i], thinkingExpanded: !next[i].thinkingExpanded }
                          return next
                        })
                      }}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                    >
                      <span className="text-[10px] inline-block transition-transform duration-200" style={{ transform: msg.thinkingExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}>▼</span>
                      {msg.thinkingExpanded !== true && isLoading && i === messages.length - 1 ? (
                        <>
                          <span className="inline-block w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="inline-block w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="inline-block w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </>
                      ) : null}
                      <span className="ml-1">
                        {msg.thinkingExpanded ? _t("agent.thinking_process") : _t("agent.thinking")}
                      </span>
                    </button>
                    <div
                      className="grid transition-[grid-template-rows] duration-300 ease-out"
                      style={{ gridTemplateRows: msg.thinkingExpanded ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                        <div
                          className="mt-2 text-[10px] text-muted-foreground/60 space-y-1 pl-4 border-l-2 border-muted transition-opacity duration-200"
                          style={{ opacity: msg.thinkingExpanded ? 1 : 0 }}
                        >
                          {msg.streamingContent !== undefined ? (
                          <div className="space-y-1">
                            {(() => {
                              const json = msg.streamingContent
                              const message = extractField(json, "message")
                              const sql = extractField(json, "sql")
                              const reasoning = extractField(json, "reasoning") || extractField(json, "thought") || extractField(json, "thinking")

                              const parts: { label: string; text: string }[] = []
                              if (reasoning?.text) parts.push({ label: lang === "zh" ? "思考" : "Reasoning", text: reasoning.text })
                              if (sql?.text) parts.push({ label: "SQL", text: sql.text })
                              if (message?.text) parts.push({ label: lang === "zh" ? "回复" : "Response", text: message.text })

                              if (parts.length === 0) {
                                return (
                                  <>
                                    {json.length > 0 ? (
                                      <div className="font-mono text-[9px] whitespace-pre-wrap break-all max-h-32 overflow-auto opacity-60">
                                        {json.slice(-200)}
                                        {isLoading && i === messages.length - 1 && (
                                          <span className="inline-block w-[1px] h-3 bg-muted-foreground/60 animate-pulse ml-0.5 align-middle" />
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 italic">
                                        <span className="inline-block w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="inline-block w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="inline-block w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                        <span className="ml-1">{_t("agent.waiting_llm")}</span>
                                      </div>
                                    )}
                                    {json.length > 0 && (
                                      <div className="text-[8px] text-muted-foreground/40">{json.length} bytes</div>
                                    )}
                                  </>
                                )
                              }
                              return (
                                <>
                                  {parts.map((p, pi) => (
                                    <div key={pi} className="space-y-0.5">
                                      <div className="text-[9px] uppercase tracking-wide text-muted-foreground/50 font-medium">{p.label}</div>
                                      <div className="whitespace-pre-wrap break-words max-h-32 overflow-auto pl-1">
                                        {p.text}
                                        {pi === parts.length - 1 && isLoading && i === messages.length - 1 && (
                                          <span className="inline-block w-[1px] h-3 bg-muted-foreground/60 animate-pulse ml-0.5 align-middle" />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  <div className="text-[8px] text-muted-foreground/40">{json.length} bytes</div>
                                </>
                              )
                            })()}
                          </div>
                          ) : (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="inline-block w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="inline-block w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                              <span className="ml-1">{_t("agent.thinking")}</span>
                            </div>
                          </>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {msg.content && msg.content !== "Done." && (
                  <div className="text-foreground leading-relaxed text-xs space-y-1.5 [&_p]:my-0 [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:my-1 [&_ol]:pl-4 [&_ol]:list-decimal [&_li]:my-0.5 [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_a]:text-primary [&_a]:underline [&_code]:bg-muted [&_code]:px-1 [&_code]:py-px [&_code]:rounded [&_code]:text-[11px] [&_code]:font-mono [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-[10px] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-2 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_hr]:my-2 [&_hr]:border-border">
                    <ReactMarkdown>{stripMarkdownTables(msg.content)}</ReactMarkdown>
                    {isLoading && i === messages.length - 1 && (
                      <span className="inline-block w-[2px] h-3.5 bg-foreground/70 animate-pulse ml-0.5 align-middle" />
                    )}
                  </div>
                )}
                {msg.sql && (
                  <div className="bg-muted rounded p-2 font-mono text-[10px] text-muted-foreground overflow-x-auto">
                    <div className="text-[10px] font-medium text-foreground mb-1">{_t("agent.sql_label")}</div>
                    <pre>{msg.sql}</pre>
                  </div>
                )}
                {msg.visualization && msg.visualization.config?.xKey && msg.visualization.config?.yKey && msg.rows && msg.columns && msg.rows.length > 0 && (
                  <>
                    <Chart
                      data={msg.rows.map((row) =>
                        Object.fromEntries(msg.columns!.map((col, i) => [col, row[i]]))
                      )}
                      config={{
                        type: msg.visualization.type || "bar",
                        xKey: msg.visualization.config.xKey,
                        yKey: msg.visualization.config.yKey,
                        title: msg.visualization.config.title,
                      }}
                      onClick={(item) => setClickedChart({ messageIndex: i, item })}
                    />
                    {clickedChart?.messageIndex === i && (
                      <div className="border border-border rounded p-2 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-foreground">{clickedChart.item.key}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-mono text-foreground">
                            {clickedChart.item.value.toLocaleString()}
                          </span>
                          <div className="flex-1" />
                          <button
                            onClick={() => {
                              setClickedChart(null)
                              const followUp = lang === "zh"
                                ? `详细分析 "${clickedChart.item.key}" 的数据，查询明细并列出前 20 行`
                                : `Analyze "${clickedChart.item.key}" in detail, query raw data and show top 20 rows`
                              sendMessage(followUp)
                            }}
                            className="text-[10px] text-primary hover:underline shrink-0"
                          >
                            {lang === "zh" ? "AI 深度分析" : "AI Deep Dive"}
                          </button>
                        </div>
                        <div className="overflow-x-auto border border-border rounded">
                          <table className="w-full text-[10px] border-collapse">
                            <thead>
                              <tr className="bg-muted/50">
                                {msg.columns!.map((col) => (
                                  <th key={col} className="px-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.rows
                                .filter((row) => {
                                  const xKey = msg.visualization!.config.xKey
                                  const idx = msg.columns!.indexOf(xKey)
                                  if (idx >= 0 && String(row[idx]) === clickedChart.item.key) return true
                                  const yKey = msg.visualization!.config.yKey
                                  const dimCols = msg.columns!.filter((c) => c !== yKey)
                                  const reconstructed = dimCols.slice(0, 3).map((c) => String(row[msg.columns!.indexOf(c)] ?? "")).join(" · ")
                                  return reconstructed === clickedChart.item.key
                                })
                                .slice(0, 5)
                                .map((row, ri) => (
                                  <tr key={ri} className="border-t border-border">
                                    {row.map((cell: unknown, ci: number) => (
                                      <td key={ci} className="px-2 py-1 truncate max-w-[120px]">
                                        {String(cell ?? "∅")}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
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
            aria-label={_t("agent.placeholder")}
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

function extractMessageFromPartial(json: string): string | null {
  const result = extractField(json, "message")
  if (!result) return null
  let msg = result.text
  const sqlResult = extractField(json, "sql")
  if (sqlResult?.text) {
    msg += "\n\n```sql\n" + sqlResult.text + "\n```"
  }
  return msg
}
