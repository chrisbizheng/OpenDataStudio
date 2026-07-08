"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { LayoutDashboard, Table2 } from "lucide-react"
import { Chart } from "@/components/chart"
import { useLang } from "@/components/lang-provider"
import { useData } from "@/components/data-provider"
import { useUiStore } from "@/stores/ui"
import { useChartDetailStore } from "@/stores/chart-detail"
import { useAgentChatSessionStore } from "@/stores/agent-chat-session"
import { stripMarkdownTables } from "@/lib/markdown-utils"
import { suggestFollowUp } from "@/lib/suggestions"
import type { AssistantMessage, Message, MessageUIState } from "@/lib/agent-types"
import type { DeepDiveItem } from "@/lib/deep-dive-directions"
import { MD_CLASS } from "./md-class"

const EMPTY_MESSAGES: Message[] = []
import { ThinkingPanel } from "./thinking-panel"
import { ChartDetailCard } from "./chart-detail-card"
import { DashboardSelectorDialog } from "./dashboard-selector-dialog"
import { DataTable } from "./data-table"
import { MessageActions } from "./message-actions"
import { SuggestionList } from "./suggestion-list"

export function AssistantMessage({ msg, index, messagesLength, ui, schema, chatKey, onToggleThinking, onGenerateAiDirections, onGenerateAiQuestions, onSendMessage }: {
  msg: AssistantMessage
  index: number
  messagesLength: number
  ui: MessageUIState | undefined
  schema?: { name: string; type: string; comment?: string }[]
  chatKey: string
  onToggleThinking: (index: number) => void
  onGenerateAiDirections: (msg: AssistantMessage, item: DeepDiveItem, localDirections: { label: string; prompt: string }[]) => Promise<void>
  onGenerateAiQuestions: (input: { localQuestions: string[]; previousQuestion?: string; sql?: string; columns?: string[]; target: "initial" | "followUp" }) => Promise<void>
  onSendMessage: (text: string, baseMessages?: Message[]) => void
}) {
  const { _t, lang } = useLang()
  const { queryLifecycle } = useData()
  const messages = useAgentChatSessionStore((s) => s.sessions[chatKey]?.messages ?? EMPTY_MESSAGES)
  const aiFollowUpQuestions = useAgentChatSessionStore((s) => s.sessions[chatKey]?.aiFollowUpQuestions ?? null)
  const isGeneratingFollowUpQuestions = useAgentChatSessionStore((s) => s.sessions[chatKey]?.isGeneratingFollowUpQuestions ?? false)
  const isLoading = useAgentChatSessionStore((s) => s.sessions[chatKey]?.isLoading ?? false)
  const {
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
        <div className="group relative bg-muted rounded p-2 font-mono text-[10px] text-muted-foreground overflow-x-auto">
          <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => {
                useUiStore.getState().setPivotView("grid")
                queryLifecycle.setSql(msg.sql!)
                queryLifecycle.setPendingAutoExecute(msg.sql!)
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-background/80 hover:bg-background border border-border text-muted-foreground hover:text-foreground shadow-xs"
            >
              <Table2 className="w-3 h-3" />
              {_t("agent.add_to_grid")}
            </button>
          </div>
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
            onGenerateAiDirections={onGenerateAiDirections}
            onSendMessage={onSendMessage}
          />
          <DashboardSelectorDialog
            open={dashboardDialogOpen}
            onOpenChange={setDashboardDialogOpen}
            msg={msg}
            index={index}
          />
        </>
      )}
      {msg.rows && msg.columns && msg.rows.length > 0 && (
        <DataTable rows={msg.rows} columns={msg.columns} />
      )}
      {!isLoading && msg.role === "assistant" && msg.content && msg.content !== "Done." && (msg.sql || msg.rows) && (
        <MessageActions msg={msg} index={index} messages={messages} onSendMessage={onSendMessage} />
      )}
      {!isLoading && isLast && msg.sql && (
        <FollowUpSuggestions
          msg={msg}
          index={index}
          messages={messages}
          aiFollowUpQuestions={aiFollowUpQuestions}
          isGeneratingFollowUpQuestions={isGeneratingFollowUpQuestions}
          onGenerateAiQuestions={onGenerateAiQuestions}
          onSendMessage={onSendMessage}
        />
      )}
    </div>
  )
}

function FollowUpSuggestions({
  msg,
  index,
  messages,
  aiFollowUpQuestions,
  isGeneratingFollowUpQuestions,
  onGenerateAiQuestions,
  onSendMessage,
}: {
  msg: AssistantMessage
  index: number
  messages: Message[]
  aiFollowUpQuestions: string[] | null
  isGeneratingFollowUpQuestions: boolean
  onGenerateAiQuestions: (input: { localQuestions: string[]; previousQuestion?: string; sql?: string; columns?: string[]; target: "initial" | "followUp" }) => Promise<void>
  onSendMessage: (text: string, baseMessages?: Message[]) => void
}) {
  const { _t, lang } = useLang()
  if (!msg.sql) return null
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
      onSend={(text: string) => onSendMessage(text)}
      title={_t("agent.try_asking")}
      aiLabel={_t("agent.ai_suggest_questions")}
      isGenerating={isGeneratingFollowUpQuestions}
      onGenerateAi={() => { onGenerateAiQuestions({ localQuestions: localFollowUps, previousQuestion: userMsg.content, sql: msg.sql, columns: msg.columns, target: "followUp" }) }}
    />
  )
}
