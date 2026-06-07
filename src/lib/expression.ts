export interface ParsedExpression {
  raw: string
  refs: string[]
  sql: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

const REF_PATTERN = /\[\[([^\]]+)\]\]/g

export function extractDependencies(expression: string): string[] {
  const deps: string[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null
  const re = new RegExp(REF_PATTERN.source, "g")
  while ((match = re.exec(expression)) !== null) {
    const key = match[1].trim()
    if (!seen.has(key)) {
      seen.add(key)
      deps.push(key)
    }
  }
  return deps
}

export function validate(
  expression: string,
  availableIndicatorKeys: string[]
): ValidationResult {
  const errors: string[] = []
  const refs = extractDependencies(expression)
  const available = new Set(availableIndicatorKeys)

  for (const ref of refs) {
    if (!available.has(ref)) {
      errors.push(`指标 [[${ref}]] 不存在`)
    }
  }

  if (refs.length === 0 && expression.trim().length > 0) {
    const hasOperators = /[+\-*/()]/.test(expression)
    if (!hasOperators) {
      errors.push("表达式中没有引用任何指标")
    }
  }

  return { valid: errors.length === 0, errors }
}

export function toSQL(
  expression: string,
  indicatorToSQLMap: Record<string, string>
): string {
  let sql = expression

  sql = sql.replace(/\[\[([^\]]+)\]\]/g, (_match, key: string) => {
    const trimmed = key.trim()
    const sqlExpr = indicatorToSQLMap[trimmed]
    if (!sqlExpr) {
      return `/* missing: ${trimmed} */`
    }
    return `(${sqlExpr})`
  })

  sql = sql.replace(
    /\/\s*\(([^)]+)\)/g,
    (_match, denominator: string) => `/ NULLIF(${denominator.trim()}, 0)`
  )

  return sql
}

export function parse(
  expression: string,
  indicatorToSQLMap: Record<string, string>
): ParsedExpression {
  const refs = extractDependencies(expression)
  const sql = toSQL(expression, indicatorToSQLMap)
  return { raw: expression, refs, sql }
}
