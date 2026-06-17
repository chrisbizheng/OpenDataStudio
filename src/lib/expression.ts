import type { ExpressionNode } from "./ast-types"
import { escapeField } from "./sql-utils"

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface ToSQLOptions {
  useWindow?: boolean
  useAnyValue?: boolean
}

export interface MigrationResult {
  node: ExpressionNode
  errors: string[]
}

const DIVIDE_FUNCS = new Set(["divide", "/"])

export function extractDependencies(node: ExpressionNode): string[] {
  const deps: string[] = []
  const seen = new Set<string>()

  function walk(n: ExpressionNode) {
    if (n.type === "ref") {
      if (!seen.has(n.key)) {
        seen.add(n.key)
        deps.push(n.key)
      }
    } else if (n.type === "call") {
      for (const arg of n.args) walk(arg)
    }
  }

  walk(node)
  return deps
}

export function validate(
  node: ExpressionNode,
  availableIndicatorKeys: string[],
  availableFields?: string[]
): ValidationResult {
  const errors: string[] = []
  const available = new Set(availableIndicatorKeys)
  const fields = availableFields ? new Set(availableFields) : null

  function walk(n: ExpressionNode) {
    if (n.type === "ref") {
      if (!available.has(n.key)) {
        errors.push(`指标 [[${n.key}]] 不存在`)
      }
    } else if (n.type === "agg") {
      if (fields && !fields.has(n.field)) {
        errors.push(`字段 ${n.field} 不存在`)
      }
    } else if (n.type === "call") {
      for (const arg of n.args) walk(arg)
    }
  }

  walk(node)
  return { valid: errors.length === 0, errors }
}

export function cloneNode(node: ExpressionNode): ExpressionNode {
  if (node.type === "ref") return { type: "ref", key: node.key }
  if (node.type === "field") return { type: "field", name: node.name }
  if (node.type === "literal") return { type: "literal", value: node.value, dataType: node.dataType }
  if (node.type === "agg") return { type: "agg", func: node.func, field: node.field }
  return { type: "call", func: node.func, args: node.args.map(cloneNode) }
}

const BINARY_OPS: Record<string, string> = {
  plus: "+", minus: "-", multiply: "*", divide: "/",
}

export function astToSummary(node: ExpressionNode): string {
  if (node.type === "ref") return `@${node.key}`
  if (node.type === "field") return node.name
  if (node.type === "literal") return String(node.value)
  if (node.type === "agg") {
    if (node.func === "COUNT_DISTINCT") return `COUNT(DISTINCT ${node.field})`
    return `${node.func}(${node.field})`
  }
  const op = BINARY_OPS[node.func]
  if (op && node.args.length === 2) {
    return `${astToSummary(node.args[0])} ${op} ${astToSummary(node.args[1])}`
  }
  return `${node.func}(${node.args.map(astToSummary).join(", ")})`
}

export function toSQL(
  node: ExpressionNode,
  indicatorToSQLMap: Record<string, string>,
  options: ToSQLOptions = {}
): string {
  return toSQLNode(node, indicatorToSQLMap, options)
}

function toSQLNode(
  node: ExpressionNode,
  indicatorToSQLMap: Record<string, string>,
  options: ToSQLOptions
): string {
  if (node.type === "ref") {
    const sqlExpr = indicatorToSQLMap[node.key]
    if (!sqlExpr) return `/* missing: ${node.key} */`
    return `(${sqlExpr})`
  }
  if (node.type === "field") {
    if (options.useAnyValue) return `ANY_VALUE(${escapeField(node.name)})`
    return escapeField(node.name)
  }
  if (node.type === "literal") {
    if (typeof node.value === "number") return String(node.value)
    return `'${String(node.value).replace(/'/g, "''")}'`
  }
  if (node.type === "agg") {
    const f = escapeField(node.field)
    let sql: string
    if (node.func === "COUNT_DISTINCT") {
      sql = `COUNT(DISTINCT ${f})`
    } else {
      sql = `${node.func}(${f})`
    }
    if (options.useWindow) sql += " OVER()"
    return sql
  }
  // call
  const args = node.args.map((arg) => toSQLNode(arg, indicatorToSQLMap, options))
  let result = `${node.func}(${args.join(", ")})`
  if (DIVIDE_FUNCS.has(node.func) && args.length >= 2) {
    result = `${node.func}(${args[0]}, NULLIF(${args[1]}, 0))`
  }
  return result
}

const AGG_FUNCS = new Set([
  "SUM", "AVG", "COUNT", "MIN", "MAX", "COUNT_DISTINCT",
  "sum", "avg", "count", "min", "max",
])

export function migrateExpressionToAST(
  expression: string,
  indicatorKeyMap: Record<string, string>,
  schemaFields?: string[]
): MigrationResult {
  const errors: string[] = []
  const node = parseExpression(expression, indicatorKeyMap, schemaFields, errors)
  return { node, errors }
}

function parseExpression(
  expr: string,
  keyMap: Record<string, string>,
  schemaFields: string[] | undefined,
  errors: string[]
): ExpressionNode {
  const trimmed = expr.trim()

  if (trimmed === "") {
    return { type: "literal", value: 0, dataType: "Int64" }
  }

  const refMatch = /^\[\[([^\]]+)\]\]$/.exec(trimmed)
  if (refMatch) return { type: "ref", key: refMatch[1].trim() }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { type: "literal", value: Number(trimmed), dataType: /\./.test(trimmed) ? "Float64" : "Int64" }
  }

  const aggMatch = /^(\w+)\s*\(([\s\S]+)\)$/.exec(trimmed)
  if (aggMatch) {
    const funcUpper = aggMatch[1].toUpperCase()
    const funcLower = aggMatch[1].toLowerCase()
    const inner = aggMatch[2].trim()

    if (AGG_FUNCS.has(funcUpper) && /^[a-zA-Z_]\w*$/.test(inner)) {
      return { type: "agg", func: funcUpper, field: inner }
    }

    const args = splitArgs(inner)
    if (DIVIDE_FUNCS.has(funcLower) && args.length === 2) {
      return {
        type: "call", func: "divide",
        args: args.map((a) => parseExpression(a, keyMap, schemaFields, errors)),
      }
    }

    return {
      type: "call", func: funcLower,
      args: args.map((a) => parseExpression(a, keyMap, schemaFields, errors)),
    }
  }

  if (/^[a-zA-Z_]\w*$/.test(trimmed)) {
    if (schemaFields && schemaFields.includes(trimmed)) {
      return { type: "field", name: trimmed }
    }
    errors.push(`无法识别的 token: ${trimmed}`)
    return { type: "literal", value: 0, dataType: "Int64" }
  }

  if (/\[\[/.test(trimmed)) {
    return parseBinaryExpression(trimmed, keyMap, schemaFields, errors)
  }

  return parseBinaryExpression(trimmed, keyMap, schemaFields, errors)
}

function parseBinaryExpression(
  expr: string,
  keyMap: Record<string, string>,
  schemaFields: string[] | undefined,
  errors: string[]
): ExpressionNode {
  const trimmed = expr.trim()

  const parenStripped = stripOuterParens(trimmed)
  if (parenStripped !== trimmed) {
    return parseExpression(parenStripped, keyMap, schemaFields, errors)
  }

  const opInfo = findLowestOp(trimmed)
  if (opInfo) {
    const left = parseExpression(trimmed.slice(0, opInfo.idx).trim(), keyMap, schemaFields, errors)
    const right = parseExpression(trimmed.slice(opInfo.idx + 1).trim(), keyMap, schemaFields, errors)
    return { type: "call", func: opInfo.func, args: [left, right] }
  }

  errors.push(`无法解析表达式: ${trimmed}`)
  return { type: "literal", value: 0, dataType: "Int64" }
}

function stripOuterParens(expr: string): string {
  if (!expr.startsWith("(") || !expr.endsWith(")")) return expr
  let depth = 0
  for (let i = 0; i < expr.length - 1; i++) {
    if (expr[i] === "(") depth++
    else if (expr[i] === ")") depth--
    if (depth < 1) return expr
  }
  return expr.slice(1, -1).trim()
}

function findLowestOp(expr: string): { idx: number; func: string } | null {
  let lowest = -1
  let lowestIdx = -1
  let depth = 0
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === "(") depth++
    else if (expr[i] === ")") depth--
    else if (depth === 0 && i > 0) {
      if (expr[i] === "+" || expr[i] === "-" || expr[i] === "*" || expr[i] === "/") {
        const prec = expr[i] === "+" || expr[i] === "-" ? 1 : 2
        if (prec > lowest) { lowest = prec; lowestIdx = i }
      }
    }
  }
  if (lowestIdx < 0) return null
  return {
    idx: lowestIdx,
    func: expr[lowestIdx] === "-" ? "minus" : expr[lowestIdx] === "+" ? "plus" : expr[lowestIdx] === "*" ? "multiply" : "divide",
  }
}

function splitArgs(s: string): string[] {
  const args: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++
    else if (s[i] === ")") depth--
    else if (s[i] === "," && depth === 0) {
      args.push(s.slice(start, i).trim())
      start = i + 1
    }
  }
  args.push(s.slice(start).trim())
  return args.filter(Boolean)
}
