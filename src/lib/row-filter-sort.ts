/**
 * 客户端行过滤纯函数模块。
 * 从 query-lifecycle.ts 和 pivot-client-utils.ts 提取共享的 matchRow 逻辑。
 */

/**
 * 判断单行是否匹配搜索关键词。
 * 对行内每个单元格执行 `String(cell ?? "").toLowerCase().includes(q)`，
 * 任一单元格匹配即返回 true。
 *
 * - null/undefined → 空字符串
 * - number → 数字转字符串（如 123 → "123"）
 * - array → 逗号拼接（如 [1,2,3] → "1,2,3"）
 * - object → "[object Object]"
 */
export function matchRow(row: unknown[], query: string): boolean {
  const q = query.toLowerCase()
  return row.some((cell) => String(cell ?? "").toLowerCase().includes(q))
}

/**
 * 按搜索关键词过滤二维行数组。
 * 空搜索词直接返回原数组引用（避免不必要复制）。
 */
export function filterRows(
  rows: unknown[][],
  searchQuery: string
): unknown[][] {
  if (!searchQuery.trim()) return rows
  return rows.filter((row) => matchRow(row, searchQuery))
}
