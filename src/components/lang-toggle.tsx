"use client"

import { useLang } from "./lang-provider"
import { t } from "@/lib/i18n"

export function LangToggle() {
  const { lang, setLang } = useLang()

  return (
    <button
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors text-[11px] font-medium"
      title={t("lang.switch", lang)}
    >
      {t("lang.switch", lang)}
    </button>
  )
}
