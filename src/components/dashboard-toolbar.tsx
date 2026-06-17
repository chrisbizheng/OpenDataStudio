"use client"

import { useCallback } from "react"
import { ExternalLink, Save, Upload, Pencil, CheckCircle2, FileCode, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DashboardToolbarProps {
  name: string
  isPublished: boolean
  isDirty: boolean
  dashboardId: string
  onSave: () => void
  onPublish: () => void
  onEditDraft: () => void
  onNewSql: () => void
  onNewAi: () => void
  _t: (key: string) => string
}

export function DashboardToolbar({
  name,
  isPublished,
  isDirty,
  dashboardId,
  onSave,
  onPublish,
  onEditDraft,
  onNewSql,
  onNewAi,
  _t,
}: DashboardToolbarProps) {
  const handleOpenView = useCallback(() => {
    window.open(`/dashboard/${dashboardId}`, "_blank")
  }, [dashboardId])

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{name}</span>
        <Badge variant={isPublished ? "default" : "secondary"} className="text-[10px]">
          {isPublished ? (
            <>
              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
              {_t("dashboard.published")}
            </>
          ) : (
            _t("dashboard.draft")
          )}
        </Badge>
        {isDirty && (
          <Badge variant="destructive" className="text-[10px]">
            {_t("dashboard.unsaved")}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!isPublished && (
          <>
            <Button size="xs" variant="outline" onClick={onNewSql}>
              <FileCode className="h-3 w-3 mr-1" />
              {_t("dashboard.new_sql")}
            </Button>
            <Button size="xs" variant="outline" onClick={onNewAi}>
              <MessageSquare className="h-3 w-3 mr-1" />
              {_t("dashboard.new_ai")}
            </Button>
          </>
        )}
        {isPublished ? (
          <>
            <Button size="xs" variant="outline" onClick={handleOpenView}>
              <ExternalLink className="h-3 w-3 mr-1" />
              {_t("dashboard.view_open")}
            </Button>
            <Button size="xs" variant="outline" onClick={onEditDraft}>
              <Pencil className="h-3 w-3 mr-1" />
              {_t("dashboard.edit_draft")}
            </Button>
          </>
        ) : (
          <>
            <Button size="xs" variant="outline" onClick={onSave} disabled={!isDirty}>
              <Save className="h-3 w-3 mr-1" />
              {_t("dashboard.save")}
            </Button>
            <Button size="xs" variant="default" onClick={onPublish}>
              <Upload className="h-3 w-3 mr-1" />
              {_t("dashboard.publish")}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
