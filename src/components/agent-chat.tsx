"use client"

import { useLang } from "@/components/lang-provider"
import { SnakeSpinner } from "@/components/snake-spinner"
import ReactMarkdown from "react-markdown"
import { Chart } from "@/components/chart"
import { useAgentChat } from "@/hooks/use-agent-chat"
import { useChartDetailStore } from "@/stores/chart-detail"
import { stripMarkdownTables } from "@/lib/markdown-utils"
import { suggestFollowUp } from "@/lib/suggestions"
import { suggestDeepDiveDirections, type DeepDiveItem } from "@/lib/deep-dive-directions"
import { getChartNodeContext } from "@/lib/chart-node-context"
import { useState } from "react"
import { LayoutDashboard } from "lucide-react"
import { useDashboardsStore } from "@/stores/dashboards"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Message, MessageUIState } from "@/lib/agent-types"
import { createWidgetFromMessage } from "@/lib/widget-factory"

const MD_CLASS = "text-foreground leading-relaxed text-xs space-y-1.5 [&_p]:my-0 [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:my-1 [&_ol]:pl-4 [&_ol]:list-decimal [&_li]:my-0.5 [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_a]:text-primary [&_a]:underline [&_code]:bg-muted [&_code]:px-1 [&_code]:py-px [&_code]:rounded [&_code]:text-[11px] [&_code]:font-mono [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-[10px] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-2 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_hr]:my-2 [&_hr]:border-border"

interface AgentChatProps {
  tableName?: string | null
  schema?: { name: string; type: string; comment?: string }[]
  selectedDatabase?: string | null
  onSqlGenerated?: (sql: string) => void
}

export function AgentChat({ tableName, schema, selectedDatabase, onSqlGenerated }: AgentChatProps) {
  const { _t, lang } = useLang()
  const welcomeContent = _t("agent.welcome")
  const {
    messages, messageUI, input, isLoading, suggestions,
    aiInitialQuestions, aiFollowUpQuestions,
    isGeneratingInitialQuestions, isGeneratingFollowUpQuestions,
    chatRef, abortRef,
    setInput, sendMessage, stopGeneration, clearConversation,
    generateProfile, toggleThinking, generateAiDirections, generateAiQuestions,
  } = useAgentChat({
    tableName, schema, selectedDatabase, onSqlGenerated, lang, welcomeContent, _t,
  })

  return (
    <div className="flex flex-col h-full">
      <Header tableName={tableName} isLoading={isLoading} messagesLength={messages.length} onClear={clearConversation} onProfile={generateProfile} _t={_t} />
      <div className="flex-1 overflow-auto p-2 space-y-3" ref={chatRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`text-xs animate-fade-slide-in ${msg.role === "user" ? "text-right" : "text-left"}`}>
            {msg.role === "user" ? (
              <div className="inline-block bg-primary/10 text-foreground rounded-lg px-3 py-1.5 max-w-[85%] text-left">{msg.content}</div>
            ) : (
              <AssistantMessage
                msg={msg} index={i} messagesLength={messages.length} ui={messageUI.get(i)}
                isLoading={isLoading} schema={schema} lang={lang} _t={_t} messages={messages}
                aiFollowUpQuestions={aiFollowUpQuestions}
                isGeneratingFollowUpQuestions={isGeneratingFollowUpQuestions}
                onToggleThinking={toggleThinking}
                onGenerateAiDirections={generateAiDirections} onGenerateAiQuestions={generateAiQuestions}
                onSendMessage={sendMessage}
              />
            )}
          </div>
        ))}
        <InitialSuggestions isLoading={isLoading} messagesLength={messages.length} tableName={tableName} suggestions={suggestions} aiInitialQuestions={aiInitialQuestions} isGeneratingInitialQuestions={isGeneratingInitialQuestions} onSend={sendMessage} onGenerateAiQuestions={generateAiQuestions} _t={_t} lang={lang} />
      </div>
      <InputBar input={input} isLoading={isLoading} hasAbort={isLoading} onInputChange={setInput} onSend={sendMessage} onStop={stopGeneration} _t={_t} lang={lang} />
    </div>
  )
}

// PLACEHOLDER_SUBCOMPONENTS

function Header({ tableName, isLoading, messagesLength, onClear, onProfile, _t }: {
  tableName?: string | null
  isLoading: boolean
  messagesLength: number
  onClear: () => void
  onProfile: () => void
  _t: (k: string) => string
}) {
  return (
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
          onClick={onClear}
          disabled={isLoading || messagesLength <= 1}
          className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30"
          title={_t("agent.clear_conversation")}
        >
          {_t("agent.clear")}
        </button>
        <button
          onClick={onProfile}
          disabled={!tableName || isLoading}
          className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {_t("agent.generate_profile")}
        </button>
      </div>
    </div>
  )
}

function InputBar({ input, isLoading, hasAbort, onInputChange, onSend, onStop, _t, lang }: {
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
            className="px-2.5 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {_t("agent.send")}
          </button>
        )}
      </div>
    </div>
  )
}

function InitialSuggestions({ isLoading, messagesLength, tableName, suggestions, aiInitialQuestions, isGeneratingInitialQuestions, onSend, onGenerateAiQuestions, _t, lang }: {
  isLoading: boolean
  messagesLength: number
  tableName?: string | null
  suggestions: string[]
  aiInitialQuestions: string[] | null
  isGeneratingInitialQuestions: boolean
  onSend: (text: string) => void
  onGenerateAiQuestions: (input: { localQuestions: string[]; target: "initial" | "followUp" }) => Promise<void>
  _t: (k: string) => string
  lang: "zh" | "en"
}) {
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

function ThinkingPanel({ ui, isLoading, isLast, onToggle, _t }: {
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



function ChartDetailCard({ msg, index, schema, lang, _t, onGenerateAiDirections, onSendMessage }: {
  msg: Message
  index: number
  schema?: { name: string; type: string; comment?: string }[]
  lang: "zh" | "en"
  _t: (key: string) => string
  onGenerateAiDirections: (msg: Message, item: DeepDiveItem, localDirections: { label: string; prompt: string }[]) => Promise<void>
  onSendMessage: (text: string) => void
}) {
  const {
    clickedChart, deepDiveOpen, aiDirections, isGeneratingDirections,
    setClickedChart, setDeepDiveOpen, setAiDirections,
  } = useChartDetailStore()
  if (!clickedChart || clickedChart.messageIndex !== index) return null
  if (!msg.visualization || !msg.columns || !msg.rows) return null

  const nodeContext = getChartNodeContext({ item: clickedChart.item, visualization: msg.visualization, lang })

  return (
    <div className="border border-border rounded p-2 space-y-2 animate-fade-slide-in">
      <div className="space-y-1 text-xs">
        <div className="flex items-start gap-2">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-semibold text-foreground min-w-0">
            {nodeContext.dimensions.map(([field, value], di, arr) => (
              <span key={`${field}-${di}`} className="inline-flex items-center gap-1">
                <span>{field}</span>
                <span className="text-muted-foreground">=</span>
                <span>{String(value ?? "∅")}</span>
                {di < arr.length - 1 && <span className="text-muted-foreground">·</span>}
              </span>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setDeepDiveOpen((open) => !open)}
            className="text-[10px] text-primary hover:underline shrink-0"
          >
            {_t("agent.deep_dive")}
          </button>
        </div>
        <div className="font-mono text-foreground">
          {nodeContext.metricLabel} = {nodeContext.metricValue}
        </div>
      </div>
      {deepDiveOpen && (() => {
        const localDirections = suggestDeepDiveDirections({
          item: clickedChart.item,
          visualizationConfig: {
            type: msg.visualization.type || "bar",
            xKey: msg.visualization.config.xKey,
            yKey: msg.visualization.config.yKey,
            series: msg.visualization.config.series,
          },
          columns: msg.columns,
          rowCount: msg.rows.length,
          schema: schema ?? [],
          lang,
        })
        const directions = aiDirections ?? localDirections
        if (directions.length === 0) return null
        return (
          <div className="space-y-1 animate-fade-slide-in">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">
                {aiDirections ? _t("agent.ai_suggested_directions") : _t("agent.suggested_directions")}
              </span>
              <button
                onClick={() => onGenerateAiDirections(msg, clickedChart.item, localDirections)}
                disabled={isGeneratingDirections}
                className="text-[10px] text-primary hover:underline disabled:opacity-50"
              >
                {isGeneratingDirections ? _t("agent.generating") : _t("agent.ai_suggest")}
              </button>
            </div>
            {directions.map((direction, di) => (
              <button
                key={di}
                onClick={() => {
                  setDeepDiveOpen(false)
                  setAiDirections(null)
                  setClickedChart(null)
                  onSendMessage(direction.prompt)
                }}
                className="flex items-center gap-1.5 w-full text-left text-[10px] px-2 py-1.5 rounded bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-primary shrink-0">›</span>
                <span className="truncate">{direction.label}</span>
              </button>
            ))}
          </div>
        )
      })()}
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
            {msg.rows
              .filter((row) => {
                const xKey = msg.visualization!.config.xKey
                const idx = msg.columns!.indexOf(xKey)
                if (idx >= 0 && String(row[idx]) === clickedChart.item.key) return true
                const yKeys = msg.visualization!.config.series?.map((s) => s.yKey) ?? (msg.visualization!.config.yKey ? [msg.visualization!.config.yKey] : [])
                const dimCols = msg.columns!.filter((c) => !yKeys.includes(c))
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
  )
}

function DataTable({ rows, columns, _t }: { rows: unknown[][]; columns: string[]; _t: (k: string) => string }) {
  return (
    <div className="overflow-x-auto border border-border rounded">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-muted/50">
            {columns.map((col) => (
              <th key={col} className="px-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row, ri) => (
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
      {rows.length > 20 && (
        <div className="px-2 py-1 text-[10px] text-muted-foreground border-t border-border">
          {_t("agent.showing_rows")} {rows.length} {_t("agent.rows")}
        </div>
      )}
    </div>
  )
}

function MessageActions({ msg, index, messages, lang, _t, onSendMessage }: {
  msg: Message
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

function SuggestionList({ questions, onSend, lang, _t, title, aiLabel, isGenerating, onGenerateAi }: {
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

function AssistantMessage({ msg, index, messagesLength, ui, isLoading, schema, lang, _t, messages, aiFollowUpQuestions, isGeneratingFollowUpQuestions, onToggleThinking, onGenerateAiDirections, onGenerateAiQuestions, onSendMessage }: {
  msg: Message
  index: number
  messagesLength: number
  ui: MessageUIState | undefined
  isLoading: boolean
  schema?: { name: string; type: string; comment?: string }[]
  lang: "zh" | "en"
  _t: (k: string) => string
  messages: Message[]
  aiFollowUpQuestions: string[] | null
  isGeneratingFollowUpQuestions: boolean
  onToggleThinking: (index: number) => void
  onGenerateAiDirections: (msg: Message, item: DeepDiveItem, localDirections: { label: string; prompt: string }[]) => Promise<void>
  onGenerateAiQuestions: (input: { localQuestions: string[]; previousQuestion?: string; sql?: string; columns?: string[]; target: "initial" | "followUp" }) => Promise<void>
  onSendMessage: (text: string, baseMessages?: Message[]) => void
}) {
  const {
    clickedChart, deepDiveOpen, aiDirections, isGeneratingDirections,
    setClickedChart, setDeepDiveOpen, setAiDirections,
  } = useChartDetailStore()
  const [dashboardDialogOpen, setDashboardDialogOpen] = useState(false)
  const isLast = index === messagesLength - 1
  const showContent = msg.content && msg.content !== "Done." && !(index === 0 && msg.role === "assistant" && messagesLength > 1)

  return (
    <div className="space-y-2">
      <ThinkingPanel
        ui={ui}
        isLoading={isLoading}
        isLast={isLast}
        _t={_t}
        onToggle={() => onToggleThinking(index)}
      />
      {showContent && (
        <div className={MD_CLASS}>
          <ReactMarkdown>{stripMarkdownTables(msg.content, lang)}</ReactMarkdown>
          {isLoading && isLast && (
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
      {msg.visualization && msg.visualization.config?.xKey && (msg.visualization.config?.yKey || msg.visualization.config?.series?.length) && msg.rows && msg.columns && msg.rows.length > 0 && (
        <>
          <div className="group relative">
            <div className="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={() => setDashboardDialogOpen(true)}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-background/80 hover:bg-background border border-border text-muted-foreground hover:text-foreground shadow-xs"
              >
                <LayoutDashboard className="w-3 h-3" />
                {_t("dashboard.add_to")}
              </button>
            </div>
            <Chart
              data={msg.rows.map((row) =>
                Object.fromEntries(msg.columns!.map((col, i) => [col, row[i]]))
              )}
              config={{
                type: msg.visualization.type || "bar",
                xKey: msg.visualization.config.xKey,
                yKey: msg.visualization.config.yKey,
                series: msg.visualization.config.series,
                title: msg.visualization.config.title,
              }}
              onClick={(item) => {
                setClickedChart({ messageIndex: index, item })
                setDeepDiveOpen(false)
                setAiDirections(null)
              }}
            />
          </div>
          <ChartDetailCard
            msg={msg}
            index={index}
            schema={schema}
            lang={lang}
            _t={_t}
            onGenerateAiDirections={onGenerateAiDirections}
            onSendMessage={onSendMessage}
          />
          <DashboardSelectorDialog
            open={dashboardDialogOpen}
            onOpenChange={setDashboardDialogOpen}
            msg={msg}
            index={index}
            _t={_t}
          />
        </>
      )}
      {msg.rows && msg.columns && msg.rows.length > 0 && (
        <DataTable rows={msg.rows} columns={msg.columns} _t={_t} />
      )}
      {!isLoading && msg.role === "assistant" && msg.content && msg.content !== "Done." && (msg.sql || msg.rows) && (
        <MessageActions msg={msg} index={index} messages={messages} lang={lang} _t={_t} onSendMessage={onSendMessage} />
      )}
      {!isLoading && isLast && msg.sql && (() => {
        const userMsg = messages[index - 1]
        if (!userMsg || userMsg.role !== "user") return null
        const hasLaterUserMsg = messages.slice(index + 1).some((m) => m.role === "user")
        if (hasLaterUserMsg) return null
        const localFollowUps = suggestFollowUp(userMsg.content, msg.sql, msg.columns, lang)
        const followUps = aiFollowUpQuestions ?? localFollowUps
        if (followUps.length === 0) return null
        return (
          <SuggestionList
            questions={followUps}
            onSend={onSendMessage}
            lang={lang}
            _t={_t}
            title={_t("agent.try_asking")}
            aiLabel={_t("agent.ai_suggest_questions")}
            isGenerating={isGeneratingFollowUpQuestions}
            onGenerateAi={() => onGenerateAiQuestions({ localQuestions: localFollowUps, previousQuestion: userMsg.content, sql: msg.sql, columns: msg.columns, target: "followUp" })}
          />
        )
      })()}
    </div>
  )
}

function DashboardSelectorDialog({ open, onOpenChange, msg, index, _t }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  msg: Message
  index: number
  _t: (k: string) => string
}) {
  const { dashboards, createDashboard, addWidget } = useDashboardsStore()
  const [adding, setAdding] = useState<string | null>(null)
  const [showNewInput, setShowNewInput] = useState(false)
  const [newName, setNewName] = useState("")

  const addToDashboard = async (dashboardId: string) => {
    setAdding(dashboardId)
    try {
      const widget = await createWidgetFromMessage(msg, index)
      if (widget) {
        addWidget(dashboardId, widget)
        onOpenChange(false)
      }
    } catch {
      // widget-factory not ready yet, fail silently
    } finally {
      setAdding(null)
    }
  }

  const handleCreateNew = async () => {
    const name = newName.trim() || _t("dashboard.create_new")
    const id = createDashboard(name)
    setShowNewInput(false)
    setNewName("")
    await addToDashboard(id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>{_t("dashboard.select_dashboard")}</DialogTitle>
        <div className="space-y-1 max-h-60 overflow-y-auto py-1">
          {dashboards.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-muted/40">
              <span className="text-xs truncate flex-1">{d.name}</span>
              <Button size="xs" variant="outline" onClick={() => addToDashboard(d.id)} disabled={adding === d.id}>
                {adding === d.id ? "..." : _t("dashboard.add_to")}
              </Button>
            </div>
          ))}
          {dashboards.length === 0 && !showNewInput && (
            <p className="text-xs text-muted-foreground text-center py-4">{_t("dashboard.create_new")}</p>
          )}
        </div>
        <div className="border-t border-border pt-2">
          {showNewInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateNew() }}
                placeholder={_t("dashboard.create_new")}
                className="flex-1 px-2 py-1 text-xs rounded border border-border bg-background outline-none focus:border-ring"
                autoFocus
              />
              <Button size="xs" onClick={handleCreateNew}>{_t("dashboard.add_to")}</Button>
            </div>
          ) : (
            <Button variant="outline" size="xs" className="w-full" onClick={() => setShowNewInput(true)}>
              + {_t("dashboard.create_new")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
