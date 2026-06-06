"use client"

import { createContext, useContext, useEffect, useState } from "react"
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
  const [lang, setLangState] = useState<Lang>("zh")

  useEffect(() => {
    setLangState(getStoredLang())
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    setStoredLang(l)
  }

  const _t = (key: string) => t(key, lang)

  return (
    <LangContext.Provider value={{ lang, setLang, _t }}>
      {children}
    </LangContext.Provider>
  )
}
