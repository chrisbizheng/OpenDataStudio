"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function Header({ tableName, isLoading, messagesLength, onClear, onProfile, _t }: {
  tableName?: string | null
  isLoading: boolean
  messagesLength: number
  onClear: () => void
  onProfile: () => void
  _t: (k: string) => string
}) {
  const [clearDialogOpen, setClearDialogOpen] = useState(false)

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
          onClick={() => setClearDialogOpen(true)}
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
        <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
          <DialogContent showCloseButton={false} className="sm:max-w-sm">
            <DialogTitle>{_t("agent.clear_confirm_title")}</DialogTitle>
            <DialogDescription>{_t("agent.clear_confirm_desc")}</DialogDescription>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" size="sm" />}>
                {_t("agent.clear_confirm_cancel")}
              </DialogClose>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onClear()
                  setClearDialogOpen(false)
                }}
              >
                {_t("agent.clear_confirm_ok")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
