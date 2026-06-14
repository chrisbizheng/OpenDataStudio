import { t, type Lang } from "@/lib/i18n"

export function stripMarkdownTables(text: string, lang: Lang): string {
  const lines = text.split("\n")
  const out: string[] = []
  let removed = 0
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const next = lines[i + 1] || ""
    const looksLikeTableHeader = /^\s*\|.*\|\s*$/.test(line)
    const looksLikeSeparator = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(next)
    if (looksLikeTableHeader && looksLikeSeparator) {
      i += 2
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        i++
        removed++
      }
      removed += 2
      continue
    }
    out.push(line)
    i++
  }
  if (removed > 0) out.push(`_${t("agent.tables_hidden", lang).replace("{count}", String(removed))}_`)
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}
