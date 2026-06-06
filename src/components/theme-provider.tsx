"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  resolved: "light" | "dark"
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
  resolved: "light",
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system"
  const stored = localStorage.getItem("theme")
  return (stored as Theme) ?? "system"
}

function applyTheme(theme: Theme) {
  const doc = document.documentElement
  doc.classList.remove("light", "dark")
  if (theme !== "system") {
    doc.classList.add(theme)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    setThemeState(stored)
    applyTheme(stored)
    setMounted(true)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem("theme", t)
    applyTheme(t)
  }

  const resolved =
    theme === "system" ? getSystemTheme() : theme

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  )
}
