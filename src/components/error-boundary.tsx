"use client"

import { Component, type ReactNode } from "react"
import { t } from "@/lib/i18n"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  static getStoredLang() {
    if (typeof window === "undefined") return "zh"
    return (localStorage.getItem("lang") as "zh" | "en") || "zh"
  }

  render() {
    const lang = ErrorBoundary.getStoredLang()
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
          <div className="text-sm text-destructive font-medium">{t("error.title", lang)}</div>
          <p className="text-xs text-muted-foreground max-w-md text-center">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors"
            >
              {t("error.retry", lang)}
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t("error.reload", lang)}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}