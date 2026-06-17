"use client"

import { useLang } from "@/components/lang-provider"
import { useAgentChat } from "@/hooks/use-agent-chat"
import type { AssistantMessage } from "@/lib/agent-types"
import { Header } from "./agent-chat/header"
import { InputBar } from "./agent-chat/input-bar"
import { InitialSuggestions } from "./agent-chat/initial-suggestions"
import { AssistantMessage as AssistantMessageView } from "./agent-chat/assistant-message"

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
              <AssistantMessageView
                msg={msg as AssistantMessage} index={i} messagesLength={messages.length} ui={messageUI.get(i)}
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
