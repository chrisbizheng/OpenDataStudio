"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLang } from "@/components/lang-provider"
import { useLlmStore } from "@/stores/llm-config"
import type { LlmConfig } from "@/lib/agent-types"

export function SettingsDialog() {
  const { _t } = useLang()
  const { config, setConfig } = useLlmStore()
  const [local, setLocal] = useState(config)
  const [open, setOpen] = useState(false)
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")

  useEffect(() => {
    if (open) {
      setLocal(config)
      setTestStatus("idle")
    }
  }, [open, config])

  const handleSave = () => {
    setConfig(local)
    setOpen(false)
  }

  const handleTest = async () => {
    setTestStatus("testing")
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-llm-config": btoa(JSON.stringify(local)),
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Say 'OK' if you can hear me." }],
          context: {},
        }),
      })
      setTestStatus(res.ok ? "success" : "error")
    } catch {
      setTestStatus("error")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors" aria-label={_t("settings.title")}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{_t("settings.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{_t("settings.provider")}</Label>
            <Select
              value={local.provider}
              onValueChange={(v) => {
                if (!v) return
                const updates: Partial<LlmConfig> = { provider: v }
                if (v === "openai") {
                  updates.baseUrl = "https://api.openai.com/v1"
                  updates.model = "gpt-4o"
                } else {
                  updates.baseUrl = "http://localhost:11434/v1"
                  updates.model = "llama3"
                }
                setLocal({ ...local, ...updates })
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{_t("settings.api_key")}</Label>
            <Input
              type="password"
              value={local.apiKey}
              onChange={(e) => setLocal({ ...local, apiKey: e.target.value })}
              placeholder={local.provider === "openai" ? _t("settings.api_key_placeholder") : _t("settings.api_key_ollama")}
            />
          </div>
          <div className="space-y-2">
            <Label>{_t("settings.base_url")}</Label>
            <Input
              value={local.baseUrl}
              onChange={(e) => setLocal({ ...local, baseUrl: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{_t("settings.model")}</Label>
            <Input
              value={local.model}
              onChange={(e) => setLocal({ ...local, model: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testStatus === "testing"}>
              {testStatus === "testing" ? _t("settings.testing") : _t("settings.test")}
            </Button>
            {testStatus === "success" && <span className="text-xs text-emerald-600">{_t("settings.connected")}</span>}
            {testStatus === "error" && <span className="text-xs text-destructive">{_t("settings.failed")}</span>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{_t("settings.cancel")}</Button>
            <Button onClick={handleSave}>{_t("settings.save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
