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

export const FUNC_MAP = new Map(CH_FUNCTIONS.map((f) => [f.name, f]))

export const CATEGORY_LABELS: Record<FuncCategory, string> = {
  logic: "逻辑",
  arithmetic: "算术",
  string: "字符串",
  date: "日期",
  array: "数组",
}
