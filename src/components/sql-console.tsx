"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLang } from "@/components/lang-provider"
import { useIsDark } from "@/hooks/use-is-dark"
import CodeMirror from "@uiw/react-codemirror"
import { sql, keywordCompletionSource } from "@codemirror/lang-sql"
import { autocompletion, acceptCompletion, moveCompletionSelection } from "@codemirror/autocomplete"
import { keymap } from "@codemirror/view"
import { vscodeDark, vscodeLight } from "@/lib/vscode-theme-override"
import { ClickHouseDialect, createChCompletionSource } from "@/lib/sql-editor-support"
import type { ColumnMeta } from "@/lib/types"

interface SqlConsoleProps {
  sql: string
  onSqlChange: (sql: string) => void
  onExecute: (sql: string) => void
  onCancel?: () => void
  onSave: (sql: string) => void
  isExecuting: boolean
  tableName?: string | null
  selectedDatabase?: string | null
  schema?: ColumnMeta[]
}

export function SqlConsole({
  sql: sqlText,
  onSqlChange,
  onExecute,
  onCancel,
  onSave,
  isExecuting,
  tableName,
  selectedDatabase,
  schema,
}: SqlConsoleProps) {
  const { _t } = useLang()

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        onExecute(sqlText)
      }
    },
    [sqlText, onExecute]
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

  const completionSource = useMemo(
    () => createChCompletionSource({
      databases: selectedDatabase ? [selectedDatabase] : [],
      tableNames: {
        current: tableName ? [tableName] : [],
        all: tableName && selectedDatabase ? [{ db: selectedDatabase, table: tableName }] : [],
      },
      tablesForDb: () => tableName ? [tableName] : [],
      columnsFor: (_db, table) => (table === tableName ? (schema ?? []) : []),
    }),
    [selectedDatabase, tableName, schema]
  )

  const extensions = useMemo(() => [
    sql({ dialect: ClickHouseDialect }),
    autocompletion({
      activateOnTyping: true,
      override: [
        completionSource,
        keywordCompletionSource(ClickHouseDialect, true),
      ],
    }),
    keymap.of([
      { key: "Space", run: acceptCompletion },
      { key: "Tab", run: moveCompletionSelection(true) },
      { key: "Shift-Tab", run: moveCompletionSelection(false) },
    ]),
  ], [completionSource])

  const isDark = useIsDark()

  const activeTheme = isDark ? vscodeDark : vscodeLight

  return (
    <div className="flex flex-col h-full">
      <style>{`
        .cm-editor { height: 100% !important; }
        .cm-scroller { overflow: auto !important; }
      `}</style>
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border shrink-0">
        {isExecuting && onCancel ? (
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
            title={_t("sql.stop_hint") || "Cancel running query"}
          >
            <span className="inline-block w-2.5 h-2.5 bg-current rounded-sm" />
            {_t("sql.stop") || "Stop"}
          </button>
        ) : (
          <button
            onClick={() => onExecute(sqlText)}
            disabled={isExecuting || !sqlText.trim()}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isExecuting ? (
              <span className="inline-block w-3 h-3 border-2 border-border border-t-primary rounded-full animate-spin" />
            ) : (
              "▶"
            )}
            {_t("sql.run")}
          </button>
        )}
        <button
          onClick={() => onSave(sqlText)}
          disabled={!sqlText.trim()}
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
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={sqlText}
          onChange={onSqlChange}
          extensions={extensions}
          theme={activeTheme}
          height="100%"
          basicSetup={{ lineNumbers: false, foldGutter: false, indentOnInput: true, autocompletion: true }}
          placeholder={_t("sql.placeholder")}
          className="text-xs [&_.cm-editor]:h-full [&_.cm-content]:font-mono"
        />
      </div>
    </div>
  )
}
