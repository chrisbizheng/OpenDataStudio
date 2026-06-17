"use client"

import { useEffect, useState } from "react"

/**
 * Watch document root .dark class and report current dark state.
 * Replaces inline MutationObserver in CodeMirror consumers.
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])
  return isDark
}
