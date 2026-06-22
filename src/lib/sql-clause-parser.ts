// SQL clause parser — shared utilities for extracting structured info from SQL strings.

/**
 * Parse GROUP BY columns from a SQL string.
 * Strips backticks, strips AS aliases, comma-splits, trims.
 *
 * Example: "GROUP BY `city`, sum_sales AS total" → ["city", "sum_sales"]
 */
export function parseGroupByColumns(sql: string): string[] {
  const match = sql.match(
    /\bGROUP\s+BY\b\s+([\s\S]+?)(?:\bORDER\b|\bLIMIT\b|\bHAVING\b|\bUNION\b|$)/i
  )
  if (!match) return []

  return match[1]
    .split(",")
    .map((c) =>
      c
        .trim()
        .replace(/^`|`$/g, "")           // strip backticks
        .replace(/\s+AS\s+\S+$/i, "")    // strip AS alias
        .trim()
    )
    .filter(Boolean)
}
