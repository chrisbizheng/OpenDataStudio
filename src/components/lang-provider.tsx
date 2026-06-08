"use client"

import { createContext, useContext, useCallback, useMemo, useState } from "react"
import type { Lang } from "@/lib/i18n"
import { t, getStoredLang, setStoredLang } from "@/lib/i18n"

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  _t: (key: string) => string
}

const LangContext = createContext<LangContextValue>({
  lang: "zh",
  setLang: () => {},
  _t: (key) => key,
})

export function useLang() {
  return useContext(LangContext)
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getStoredLang())

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    setStoredLang(l)
  }, [])

  const _t = useCallback((key: string) => t(key, lang), [lang])

  const value = useMemo(() => ({ lang, setLang, _t }), [lang, setLang, _t])

  return (
    <LangContext.Provider value={value}>
      {children}
    </LangContext.Provider>
  )
}
