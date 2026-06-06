"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLang } from "@/components/lang-provider"
import CodeMirror from "@uiw/react-codemirror"
import { sql as sqlLang } from "@codemirror/lang-sql"
import { oneDark } from "@codemirror/theme-one-dark"

interface SqlConsoleProps {
  sql: string
  onSqlChange: (sql: string) => void
  onExecute: (sql: string) => void
  onSave: (sql: string) => void
  isExecuting: boolean
  tableName?: string | null
  selectedDatabase?: string | null
}

export function SqlConsole({
  sql,
  onSqlChange,
  onExecute,
  onSave,
  isExecuting,
  tableName,
  selectedDatabase,
}: SqlConsoleProps) {
  const { _t } = useLang()
  const [isFocused, setIsFocused] = useState(false)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        onExecute(sql)
      }
    },
    [sql, onExecute]
  )

  const insertSelectLimit = useCallback(() => {
    if (tableName) {
      const q = selectedDatabase ? `${selectedDatabase}.${tableName}` : tableName
      const snippet = `SELECT *\nFROM ${q}\nLIMIT 1000`
      onSqlChange(snippet)
      onExecute(snippet)
    } else {
      const snippet = `SELECT 1`
      onSqlChange(snippet)
    }
  }, [tableName, selectedDatabase, onSqlChange, onExecute])

  const extensions = useMemo(() => [sqlLang()], [])

  return (
    <div className="flex flex-col h-full">
      <style>{`
        .cm-editor, .cm-scroller, .cm-content, .cm-gutters {
          background: transparent !important;
        }
        .cm-editor { height: 100% !important; }
        .cm-scroller { overflow: auto !important; }
      `}</style>
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border shrink-0">
        <button
          onClick={() => onExecute(sql)}
          disabled={isExecuting || !sql.trim()}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isExecuting ? (
            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            "▶"
          )}
          {_t("sql.run")}
        </button>
        <button
          onClick={() => onSave(sql)}
          disabled={!sql.trim()}
          className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground rounded hover:bg-muted"
          title="Save current query"
        >
          {_t("sql.save")}
        </button>
        <div className="flex-1" />
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={insertSelectLimit}
          className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground rounded hover:bg-muted"
          title="Insert SELECT * LIMIT 1000"
        >
          {_t("sql.insert_select")}
        </button>
      </div>
      <div className="flex-1 overflow-auto" onClick={() => setIsFocused(true)}>
        <CodeMirror
          value={sql}
          onChange={onSqlChange}
          extensions={extensions}
          theme={oneDark}
          height="100%"
          basicSetup={{ lineNumbers: false, foldGutter: false, indentOnInput: true, autocompletion: false }}
          placeholder={_t("sql.placeholder")}
          className="text-xs [&_.cm-editor]:h-full [&_.cm-editor,&_.cm-scroller,&_.cm-content,&_.cm-gutters]:!bg-transparent [&_.cm-content]:font-mono"
        />
      </div>
    </div>
  )
}
