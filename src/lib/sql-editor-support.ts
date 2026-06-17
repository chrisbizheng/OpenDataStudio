import { SQLDialect } from "@codemirror/lang-sql"
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete"
import { keywordCompletionSource } from "@codemirror/lang-sql"

const ClickHouse = SQLDialect.define({
  identifierQuotes: "`",

  keywords:
    "select from where join inner left right full cross on using group by order by limit offset " +
    "insert into values update delete truncate create table drop table alter table rename table " +
    "as with distinct union all any distinct if exists not exists primary key engine database " +
    "and or not in between like ilike global array join asof left array join " +
    "prewhere having top with totals format settings " +
    "function view materialized database temporary partition by sample " +
    "kill query optimize ttl system show describe exists use " +
    "true false null nullable " +
    "case when then else end cast add subtract multiply divide modulo " +
    "to final",

  types:
    "int8 int16 int32 int64 uint8 uint16 uint32 uint64 float32 float64 decimal " +
    "string fixed_string uuid date date32 datetime datetime64 enum enum8 enum16 " +
    "array tuple nested map ipv4 ipv6 simpleaggregatefunction aggregatefunction " +
    "nullable lowcardinality point multipolygon ring polygon",

  builtin:
    "count sum avg min max argmax argmin grouparray arraymap arrayfilter length " +
    "now today yesterday todate tostring toint64 ifnull coalesce " +
    "database table _table _partition_id _part_name _sample_factor " +
    "jsonextract jsonextractstring jsonextractint jsonextractuint jsonextractfloat " +
    "jsonhas jsonlength jsonkeys jsonallpaths " +
    "arrayjoin groupuniqarray uniq uniqexact uniqcombined topk quantile quantiles " +
    "variance stddevpop covarpop correlation any last anylast " +
    "grouparrayinsertat grouparraymovingsum grouparraymovingavg " +
    "summap sumwithoverflow minmap maxmap " +
    "flatten arrayconcat arraysort arrayreversesort arrayexists arrayall arraycompact " +
    "arraydifference arraydistinct arrayenumerate arrayintersect arraymap arrayfilter " +
    "arrayfill arrayreversefill arraysplit arraystringconcat " +
    "formatreadablesize formatreadablequantity formatreadabletimedelta " +
    "tostartofday tostartofhour tostartofmonth tostartofquarter tostartofyear " +
    "tomonday torelativedaynum torelativeweeknum torelativemonthnum torelativeyearnum " +
    "datediff datetrunc dateadd datesub " +
    "visitparamhas visitparamextractuint visitparamextractint visitparamextractfloat visitparamextractstring visitparamextractraw",

  operatorChars: "*+-/%!=&|~^<>?",
  caseInsensitiveIdentifiers: true,
})

type Tok =
  | { type: "word"; value: string }
  | { type: "dot" }
  | { type: "comma" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "space" }
  | { type: "other"; ch: string }

function tokenize(sql: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue }
    if (c === "`") {
      let v = ""; i++
      while (i < sql.length && sql[i] !== "`") v += sql[i++]
      i++
      out.push({ type: "word", value: v })
      continue
    }
    if (c === ".") { out.push({ type: "dot" }); i++; continue }
    if (c === ",") { out.push({ type: "comma" }); i++; continue }
    if (c === "(") { out.push({ type: "lparen" }); i++; continue }
    if (c === ")") { out.push({ type: "rparen" }); i++; continue }
    if (/[a-zA-Z_$\u0080-\ufffe]/.test(c)) {
      let v = ""
      while (i < sql.length && /[a-zA-Z0-9_$\u0080-\ufffe]/.test(sql[i])) v += sql[i++]
      out.push({ type: "word", value: v })
      continue
    }
    out.push({ type: "other", ch: c }); i++
  }
  return out
}

interface TableEntry {
  raw: string
  db?: string
  table: string
  alias?: string
}

function scanFromJoinAliases(sql: string): Map<string, TableEntry> {
  const map = new Map<string, TableEntry>()
  const tokens = tokenize(sql)

  const acceptTable = (fullRaw: string, aliasCandidate?: string) => {
    const parts = fullRaw.split(".")
    const entry: TableEntry = {
      raw: fullRaw,
      table: parts.length > 1 ? parts[parts.length - 1] : parts[0],
      db: parts.length > 1 ? parts[0] : undefined,
      alias: aliasCandidate,
    }
    const key = aliasCandidate ?? entry.table
    map.set(key, entry)
    if (aliasCandidate) map.set(entry.table, entry)
  }

  let inFrom = false
  let inJoin = false

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const w = t.type === "word" ? t.value.toUpperCase() : null

    if (w === "FROM") { inFrom = true; inJoin = false; continue }
    if (w === "JOIN" || w === "ARRAY") { inJoin = true; continue }
    if (w === "INNER" || w === "LEFT" || w === "RIGHT" || w === "CROSS" || w === "FULL") continue
    if (w === "ON" || w === "WHERE" || w === "SETTINGS" || w === "FORMAT" ||
        w === "ORDER" || w === "GROUP" || w === "LIMIT" || w === "HAVING" ||
        w === "PREWHERE" || w === "INTO" || w === "UNION") { inFrom = false; inJoin = false; continue }

    if ((inFrom || inJoin) && t.type === "word") {
      const raw = t.value
      let alias: string | undefined
      const remaining = tokens.slice(i + 1)
      if (remaining[0]?.type === "word" && remaining[0].value.toUpperCase() === "AS" && remaining[1]?.type === "word") {
        alias = remaining[1].value
        i += 2
      } else if (remaining[0]?.type === "word" && remaining[1]?.type !== "dot" && remaining[1]?.type !== "lparen") {
        alias = remaining[0].value
        i += 1
      }
      acceptTable(raw, alias)
      inFrom = inJoin
    }
  }
  return map
}

interface ColumnInfo {
  name: string
  type: string
  comment?: string
}

interface TableNames {
  current: string[]
  all: { db: string; table: string }[]
}

interface SchemaCache {
  columnsFor(db: string | undefined, table: string): ColumnInfo[]
  tablesForDb(db: string): string[]
  databases: string[]
  tableNames: TableNames
}

export function createChCompletionSource(cache: SchemaCache) {
  return function chCompletion(ctx: CompletionContext): CompletionResult | null | Promise<CompletionResult | null> {
    const pos = ctx.pos
    const fullText = ctx.state.sliceDoc(0, pos)

    const wordMatch = ctx.matchBefore(/[\w`.]+$/)
    const prefix = wordMatch?.text ?? ""
    const from = wordMatch?.from ?? pos

    const dotMatch = fullText.match(/([\w`]+)\.\s*$/)
    if (dotMatch) {
      const aliasOrTable = dotMatch[1].replace(/`/g, "")
      const aliases = scanFromJoinAliases(ctx.state.sliceDoc(0))
      const entry = aliases.get(aliasOrTable)
      const cols = entry ? cache.columnsFor(entry.db, entry.table) : []

      if (cols.length > 0) {
        return {
          from,
          options: cols.map(c => ({
            label: c.name,
            type: "property",
            detail: c.type,
            info: c.comment ?? c.type,
          })),
          filter: false,
        }
      }

      return {
        from,
        options: cache.tableNames.current.map(t => ({ label: t, type: "type" })),
        filter: false,
      }
    }

    const fromMatch = fullText.match(/(FROM|JOIN)\s+([\w`.]*)$/i)
    if (fromMatch) {
      const dbPrefixMatch = fullText.match(/(FROM|JOIN)\s+([\w`]+)\.\s*$/i)
      if (dbPrefixMatch) {
        const dbName = dbPrefixMatch[2].replace(/`/g, "")
        const tables = cache.tablesForDb ? cache.tablesForDb(dbName) : []
        return {
          from,
          options: tables.map(t => ({ label: t, type: "type" })),
          filter: false,
        }
      }
      return {
        from,
        options: cache.tableNames.current.map(t => ({ label: t, type: "type" })),
        filter: false,
      }
    }

    return keywordCompletionSource(ClickHouse, true)(ctx)
  }
}

export type FuncCategory = 'logic' | 'arithmetic' | 'string' | 'date' | 'array'

export interface FuncSignature {
  name: string
  category: FuncCategory
  requiredParams: string[]
  variadicParam?: string
}

export const CH_FUNCTIONS: FuncSignature[] = [
  { name: "if", category: "logic", requiredParams: ["条件", "真值", "假值"] },
  { name: "multiIf", category: "logic", requiredParams: ["条件1", "值1"], variadicParam: "条件/值对+默认值" },
  { name: "and", category: "logic", requiredParams: ["左", "右"], variadicParam: "条件" },
  { name: "or", category: "logic", requiredParams: ["左", "右"], variadicParam: "条件" },
  { name: "not", category: "logic", requiredParams: ["值"] },
  { name: "equals", category: "logic", requiredParams: ["左", "右"] },
  { name: "notEquals", category: "logic", requiredParams: ["左", "右"] },
  { name: "greater", category: "logic", requiredParams: ["左", "右"] },
  { name: "greaterOrEquals", category: "logic", requiredParams: ["左", "右"] },
  { name: "less", category: "logic", requiredParams: ["左", "右"] },
  { name: "lessOrEquals", category: "logic", requiredParams: ["左", "右"] },

  { name: "round", category: "arithmetic", requiredParams: ["值", "小数位"] },
  { name: "abs", category: "arithmetic", requiredParams: ["值"] },
  { name: "ceil", category: "arithmetic", requiredParams: ["值"] },
  { name: "floor", category: "arithmetic", requiredParams: ["值"] },
  { name: "intDiv", category: "arithmetic", requiredParams: ["被除数", "除数"] },
  { name: "modulo", category: "arithmetic", requiredParams: ["被除数", "除数"] },
  { name: "plus", category: "arithmetic", requiredParams: ["左", "右"] },
  { name: "minus", category: "arithmetic", requiredParams: ["左", "右"] },
  { name: "multiply", category: "arithmetic", requiredParams: ["左", "右"] },
  { name: "divide", category: "arithmetic", requiredParams: ["被除数", "除数"] },
  { name: "coalesce", category: "arithmetic", requiredParams: ["值1", "值2"], variadicParam: "备选值" },
  { name: "nullIf", category: "arithmetic", requiredParams: ["左", "右"] },

  { name: "concat", category: "string", requiredParams: ["值1", "值2"], variadicParam: "值" },
  { name: "substring", category: "string", requiredParams: ["字符串", "起始位", "长度"] },
  { name: "toString", category: "string", requiredParams: ["值"] },
  { name: "lower", category: "string", requiredParams: ["值"] },
  { name: "upper", category: "string", requiredParams: ["值"] },
  { name: "length", category: "string", requiredParams: ["字符串"] },

  { name: "toDate", category: "date", requiredParams: ["值"] },
  { name: "toDateTime", category: "date", requiredParams: ["值"] },
  { name: "formatDateTime", category: "date", requiredParams: ["时间", "格式"] },
  { name: "toYear", category: "date", requiredParams: ["日期"] },
  { name: "toMonth", category: "date", requiredParams: ["日期"] },

  { name: "arrayJoin", category: "array", requiredParams: ["数组"] },
  { name: "has", category: "array", requiredParams: ["数组", "元素"] },
]

export const AGG_FUNCTIONS = ["SUM", "AVG", "COUNT", "MIN", "MAX", "COUNT_DISTINCT"] as const
export type AggFunc = typeof AGG_FUNCTIONS[number]

const FUNC_MAP = new Map(CH_FUNCTIONS.map((f) => [f.name, f]))

export const CATEGORY_LABELS: Record<FuncCategory, string> = {
  logic: "逻辑",
  arithmetic: "算术",
  string: "字符串",
  date: "日期",
  array: "数组",
}

export { ClickHouse as ClickHouseDialect }
