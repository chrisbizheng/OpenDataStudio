"use client";

import { useState } from "react";
import { useDashboardsStore } from "@/stores/dashboards";
import { useLang } from "@/components/lang-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, LayoutDashboard, CheckCircle2 } from "lucide-react";

export function DashboardList() {
  const { _t, lang } = useLang();
  const {
    dashboards,
    activeDashboardId,
    createDashboard,
    deleteDashboard,
    updateDashboard,
    setActiveDashboard,
  } = useDashboardsStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const dict: Record<string, { zh: string; en: string }> = {
    "dashboard.list.title": { zh: "仪表盘", en: "Dashboards" },
    "dashboard.list.new": { zh: "新建", en: "New" },
    "dashboard.list.empty": { zh: "暂无仪表盘", en: "No dashboards" },
    "dashboard.list.defaultName": { zh: "未命名仪表盘", en: "Untitled Dashboard" },
  };

  const t = (key: string) => dict[key]?.[lang] ?? key;

  const handleCreate = () => {
    const id = createDashboard(t("dashboard.list.defaultName"));
    setActiveDashboard(id);
  };

  const handleStartRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleFinishRename = (id: string) => {
    if (editName.trim()) {
      updateDashboard(id, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      handleFinishRename(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditName("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <LayoutDashboard className="h-3.5 w-3.5" />
          {t("dashboard.list.title")}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-xs"
          onClick={handleCreate}
        >
          <Plus className="h-3.5 w-3.5 mr-0.5" />
          {t("dashboard.list.new")}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {dashboards.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">
            {t("dashboard.list.empty")}
          </div>
        ) : (
          <div className="space-y-0.5">
            {dashboards.map((db) => (
              <div
                key={db.id}
                className={cn(
                  "group flex items-center gap-1 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors",
                  activeDashboardId === db.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => setActiveDashboard(db.id)}
              >
                {editingId === db.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleFinishRename(db.id)}
                    onKeyDown={(e) => handleKeyDown(e, db.id)}
                    className="h-5 text-xs px-1 py-0 flex-1"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    {db.status === "published" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    ) : (
                      <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="flex-1 truncate">{db.name}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(db.id, db.name);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDashboard(db.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
