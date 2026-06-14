import type { Lang } from "@/lib/i18n"
import { t } from "@/lib/i18n"

export function formatRowCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function formatTime(ts: number, lang: Lang = "zh"): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return t("time.just_now", lang)
  if (diff < 3600000) return `${Math.floor(diff / 60000)}${t("time.minutes_ago", lang)}`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t("time.hours_ago", lang)}`
  return d.toLocaleDateString()
}
